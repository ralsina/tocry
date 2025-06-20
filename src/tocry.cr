require "file_utils" # For File.dirname, File.basename
require "kemal"
require "json"       # For JSON serialization
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