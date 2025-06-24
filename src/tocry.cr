require "file_utils" # For File.dirname, File.basename
require "kemal"
require "json"   # For JSON serialization
require "ecr"    # For ECR templating
require "./lane" # Include the Lane class from its new file
require "./board_manager"

module ToCry
  VERSION = {{ `shards version #{__DIR__}/../`.chomp.stringify }}

  Log = ::Log.for(self)

  # A class variable to store the configured data directory.
  # It's initialized with a default, but will be set by `main.cr` at startup.
  @@data_directory : String = "data"

  # Getter for the globally configured data directory.
  def self.data_directory
    @@data_directory
  end

  # Lazily initialized singleton instance of BoardManager to manage board operations.
  # This ensures @@data_directory is set before BoardManager is used.
  @@board_manager : BoardManager? = nil

  def self.board_manager
    @@board_manager ||= begin
      Log.info { "Initializing BoardManager with data directory: #{@@data_directory}" }
      BoardManager.new
    end
  end

  # Setter for the globally configured data directory.
  # This method should be called once at application startup.
  def self.data_directory=(path : String)
    @@data_directory = path
  end

  class Board
    include JSON::Serializable

    property board_data_dir : String

    def initialize(@lanes : Array(Lane) = [] of Lane, @board_data_dir : String = "data/default")
    end

    # Renames the board by updating its directory on the filesystem.
    def rename(new_name : String)
      # Validate new board name to prevent path traversal and hidden directories.
      if new_name.includes?('/') || new_name.includes?('\\')
        raise "Invalid board name. It cannot contain path separators."
      end

      if new_name.starts_with?('.')
        raise "Invalid board name. It cannot start with a dot."
      end

      old_dir = @board_data_dir
      new_dir = File.join(File.dirname(old_dir), new_name)
      ToCry::BoardManager.validate_path_within_data_dir(new_dir)

      # Check if a directory with the new name already exists
      if File.exists?(new_dir)
        raise "Board with name '#{new_name}' already exists."
      end

      FileUtils.mv(old_dir, new_dir)
      @board_data_dir = new_dir # Update the instance variable after successful rename
      Log.info { "Board directory renamed from '#{old_dir}' to '#{@board_data_dir}'." }
    end

    # Loads the board state from the file system.
    # Scans the 'data' directory for lane directories (NNNN_name pattern)
    # and creates Lane objects.
    def load
      unless File.directory?(@board_data_dir)
        Log.info { "Data directory '#{@board_data_dir}' not found. Starting with an empty board." }
        return
      end

      lane_dirs = Dir.glob(File.join(@board_data_dir, "[0-9][0-9][0-9][0-9]_*/")).sort.map(&.strip("/"))

      @lanes.clear # Clear any default or existing lanes before loading

      lane_dirs.each_with_index do |dir_path, index|
        dir_basename = File.basename(dir_path)

        parts = dir_basename.split('_', 2)
        unless parts.size == 2 && parts[0].size == 4 && parts[0].to_i?
          Log.warn { "Skipping directory '#{dir_basename}' as it does not match the NNNN_name pattern." }
          next
        end

        lane_name_from_dir = parts[1]
        correct_prefix = (index + 1).to_s.rjust(4, '0')
        canonical_basename = "#{correct_prefix}_#{lane_name_from_dir}"
        canonical_path = File.join(@board_data_dir, canonical_basename)

        if dir_basename != canonical_basename
          Log.warn { "Normalizing lane directory: renaming '#{dir_path}' to '#{canonical_path}'." }
          FileUtils.mv(dir_path, canonical_path)
        end

        begin
          loaded_lane = Lane.load(canonical_path, @board_data_dir)
          @lanes << loaded_lane
          Log.info { "Loaded lane '#{loaded_lane.name}' with #{loaded_lane.notes.size} notes from '#{canonical_path}'" }
        rescue ex
          Log.error(exception: ex) { "Skipping lane: Failed to load from directory '#{canonical_path}'" }
        end
      end
    rescue ex
      Log.error(exception: ex) { "Error loading board from file system" }
      # Decide whether to re-raise or continue with a potentially empty/partial board
      raise ex # Re-raise for now to indicate a critical loading failure
    end

    property lanes : Array(Lane) = [] of Lane

    def save
      # Ensure the base data directory exists
      FileUtils.mkdir_p(@board_data_dir)
      Log.info { "Base data directory '#{@board_data_dir}' ensured." }

      Log.info { "Saving board with #{lanes.size} lanes." }

      # Save each lane
      @lanes.each_with_index do |lane, index|
        lane.save(index + 1, @board_data_dir) # Position is 1-based
      end
      Log.info { "All lanes in the board have been processed for saving." }

      # Remove directories not matching the current lanes
      all_lane_dirs = Dir.glob(File.join(@board_data_dir, "[0-9][0-9][0-9][0-9]_*/")).map(&.strip("/")).to_set
      saved_lane_names = @lanes.map_with_index(offset: 1) { |lane, index|
        File.join(@board_data_dir, "#{index.to_s.rjust(4, '0')}_#{lane.name}")
      }.to_set

      (all_lane_dirs - saved_lane_names).each do |dir_path|
        dir_name = File.basename(dir_path)
        Log.warn { "Orphaned lane directory found: '#{dir_name}' (path: #{dir_path}). It will be removed." }
        FileUtils.rm_rf(dir_path) # Remove directory and contents
      end
    rescue ex
      Log.error(exception: ex) { "Error saving board" }
      raise ex # Re-raise the exception after logging
    end

    def lane_add(name : String) : Lane
      new_lane = Lane.new(name)
      self.lanes << new_lane
      Log.info { "Lane '#{name}' added to the board." }
      new_lane
    end

    # Finds a lane by its name.
    # Returns the Lane object if found, or `nil` otherwise.
    def lane(name : String) : Lane?
      @lanes.find { |lane| lane.name == name }
    end

    # Finds a note by its ID across all lanes.
    # Returns a tuple containing the Note and its parent Lane if found, or `nil` otherwise.
    def note(id : String) : Tuple(Note, Lane)?
      @lanes.each do |lane|
        found_note = lane.notes.find { |note| note.id == id }
        return {found_note, lane} if found_note
      end
      nil
    end

    # Removes a lane from the board by its name.
    # Returns true if the lane was found and removed, false otherwise.
    def lane_del(name : String) : Bool
      # Find the index of the lane by name
      lane_to_delete = @lanes.find { |lane| lane.name == name }

      if lane_to_delete
        # Remove the lane from the array
        @lanes.delete(lane_to_delete)
        Log.info { "Lane '#{lane_to_delete.name}' removed from the board." }
        # Save the board to persist the change (this will renumber directories)
        save
      end
      true # Indicate success


    rescue ex
      Log.error(exception: ex) { "Error deleting lane with name '#{name}'" }
      raise ex # Re-raise the exception after logging
    end
  end

  # Helper function to validate a string as a safe filename component.
  # Rejects empty strings, '.', '..', strings containing path separators, or strings starting with '.'.
  def self.validate_filename_component(name : String)
    if name.empty?
      raise "Name cannot be empty."
    end
    if name == "." || name == ".." || name.includes?('/') || name.includes?('\\') || name.starts_with?('.')
      raise "Invalid name: It cannot be '.' or '..', contain path separators, or start with a dot."
    end
  end
end
