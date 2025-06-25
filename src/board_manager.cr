require "file_utils"
require "uuid"

module ToCry
  # The BoardManager is responsible for discovering, loading, and managing
  # multiple Board instances. It interacts with the filesystem to handle
  # the multi-board data structure, using the globally configured data directory.
  class BoardManager
    Log = ::Log.for(self)
    # Maps board name to its UUID and the Board instance
    # { board_name => { uuid: "...", board: Board_instance } }
    @boards = {} of String => {uuid: String, board: Board}
    # Maps board UUID to its name
    @uuid_to_name_map = {} of String => String

    private def board_base_dir
      File.join(ToCry.data_directory, "boards")
    end

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

    def initialize
      # Ensure the base data directory for boards exists
      FileUtils.mkdir_p(board_base_dir)

      # Populate the board cache by scanning the new structure
      scan_boards_directory
    end

    # Scans the boards directory and populates the in-memory cache.
    private def scan_boards_directory
      @boards.clear
      @uuid_to_name_map.clear

      Dir.children(board_base_dir).each do |entry|
        # Expected format: {UUID}.{name}
        if match = entry.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(.+)$/)
          uuid = match[1]
          name = match[2]
          board_dir = File.join(board_base_dir, entry)

          if File.directory?(board_dir)
            board = Board.new(board_data_dir: board_dir)
            # We don't load the full board content here, just cache the instance
            @boards[name] = {uuid: uuid, board: board}
            @uuid_to_name_map[uuid] = name
          else
            Log.warn { "Found non-directory entry in boards directory: #{entry}" }
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

      unless File.directory?(user_boards_path)
        Log.info { "User board directory '#{user_boards_path}' does not exist for user '#{user}'. Returning empty list." }
        return [] of String
      end

      user_accessible_board_names = [] of String
      Dir.children(user_boards_path).each do |entry|
        # Symlinks are in the format {UUID}.{name}
        if match = entry.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(.+)$/)
          board_name_from_symlink = match[2]
          user_accessible_board_names << board_name_from_symlink
        else
          Log.warn { "Found invalid entry format in user board directory '#{user_boards_path}': #{entry}" }
        end
      end

      # Filter the globally known boards by what's accessible to the user
      @boards.keys.select { |global_board_name| user_accessible_board_names.includes?(global_board_name) }.sort!
    end

    # Get a board by name, loading it if not in cache
    def get(name : String, user : String) : Board?
      board_entry = @boards[name]?
      return nil unless board_entry

      # Check if the board is accessible to the given user
      unless list(user).includes?(name)
        return nil
      end

      board = board_entry[:board]
      # Ensure the board's content is loaded if it hasn't been already
      unless board.loaded?
        board.load
      end
      board
    end

    # Creates a new board with the given name.
    # Optionally creates a symlink for a user.
    def create(name : String, user : String) : Board
      if @boards.has_key?(name)
        raise "Board '#{name}' already exists."
      end

      uuid = UUID.random.to_s
      # New board directory will be {UUID}.{name}
      board_dir_name = "#{uuid}.#{name}"
      board_dir_path = File.join(board_base_dir, board_dir_name)

      BoardManager.validate_path_within_data_dir(board_dir_path)

      FileUtils.mkdir_p(board_dir_path)
      board = Board.new(board_data_dir: board_dir_path)
      board.save # Save an empty board to create initial structure

      # For non-root users, create a symlink in their user directory.
      if user != "root"
        # Construct the full path for the symlink: /data/users/{user}/boards/{UUID}.{name}
        user_board_symlink_path = File.join(
          ToCry.data_directory,
          "users",
          user,
          "boards",
          board_dir_name
        )

        # Validate the user-specific path to prevent traversal attacks
        BoardManager.validate_path_within_data_dir(user_board_symlink_path)
        FileUtils.mkdir_p(File.dirname(user_board_symlink_path)) # Ensure user's boards directory exists
        FileUtils.ln_s(board_dir_path, user_board_symlink_path)  # Create the symlink
        Log.info { "Symlink created for user '#{user}' from '#{board_dir_path}' to '#{user_board_symlink_path}'." }
      end

      @boards[name] = {uuid: uuid, board: board}
      @uuid_to_name_map[uuid] = name

      Log.info { "Board '#{name}' created at '#{board_dir_path}'." }
      board
    end

    # Deletes a board by its name for a given user.
    # If the user is 'root', the canonical board directory is deleted.
    # Otherwise, only the user's symlink to the board is removed.
    def delete(name : String, user : String)
      # First, check if the board exists in the global list
      board_entry = @boards[name]?
      unless board_entry
        raise "Board '#{name}' not found for deletion."
      end

      uuid = board_entry[:uuid]

      # Verify user access to the board before proceeding
      unless get(name, user) # Use the user-aware get to check accessibility
        raise "Board '#{name}' not found or not accessible to user '#{user}' for deletion."
      end

      if user == "root"
        # Root user deletes the canonical board directory
        @boards.delete(name)
        @uuid_to_name_map.delete(uuid)
        board_dir_path = board_entry[:board].board_data_dir
        BoardManager.validate_path_within_data_dir(board_dir_path)
        FileUtils.rm_rf(board_dir_path) if Dir.exists?(board_dir_path)
        Log.info { "Board '#{name}' and its canonical directory '#{board_dir_path}' deleted by root." }
      else
        # Non-root user deletes only their symlink
        user_board_symlink_path = File.join(ToCry.users_base_directory, user, "boards", "#{uuid}.#{name}")
        BoardManager.validate_path_within_data_dir(user_board_symlink_path)
        if File.symlink?(user_board_symlink_path)
          FileUtils.rm(user_board_symlink_path)
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
      if @boards.has_key?(new_name)
        raise "Board with name '#{new_name}' already exists."
      end

      board_entry = @boards[old_name]
      raise "Board '#{old_name}' not found for renaming." unless board_entry
      uuid = board_entry[:uuid]
      board = board_entry[:board]

      # Verify user access to the board before proceeding
      unless get(old_name, user) # Use the user-aware get to check accessibility
        raise "Board '#{old_name}' not found or not accessible to user '#{user}' for renaming."
      end

      if user == "root"
        # Root user renames the canonical board directory
        old_board_dir_name = "#{uuid}.#{old_name}"
        new_board_dir_name = "#{uuid}.#{new_name}"

        old_board_dir_path = File.join(board_base_dir, old_board_dir_name)
        new_board_dir_path = File.join(board_base_dir, new_board_dir_name)

        BoardManager.validate_path_within_data_dir(old_board_dir_path)
        BoardManager.validate_path_within_data_dir(new_board_dir_path)

        FileUtils.mv(old_board_dir_path, new_board_dir_path)

        # Update the board instance's internal directory path
        board.board_data_dir = new_board_dir_path

        # Update the cache
        @boards.delete(old_name)
        @boards[new_name] = {uuid: uuid, board: board}
        @uuid_to_name_map[uuid] = new_name
        Log.info { "Board renamed from '#{old_name}' to '#{new_name}' (canonical directory: '#{old_board_dir_path}' to '#{new_board_dir_path}') by root." }
      else
        # Non-root user renames only their symlink
        old_user_board_symlink_path = File.join(ToCry.users_base_directory, user, "boards", "#{uuid}.#{old_name}")
        new_user_board_symlink_path = File.join(ToCry.users_base_directory, user, "boards", "#{uuid}.#{new_name}")

        BoardManager.validate_path_within_data_dir(old_user_board_symlink_path)
        BoardManager.validate_path_within_data_dir(new_user_board_symlink_path)

        FileUtils.mv(old_user_board_symlink_path, new_user_board_symlink_path)
        Log.info { "Symlink for board '#{old_name}' renamed to '#{new_name}' at '#{old_user_board_symlink_path}' to '#{new_user_board_symlink_path}' by user '#{user}'." }
      end
      board
    end
  end
end
