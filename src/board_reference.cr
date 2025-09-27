require "uuid"
require "sepia"
require "json"

module ToCry
  # BoardReference class with Sepia persistence for user-specific board references.
  # This allows users to have their own names for boards while sharing the same underlying Board.
  class BoardReference < Sepia::Object
    include JSON::Serializable
    include Sepia::Container

    property user_id : String
    property board_uuid : String
    property board_name : String  # User's personal name for this board
    property access_type : String # "owner", "shared"
    property created_at : Time
    property granted_by : String # user who granted access (for sharing)

    # Constructor for new board references (generates composite sepia_id)
    def initialize(@user_id : String, @board_uuid : String, @board_name : String, @access_type : String = "owner", @granted_by : String = "")
      @created_at = Time.utc
      @granted_by = @user_id if @granted_by.empty? # Default to self for owner
    end

    # Default constructor for deserialization (Sepia needs this)
    def initialize(@user_id : String = "", @board_uuid : String = "", @board_name : String = "",
                   @access_type : String = "owner", @created_at : Time = Time.utc, @granted_by : String = "")
    end

    # Override sepia_id to use composite user+board key
    def sepia_id : String
      "#{@user_id}:#{@board_uuid}"
    end

    # Override sepia_id setter (parse composite key)
    def sepia_id=(value : String)
      parts = value.split(":", 2)
      if parts.size == 2
        @user_id = parts[0]
        @board_uuid = parts[1]
      end
    end

    # Check if this is an owner reference
    def owner? : Bool
      @access_type == "owner"
    end

    # Check if this is a shared reference
    def shared? : Bool
      @access_type == "shared"
    end

    # Update the user's personal name for this board
    def update_name(new_name : String)
      @board_name = new_name
      save
    end

    # Find all board references for a specific user
    def self.find_by_user(user_id : String) : Array(BoardReference)
      results = [] of BoardReference

      begin
        # Use Sepia's storage API instead of filesystem operations
        ids = Sepia::Storage.list_all(BoardReference)
        Log.debug { "BoardReference.find_by_user(#{user_id}): Found #{ids.size} total references: #{ids}" }

        ids.each do |entry_id|
          # Check if this entry belongs to the user (format: user_id:board_uuid)
          if entry_id.starts_with?("#{user_id}:")
            begin
              reference = BoardReference.load(entry_id)
              Log.debug { "Found reference for user #{user_id}: #{reference.board_name} (#{reference.board_uuid})" }
              results << reference
            rescue ex
              # Skip entries that can't be loaded
              Log.warn { "Failed to load BoardReference #{entry_id}: #{ex.message}" }
              next
            end
          end
        end
      rescue ex
        # If there's any error with storage operations, return empty array
        Log.warn { "Error in BoardReference.find_by_user(#{user_id}): #{ex.message}" }
      end

      Log.debug { "BoardReference.find_by_user(#{user_id}) returning #{results.size} results" }
      results
    end # Find all references to a specific board
    def self.find_by_board(board_uuid : String) : Array(BoardReference)
      results = [] of BoardReference

      begin
        # Use Sepia's storage API instead of filesystem operations
        ids = Sepia::Storage.list_all(BoardReference)
        ids.each do |entry_id|
          # Check if this entry is for the board (format: user_id:board_uuid)
          if entry_id.ends_with?(":#{board_uuid}")
            begin
              reference = BoardReference.load(entry_id)
              results << reference
            rescue
              # Skip entries that can't be loaded
              next
            end
          end
        end
      rescue
        # If there's any error with storage operations, return empty array
      end

      results
    end # Check if a user has a reference to a board
    def self.has_reference?(user_id : String, board_uuid : String) : Bool
      ref = BoardReference.load("#{user_id}:#{board_uuid}")
      Log.debug { "has_reference?(#{user_id}, #{board_uuid}) found existing: '#{ref.board_name}'" }
      true
    rescue ex
      Log.debug { "has_reference?(#{user_id}, #{board_uuid}) not found: #{ex.message}" }
      false
    end

    # Create a board reference for a user
    def self.create_reference(user_id : String, board_uuid : String, board_name : String, access_type : String = "owner", granted_by : String = "")
      # Check if reference already exists
      if has_reference?(user_id, board_uuid)
        return BoardReference.load("#{user_id}:#{board_uuid}")
      end

      reference = BoardReference.new(user_id, board_uuid, board_name, access_type, granted_by)
      reference.save
      Log.debug { "Created BoardReference: #{user_id}:#{board_uuid} -> '#{board_name}'" }
      reference
    end

    # Remove a board reference for a user
    def self.remove_reference(user_id : String, board_uuid : String) : Bool
      reference = BoardReference.load("#{user_id}:#{board_uuid}")
      reference.delete
      true
    rescue
      false
    end

    # Find the owner reference for a board
    def self.find_owner_reference(board_uuid : String) : BoardReference?
      find_by_board(board_uuid).find(&.owner?)
    end

    # Get all boards owned by a user (returns references)
    def self.owned_by_user(user_id : String) : Array(BoardReference)
      find_by_user(user_id).select(&.owner?)
    end

    # Get all board references accessible to a user (owned + shared)
    def self.accessible_to_user(user_id : String) : Array(BoardReference)
      find_by_user(user_id)
    end

    # Get user's personal name for a board
    def self.user_name_for_board(user_id : String, board_uuid : String) : String?
      reference = BoardReference.load("#{user_id}:#{board_uuid}")
      reference.board_name
    rescue
      nil
    end
  end
end
