# /home/ralsina/code/tocry/src/board.cr
require "file_utils"
require "json"
require "sepia"  # For Sepia::Container
require "./lane" # For ToCry::Lane
require "./note" # For ToCry::Note

module ToCry
  class Board < Sepia::Object
    include JSON::Serializable
    include Sepia::Container

    property name : String
    property lanes : Array(Lane)
    property color_scheme : String?
    property? public : Bool = false

    # Constructor that accepts a name, which will be used as sepia_id.
    def initialize(@name : String, @lanes : Array(Lane) = [] of Lane, @color_scheme : String? = nil, @public : Bool = false)
    end

    # Default constructor for deserialization (Sepia needs this)
    def initialize(@lanes : Array(Lane) = [] of Lane, @color_scheme : String? = nil)
      @name = "Untitled Board" # Default name if not provided
      @public = false          # Default to private
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
      lane_to_delete = @lanes.find { |lane| lane.name == name }

      if lane_to_delete
        @lanes.delete(lane_to_delete)
        ToCry::Log.info { "Lane '#{lane_to_delete.name}' removed from the board." }
        return true
      end
      false
    rescue ex
      ToCry::Log.error(exception: ex) { "Error deleting lane with name '#{name}'" }
      raise ex # Re-raise the exception after logging
    end
  end
end
