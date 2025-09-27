require "file_utils"
require "uuid"

module ToCry
  # Validates that a given path is inside the configured data directory.
  # This is a security measure to prevent path traversal attacks.
  def self.validate_path_within_data_dir(path : String)
    # File.expand_path makes the path absolute and normalizes it (resolving '..').
    normalized_data_dir = File.expand_path(ToCry.data_directory)
    normalized_path = File.expand_path(path)

    unless normalized_path.starts_with?(normalized_data_dir)
      raise "Operation on path '#{path}' is outside of the allowed data directory."
    end
  end

  # The BoardManager is responsible for discovering, loading, and managing
  # multiple Board instances. It uses Sepia-based BoardIndex and BoardReference
  # classes for efficient board discovery and user access management, replacing
  # the previous filesystem scanning and symlink-based approach.
  #
  # This class now uses Sepia for board indexing and user-board relationships,
  # providing better performance, reliability, and extensibility.
  #
  class BoardManager
    Log = ::Log.for(self)
    # In-memory cache for loaded boards (board_uuid => Board instance)
    @boards = {} of String => Board
    property safe_mode_enabled : Bool

    def initialize(@safe_mode_enabled : Bool)
      # No need for filesystem scanning - Sepia handles persistence
      # Cache will be populated on-demand when boards are accessed
    end

    # Get a cached board or load it from Sepia storage
    private def get_board(board_uuid : String) : Board?
      # Check cache first
      if cached_board = @boards[board_uuid]?
        return cached_board
      end

      # Load from Sepia storage
      begin
        board = ToCry::Board.load(board_uuid)
        @boards[board_uuid] = board # Cache it
        board
      rescue
        nil
      end
    end

    # Lists all available boards for a given user.
    # Returns the board UUIDs that the user has references to.
    def list(user : String) : Array(String)
      ToCry::BoardReference.accessible_to_user(user).map(&.board_uuid)
    end

    # Get a board by name and user combination.
    # Names are user-specific, so this searches the user's personal board names.
    def get(name : String, user : String) : Board?
      # Get all board references for this user
      user_references = ToCry::BoardReference.accessible_to_user(user)

      # Find the reference with matching name
      reference = user_references.find { |ref| ref.board_name == name }
      return nil unless reference

      # Load and return the actual board
      get_board(reference.board_uuid)
    end

    # Creates a new board with the given name.
    # Uses Sepia-based BoardIndex and BoardReference for user-specific names.
    def create(name : String, user : String) : Board
      # Create the board using Sepia
      board = Board.new(name: name)
      board.save
      uuid = board.sepia_id

      # Add to board index with the canonical name
      board_index = ToCry::BoardIndex.new(uuid, name, user)
      board_index.save

      # Create owner reference for the user (user's personal name for this board)
      ToCry::BoardReference.create_reference(user, uuid, name, "owner", user)

      # Cache the board
      @boards[uuid] = board

      Log.info { "Board '#{name}' (#{uuid}) created and assigned to user '#{user}'" }
      board
    end

    # Deletes a board by its name for a given user.
    # Uses BoardReference-based access control instead of symlink management.
    def delete(name : String, user : String)
      # Find the board reference for this user
      user_references = ToCry::BoardReference.accessible_to_user(user)
      reference = user_references.find { |ref| ref.board_name == name }
      return unless reference

      board = get_board(reference.board_uuid)
      return unless board

      uuid = board.sepia_id

      if reference.owner?
        # Owner deletes the entire board and all references
        @boards.delete(uuid)           # Remove from cache
        ToCry::BoardIndex.remove(uuid) # Remove from board index

        # Remove all board references for this board
        ToCry::BoardReference.find_by_board(uuid).each(&.delete)

        board.delete # Delete the actual board data

        Log.info { "Board '#{name}' (#{uuid}) and all associated data deleted by owner '#{user}'" }
      else
        # Non-owner just removes their reference
        ToCry::BoardReference.remove_reference(user, uuid)
        Log.info { "Reference to board '#{name}' (#{uuid}) removed for user '#{user}'" }
      end
    end

    # Renames an existing board for a given user.
    # For regular users: Updates the user's personal name for the board.
    # For root user: Updates both the canonical board name and their reference.
    def rename(old_name : String, new_name : String, user : String) : Board
      # Check if new name already exists for this user
      if get(new_name, user)
        raise "Board with name '#{new_name}' already exists."
      end

      # Find the board reference to rename
      user_references = ToCry::BoardReference.accessible_to_user(user)
      reference = user_references.find { |ref| ref.board_name == old_name }
      raise "Board '#{old_name}' not found for renaming." unless reference

      # Load the board
      board = get_board(reference.board_uuid)
      raise "Board '#{old_name}' not found for renaming." unless board

      # Update the user's personal name for this board
      reference.update_name(new_name)

      # Special case: if the user is root and is the owner, also update the canonical board name
      if user == "root" && reference.owner?
        board.name = new_name
        board.save

        # Update the board index
        board_index = ToCry::BoardIndex.find_by_uuid(reference.board_uuid)
        if board_index
          board_index.update_name(new_name)
        end

        # Update cache
        @boards[reference.board_uuid] = board

        Log.info { "Root user renamed board canonically from '#{old_name}' to '#{new_name}' (#{reference.board_uuid})" }
      else
        Log.info { "User '#{user}' renamed their reference to board (#{reference.board_uuid}) from '#{old_name}' to '#{new_name}'" }
      end

      board
    end

    # Shares a board from one user to another.
    # Creates a new BoardReference with the target user's preferred name.
    def share_board(board_name : String, from_user : String, to_user : String)
      # Find the board reference for the `from_user`.
      from_user_references = ToCry::BoardReference.accessible_to_user(from_user)
      reference = from_user_references.find { |ref| ref.board_name == board_name }
      raise "Board '#{board_name}' not found for user '#{from_user}'." unless reference

      uuid = reference.board_uuid

      # Check if the `to_user` already has a reference to this board.
      if ToCry::BoardReference.has_reference?(to_user, uuid)
        Log.info { "Board (#{uuid}) is already accessible to user '#{to_user}'." }
        return
      end

      # Create shared reference for the target user (they can choose their own name)
      # For now, use the same name as the sharing user, but they can rename it later
      ToCry::BoardReference.create_reference(to_user, uuid, board_name, "shared", from_user)

      Log.info { "Shared board '#{board_name}' (#{uuid}) from user '#{from_user}' to user '#{to_user}'" }
    end
  end
end
