require "file_utils" # For File.dirname, File.basename
require "kemal"
require "json"   # For JSON serialization
require "./lane" # Include the Lane class from its new file

module ToCry
  Log = ::Log.for(self)

  VERSION = {{ `shards version #{__DIR__}/../`.chomp.stringify }}

  # The global singleton instance of the Board.
  # This instance holds the current state of the application's board in memory.
  # Persistence (loading/saving) is handled by the Board#save method.
  BOARD = Board.new

  class Board
    include JSON::Serializable

    def initialize(@lanes : Array(Lane) = [] of Lane)
    end

    # Loads the board state from the file system.
    # Scans the 'data' directory for lane directories (NNNN_name pattern)
    # and creates Lane objects.
    # Note: This currently creates empty lanes. Loading notes requires
    # implementing Lane#load_notes and Note.load.
    def load
      base_data_dir = "data"
      unless File.directory?(base_data_dir)
        Log.info { "Data directory '#{base_data_dir}' not found. Starting with an empty board." }
        return
      end

      lane_dirs = Dir.glob(File.join(base_data_dir, "[0-9][0-9][0-9][0-9]_*/")).sort.map(&.strip("/"))

      @lanes.clear # Clear any default or existing lanes before loading

      lane_dirs.each_with_index do |current_dir_path_from_glob, index|
        # If we have holes or repeated numeric prefixes, we normalize them
        # by renaming directories to match their sorted order.
        # Example: If we have "data/0001_Todo/" and "data/0003_Other/", we rename
        # "data/0003_Other/" to "data/0002_Other/" to maintain a consistent order.

        title = current_dir_path_from_glob.split("_", 2)[1] # Get the part after the first underscore
        canonical_path = File.join(base_data_dir, "#{index.to_s.rjust(4, '0')}_#{title}")

        if current_dir_path_from_glob != canonical_path
          Log.warn { "Directory '#{current_dir_path_from_glob}' does not match expected canonical path '#{canonical_path}'. Renaming." }
          FileUtils.mv(current_dir_path_from_glob, canonical_path)
        end

        new_lane = Lane.new(name: title)
        @lanes << new_lane
        Log.info { "Loaded lane '#{title}' from directory '#{canonical_path}'" }
        # TODO: Implement new_lane.load_notes(final_dir_path) to load notes for this lane
      end
    rescue ex
      Log.error(exception: ex) { "Error loading board from file system" }
      # Decide whether to re-raise or continue with a potentially empty/partial board
      raise ex # Re-raise for now to indicate a critical loading failure
    end

    property lanes : Array(Lane) = [] of Lane

    def save
      # Ensure the base data directory exists
      base_data_dir = "data"
      FileUtils.mkdir_p(base_data_dir)
      Log.info { "Base data directory '#{base_data_dir}' ensured." }

      # Save each lane
      self.lanes.each_with_index do |lane, index|
        lane.save(index + 1) # Pass 1-based position
      end
      Log.info { "All lanes in the board have been processed for saving." }
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
  end
end
