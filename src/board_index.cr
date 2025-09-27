require "uuid"
require "sepia"
require "json"

module ToCry
  # BoardIndex class with Sepia persistence for tracking all boards in the system.
  # Replaces the manual filesystem scanning and in-memory cache approach.
  class BoardIndex < Sepia::Object
    include JSON::Serializable
    include Sepia::Container

    property board_uuid : String
    property board_name : String
    property owner : String
    property created_at : Time
    property updated_at : Time

    # Constructor for new board entries (uses board UUID as sepia_id)
    def initialize(@board_uuid : String, @board_name : String, @owner : String)
      @created_at = Time.utc
      @updated_at = Time.utc
    end

    # Default constructor for deserialization (Sepia needs this)
    def initialize(@board_uuid : String = "", @board_name : String = "", @owner : String = "",
                   @created_at : Time = Time.utc, @updated_at : Time = Time.utc)
    end

    # Override sepia_id to use board UUID
    def sepia_id : String
      @board_uuid
    end

    # Override sepia_id setter
    def sepia_id=(value : String)
      @board_uuid = value
    end

    # Update the board name and timestamp
    def update_name(new_name : String)
      @board_name = new_name
      @updated_at = Time.utc
      save
    end

  # Find all boards owned by a specific user
  def self.find_by_owner(owner : String) : Array(BoardIndex)
    results = [] of BoardIndex

    # Use Sepia's storage API instead of filesystem operations
    begin
      ids = Sepia::Storage.list_all(BoardIndex)
      ids.each do |entry_id|
        begin
          board_index = BoardIndex.load(entry_id)
          results << board_index if board_index.owner == owner
        rescue
          # Skip entries that can't be loaded
          next
        end
      end
    rescue
      # If there's any error with storage operations, return empty array
    end

    results
  end  # Find all boards (for administrative purposes)
  def self.all : Array(BoardIndex)
    results = [] of BoardIndex

    begin
      # Use Sepia's storage API instead of filesystem operations
      ids = Sepia::Storage.list_all(BoardIndex)
      ids.each do |entry_id|
        begin
          board_index = BoardIndex.load(entry_id)
          results << board_index
        rescue
          # Skip entries that can't be loaded
          next
        end
      end
    rescue
      # If there's any error with storage operations, return empty array
    end

    results
  end    # Check if a board exists by UUID
    def self.exists?(board_uuid : String) : Bool
      begin
        BoardIndex.load(board_uuid)
        true
      rescue
        false
      end
    end

    # Find a board index by UUID
    def self.find_by_uuid(board_uuid : String) : BoardIndex?
      begin
        BoardIndex.load(board_uuid)
      rescue
        nil
      end
    end

    # Remove a board from the index
    def self.remove(board_uuid : String) : Bool
      begin
        board_index = BoardIndex.load(board_uuid)
        board_index.delete
        true
      rescue
        false
      end
    end
  end
end
