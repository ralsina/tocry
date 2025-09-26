require "uuid"
require "sepia"
require "json"

module ToCry
  # UserBoardAccess class with Sepia persistence for tracking user access to boards.
  # Replaces the complex symlink management approach.
  class UserBoardAccess < Sepia::Object
    include JSON::Serializable
    include Sepia::Container

    property user_id : String
    property board_uuid : String
    property access_type : String  # "owner", "shared"
    property granted_at : Time
    property granted_by : String   # user who granted access (for sharing)

    # Constructor for new access entries (generates composite sepia_id)
    def initialize(@user_id : String, @board_uuid : String, @access_type : String = "owner", @granted_by : String = "")
      @granted_at = Time.utc
      @granted_by = @user_id if @granted_by.empty? # Default to self for owner
    end

    # Default constructor for deserialization (Sepia needs this)
    def initialize(@user_id : String = "", @board_uuid : String = "", @access_type : String = "owner",
                   @granted_at : Time = Time.utc, @granted_by : String = "")
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

    # Check if this is an owner access
    def owner? : Bool
      @access_type == "owner"
    end

    # Check if this is shared access
    def shared? : Bool
      @access_type == "shared"
    end

    # Find all boards accessible to a specific user
    def self.find_by_user(user_id : String) : Array(UserBoardAccess)
      results = [] of UserBoardAccess

      begin
        Dir.glob(File.join(Sepia::Storage::INSTANCE.path, "ToCry::UserBoardAccess", "*")).each do |entry_path|
          next unless File.directory?(entry_path)

          begin
            entry_id = File.basename(entry_path)
            # Check if this entry belongs to the user (format: user_id:board_uuid)
            if entry_id.starts_with?("#{user_id}:")
              access = UserBoardAccess.load(entry_id)
              results << access
            end
          rescue
            # Skip entries that can't be loaded
            next
          end
        end
      rescue
        # If directory doesn't exist or other error, return empty array
      end

      results
    end

    # Find all users with access to a specific board
    def self.find_by_board(board_uuid : String) : Array(UserBoardAccess)
      results = [] of UserBoardAccess

      begin
        Dir.glob(File.join(Sepia::Storage::INSTANCE.path, "ToCry::UserBoardAccess", "*")).each do |entry_path|
          next unless File.directory?(entry_path)

          begin
            entry_id = File.basename(entry_path)
            # Check if this entry is for the board (format: user_id:board_uuid)
            if entry_id.ends_with?(":#{board_uuid}")
              access = UserBoardAccess.load(entry_id)
              results << access
            end
          rescue
            # Skip entries that can't be loaded
            next
          end
        end
      rescue
        # If directory doesn't exist or other error, return empty array
      end

      results
    end

    # Check if a user has access to a board
    def self.has_access?(user_id : String, board_uuid : String) : Bool
      begin
        UserBoardAccess.load("#{user_id}:#{board_uuid}")
        true
      rescue
        false
      end
    end

    # Grant access to a board for a user
    def self.grant_access(user_id : String, board_uuid : String, access_type : String = "shared", granted_by : String = "")
      # Check if access already exists
      return if has_access?(user_id, board_uuid)

      access = UserBoardAccess.new(user_id, board_uuid, access_type, granted_by)
      access.save
      access
    end

    # Revoke access to a board for a user
    def self.revoke_access(user_id : String, board_uuid : String) : Bool
      begin
        access = UserBoardAccess.load("#{user_id}:#{board_uuid}")
        access.delete
        true
      rescue
        false
      end
    end

    # Find the owner of a board
    def self.find_owner(board_uuid : String) : String?
      find_by_board(board_uuid).each do |access|
        return access.user_id if access.owner?
      end
      nil
    end

    # Get all boards owned by a user (returns just the UUIDs)
    def self.owned_boards(user_id : String) : Array(String)
      find_by_user(user_id).select(&.owner?).map(&.board_uuid)
    end

    # Get all boards accessible to a user (owned + shared, returns UUIDs)
    def self.accessible_boards(user_id : String) : Array(String)
      find_by_user(user_id).map(&.board_uuid)
    end
  end
end
