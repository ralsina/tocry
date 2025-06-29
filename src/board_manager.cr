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
  # multiple Board instances. It interacts with the filesystem to handle
  # the multi-board data structure, using the globally configured data directory.
  #
  # This class is NOT implemented using Sepia, because it manages the users
  # and boards at a higher level and persists in a complicated way with
  # an in-memory cache.
  #
  class BoardManager
    Log = ::Log.for(self)
    # Maps board uuid (the sepia_id) to its Board instance
    # { board_name => { uuid: "...", board: Board_instance } }
    @boards = {} of String => Board
    property board_base_dir : String = File.join(ToCry.data_directory, "boards")
    property safe_mode_enabled : Bool

    def initialize(@safe_mode_enabled : Bool)
      # Ensure the base data directory for boards exists
      FileUtils.mkdir_p(board_base_dir)

      # Populate the board cache by scanning the new structure
      scan_boards_directory
    end

    # Scans the boards directory and populates the in-memory cache.
    private def scan_boards_directory
      @boards.clear

      Dir.children(board_base_dir).each do |entry|
        # Expected format: {UUID}.{name}
        if match = entry.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(.+)$/)
          uuid = match[1]
          name = match[2]
          board_dir = File.join(board_base_dir, entry)

          if File.symlink?(board_dir)
            @boards[uuid] = Board.load(uuid, board_dir)
            @boards[uuid].name = name
          end
        else
          Log.warn { "Found invalid board directory name format: #{entry}" }
        end
      end
    end

    # Lists all available boards for a given user.
    # This filters the globally known boards by what's present in the user's specific board directory.
    def list(user : String) : Array(String)
      user_boards_path = File.join(ToCry.users_base_directory, user, "boards")

      unless File.exists?(user_boards_path)
        Log.info { "User board directory '#{user_boards_path}' does not exist for user '#{user}'. Returning empty list." }
        return [] of String
      end

      user_accessible_board_uuids = [] of String
      Dir.glob(File.join(user_boards_path, "*"), follow_symlinks: true).each do |entry|
        entry = File.basename(entry) # Get just the entry name, not the full path
        # Symlinks are in the format {UUID}.{name}
        if match = entry.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(.+)$/)
          user_accessible_board_uuids << match[1] if @boards.has_key?(match[1])
        else
          Log.warn { "Found invalid entry format in user board directory '#{user_boards_path}': #{entry}" }
        end
      end
      user_accessible_board_uuids
    end

    # Get a board by name and user combination.
    # names are unique per user, so this will return the first match.
    def get(name : String, user : String) : Board?
      # get the board by the combination of name and user
      list(user).each do |board_uuid|
        board = @boards[board_uuid]
        return board if board.name == name
      end
      nil
    end

    # Creates a new board with the given name.
    # Also creates a symlink for the user.
    def create(name : String, user : String) : Board
      board = Board.new(name: name)
      uuid = board.sepia_id
      board.save

      # New board directory will be {UUID}.{name}
      board_full_name = "#{uuid}.#{name}"
      board_path = File.join(board_base_dir, board_full_name)

      ToCry.validate_path_within_data_dir(board_path)
      source_path = Path[board.canonical_path].relative_to(Path[board_path].parent)

      FileUtils.ln_s(
        source_path,
        board_path,
      )
      @boards[uuid] = board

      if @safe_mode_enabled
        broken_links = ToCry.find_broken_symlinks
        unless broken_links.empty?
          raise "Operation blocked: Broken symlinks detected after creating canonical board. Please fix: #{broken_links.join(", ")}"
        end
      end

      Log.info { "Board '#{name}' created at '#{board_path}'." }

      return board if user == "root"

      # For non-root users, create a symlink in their user directory.
      # Construct the full path for the symlink: /data/users/{user}/boards/{UUID}.{name}
      user_board_symlink_path = File.join(
        ToCry.data_directory,
        "users",
        user,
        "boards",
        board_full_name
      )

      # Validate the user-specific path to prevent traversal attacks
      ToCry.validate_path_within_data_dir(user_board_symlink_path)
      FileUtils.mkdir_p(File.dirname(user_board_symlink_path)) # Ensure user's boards directory exists
      # Create a secondary symlink in the user's boards directory
      source_path = Path[board.canonical_path].relative_to(Path[user_board_symlink_path].parent)
      FileUtils.ln_s(source_path, user_board_symlink_path) # Create the symlink

      if @safe_mode_enabled
        broken_links = ToCry.find_broken_symlinks
        unless broken_links.empty?
          raise "Operation blocked: Broken symlinks detected after creating user symlink. Please fix: #{broken_links.join(", ")}"
        end
      end
      Log.info { "Symlink created for user '#{user}' from '#{board_path}' to '#{user_board_symlink_path}'." }

      board
    end

    # Deletes a board by its name for a given user.
    # If the user is 'root', the canonical board directory is deleted.
    # Otherwise, only the user's symlink to the board is removed.
    def delete(name : String, user : String)
      # Find the board for this user
      board = nil
      list(user).each do |user_board|
        # Check if the board is the one we want to delete
        if @boards[user_board].name == name
          # Found the board for this user
          board = @boards[user_board]
          break
        end
      end

      # If the board doesn't exist, do nothing
      return unless board

      uuid = board.sepia_id

      if user == "root"
        @boards.delete(uuid)                                       # remove from the cache
        FileUtils.rm(File.join(board_base_dir, "#{uuid}.#{name}")) # Remove from boards/uuid.name
        board.delete                                               # remove from disk totally

        if @safe_mode_enabled
          broken_links = ToCry.find_broken_symlinks
          unless broken_links.empty?
            raise "Operation blocked: Broken symlinks detected after deleting canonical board. Please fix: #{broken_links.join(", ")}"
          end
        end
        Log.info { "Board '#{name}' and its canonical directory '#{board.canonical_path}' deleted by root." }
      else
        # Non-root user deletes only their symlink because other
        # users might still have access to the board.
        user_board_symlink_path = File.join(ToCry.users_base_directory, user, "boards", "#{uuid}.#{name}")
        ToCry.validate_path_within_data_dir(user_board_symlink_path)
        if File.symlink?(user_board_symlink_path)
          FileUtils.rm(user_board_symlink_path)

          if @safe_mode_enabled
            broken_links = ToCry.find_broken_symlinks
            unless broken_links.empty?
              raise "Operation blocked: Broken symlinks detected after deleting user symlink. Please fix: #{broken_links.join(", ")}"
            end
          end
          Log.info { "Symlink for board '#{name}' at '#{user_board_symlink_path}' deleted by user '#{user}'." }
        else
          Log.warn { "User '#{user}' attempted to delete symlink for board '#{name}' at '#{user_board_symlink_path}', but it was not found or not a symlink." }
        end
      end
    end

    # Renames an existing board for a given user.
    # If the user is 'root', the canonical board directory is renamed.
    # Otherwise, only the user's symlink to the board is renamed.
    def rename(old_name : String, new_name : String, user : String) : Board
      if get(new_name, user)
        raise "Board with name '#{new_name}' already exists."
      end

      board = get(old_name, user)
      raise "Board '#{old_name}' not found for renaming." unless board

      # Verify user access to the board before proceeding
      unless get(old_name, user) # Use the user-aware get to check accessibility
        raise "Board '#{old_name}' not found or not accessible to user '#{user}' for renaming."
      end

      if user == "root"
        rename_canonical_board_directory(board, old_name, new_name)
      else
        rename_user_board_symlink(board, old_name, new_name, user)
      end
      board
    end

    private def rename_canonical_board_directory(board : Board, old_name : String, new_name : String)
      uuid = board.sepia_id
      old_board_dir_name = "#{uuid}.#{old_name}"
      new_board_dir_name = "#{uuid}.#{new_name}"

      old_board_dir_path = File.join(board_base_dir, old_board_dir_name)
      new_board_dir_path = File.join(board_base_dir, new_board_dir_name)

      ToCry.validate_path_within_data_dir(old_board_dir_path)
      ToCry.validate_path_within_data_dir(new_board_dir_path)

      FileUtils.mv(old_board_dir_path, new_board_dir_path)

      if @safe_mode_enabled
        broken_links = ToCry.find_broken_symlinks
        unless broken_links.empty?
          raise "Operation blocked: Broken symlinks detected after renaming canonical board directory. Please fix: #{broken_links.join(", ")}"
        end
      end

      board.name = new_name # Update the board object's name
      @boards[uuid] = board # Update the cache with the modified board object

      Log.info { "Board renamed from '#{old_name}' to '#{new_name}' (canonical directory: '#{old_board_dir_path}' to '#{new_board_dir_path}') by root." }
    end

    private def rename_user_board_symlink(board : Board, old_name : String, new_name : String, user : String)
      uuid = board.sepia_id
      old_user_board_symlink_path = File.join(ToCry.users_base_directory, user, "boards", "#{uuid}.#{old_name}")
      new_user_board_symlink_path = File.join(ToCry.users_base_directory, user, "boards", "#{uuid}.#{new_name}")

      ToCry.validate_path_within_data_dir(old_user_board_symlink_path)
      ToCry.validate_path_within_data_dir(new_user_board_symlink_path)

      FileUtils.mv(old_user_board_symlink_path, new_user_board_symlink_path)

      if @safe_mode_enabled
        broken_links = ToCry.find_broken_symlinks
        unless broken_links.empty?
          raise "Operation blocked: Broken symlinks detected after renaming user symlink. Please fix: #{broken_links.join(", ")}"
        end
      end
      Log.info { "Symlink for board '#{old_name}' renamed to '#{new_name}' at '#{old_user_board_symlink_path}' to '#{new_user_board_symlink_path}' by user '#{user}'." }
      board
    end

    # Shares a board from one user to another by creating a symlink.
    def share_board(board_name : String, from_user : String, to_user : String)
      # 1. Find the board for the `from_user`.
      board = get(board_name, from_user)
      raise "Board '#{board_name}' not found for user '#{from_user}'." unless board

      # 2. Check if the `to_user` already has access.
      if get(board_name, to_user)
        Log.info { "Board '#{board_name}' is already shared with user '#{to_user}'." }
        return
      end

      # 3. Create the symlink for the `to_user`.
      uuid = board.sepia_id
      board_full_name = "#{uuid}.#{board.name}"

      user_board_symlink_path = File.join(
        ToCry.users_base_directory,
        to_user,
        "boards",
        board_full_name
      )
      board_path = Path[board.canonical_path].relative_to(Path[user_board_symlink_path].parent)

      ToCry.validate_path_within_data_dir(user_board_symlink_path)
      FileUtils.mkdir_p(File.dirname(user_board_symlink_path))

      # The symlink in the user's dir should point to the canonical board symlink in `data/boards/`
      FileUtils.ln_s(board_path, user_board_symlink_path)

      if @safe_mode_enabled
        broken_links = ToCry.find_broken_symlinks
        unless broken_links.empty?
          raise "Operation blocked: Broken symlinks detected after sharing board. Please fix: #{broken_links.join(", ")}"
        end
      end
      Log.info { "Shared board '#{board_name}' from user '#{from_user}' to user '#{to_user}'." }
    end
  end
end
