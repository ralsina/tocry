# /home/ralsina/code/tocry/src/board.cr
require "file_utils"
require "json"
require "./lane" # For ToCry::Lane
require "./note" # For ToCry::Note

module ToCry
  class Board
    include JSON::Serializable

    property board_data_dir : String
    @loaded = false # New instance variable to track if content is loaded

    def initialize(@lanes : Array(Lane) = [] of Lane, @board_data_dir : String = "data/default")
    end

    # Indicates if the board's content has been loaded from disk.
    def loaded?
      @loaded
    end

    # The board_data_dir is updated by BoardManager after the move.
    # No longer performs filesystem operations directly.
    def board_data_dir=(new_dir : String)
      @board_data_dir = new_dir
    end

    # Loads the board state from the file system.
    # Scans the 'data' directory for lane directories (NNNN_name pattern)
    # and creates Lane objects.
    def load
      unless File.directory?(@board_data_dir)
        ToCry::Log.info { "Data directory '#{@board_data_dir}' not found. Starting with an empty board." }
        @lanes.clear
        return
      end

      lane_dirs = Dir.glob(File.join(@board_data_dir, "[0-9][0-9][0-9][0-9]_*/")).sort.map(&.strip("/"))

      @lanes.clear # Clear any default or existing lanes before loading

      lane_dirs.each_with_index do |dir_path, index|
        dir_basename = File.basename(dir_path)

        parts = dir_basename.split('_', 2)
        unless parts.size == 2 && parts[0].size == 4 && parts[0].to_i?
          ToCry::Log.warn { "Skipping directory '#{dir_basename}' as it does not match the NNNN_name pattern." }
          next
        end

        lane_name_from_dir = parts[1]
        correct_prefix = (index + 1).to_s.rjust(4, '0')
        canonical_basename = "#{correct_prefix}_#{lane_name_from_dir}"
        canonical_path = File.join(@board_data_dir, canonical_basename)

        if dir_basename != canonical_basename
          ToCry::Log.warn { "Normalizing lane directory: renaming '#{dir_path}' to '#{canonical_path}'." }
          FileUtils.mv(dir_path, canonical_path)
        end

        begin
          loaded_lane = Lane.load(canonical_path, @board_data_dir)
          @lanes << loaded_lane
          ToCry::Log.info { "Loaded lane '#{loaded_lane.name}' with #{loaded_lane.notes.size} notes from '#{canonical_path}'" }
        rescue ex
          ToCry::Log.error(exception: ex) { "Skipping lane: Failed to load from directory '#{canonical_path}'" }
        end
      end
      @loaded = true
    rescue ex
      ToCry::Log.error(exception: ex) { "Error loading board from file system" }
      @loaded = false # Mark as not loaded on error
      raise ex # Re-raise for now to indicate a critical loading failure
    end

    property lanes : Array(Lane) = [] of Lane

    def save
      # Ensure the base data directory exists
      FileUtils.mkdir_p(@board_data_dir)
      ToCry::Log.info { "Base data directory '#{@board_data_dir}' ensured." }

      ToCry::Log.info { "Saving board with #{lanes.size} lanes." }

      # Save each lane
      @lanes.each_with_index do |lane, index|
        lane.save(index + 1, @board_data_dir) # Position is 1-based
      end
      ToCry::Log.info { "All lanes in the board have been processed for saving." }

      # Remove directories not matching the current lanes
      all_lane_dirs = Dir.glob(File.join(@board_data_dir, "[0-9][0-9][0-9][0-9]_*/")).map(&.strip("/")).to_set
      saved_lane_names = @lanes.map_with_index(offset: 1) { |lane, index|
        File.join(@board_data_dir, "#{index.to_s.rjust(4, '0')}_#{lane.name}")
      }.to_set

      (all_lane_dirs - saved_lane_names).each do |dir_path|
        dir_name = File.basename(dir_path)
        ToCry::Log.warn { "Orphaned lane directory found: '#{dir_name}' (path: #{dir_path}). It will be removed." }
        FileUtils.rm_rf(dir_path) # Remove directory and contents
      end
    rescue ex
      ToCry::Log.error(exception: ex) { "Error saving board" }
      raise ex # Re-raise the exception after logging
    end

    def lane_add(name : String) : Lane
      new_lane = Lane.new(name)
      self.lanes << new_lane
      ToCry::Log.info { "Lane '#{name}' added to the board." }
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
        ToCry::Log.info { "Lane '#{lane_to_delete.name}' removed from the board." }
        # Save the board to persist the change (this will renumber directories)
        save
      end
      true # Indicate success


    rescue ex
      ToCry::Log.error(exception: ex) { "Error deleting lane with name '#{name}'" }
      raise ex # Re-raise the exception after logging
    end
  end
end
