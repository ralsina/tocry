require "file_utils"

module ToCry
  # The BoardManager is responsible for discovering, loading, and managing
  # multiple Board instances. It interacts with the filesystem to handle
  # the multi-board data structure, using the globally configured data directory.
  class BoardManager
    Log = ::Log.for(self)
    @boards = {} of String => Board

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
      # Ensure the base data directory exists when BoardManager is initialized.
      FileUtils.mkdir_p(ToCry.data_directory)
    end

    # Lists all available boards by scanning the data directory for subdirectories.
    def list : Array(String)
      Dir.children(ToCry.data_directory).select do |entry|
        File.directory?(File.join(ToCry.data_directory, entry)) && !entry.starts_with?('.')
      end.sort!
    end

    # Get a board by name, loading it if not in cache
    def get(name : String) : Board?
      return @boards[name] if @boards.has_key?(name)

      board_dir = File.join(ToCry.data_directory, name)
      BoardManager.validate_path_within_data_dir(board_dir)
      return nil unless File.directory?(board_dir)

      board = Board.new(board_data_dir: board_dir)
      board.load
      @boards[name] = board
      board
    end

    # Creates a new board with the given name.
    # Raises if a board with the name already exists.
    def create(name : String) : Board
      if get(name)
        raise "Board '#{name}' already exists."
      end

      board_dir = File.join(ToCry.data_directory, name)
      BoardManager.validate_path_within_data_dir(board_dir)
      # Create the directory first, then initialize the board with that directory.
      # The Board.new will then use this directory for its save/load operations.
      FileUtils.mkdir_p(board_dir)
      board = Board.new(board_data_dir: board_dir)
      board.save # Save an empty board to create initial structure
      @boards[name] = board
      Log.info { "Board '#{name}' created at '#{board_dir}'." }
      board
    end

    # Deletes a board by its name, removing it from cache and filesystem.
    def delete(name : String)
      if name == "default"
        raise "The 'default' board cannot be deleted."
      end

      @boards.delete(name) # Remove from cache
      board_dir = File.join(ToCry.data_directory, name)
      BoardManager.validate_path_within_data_dir(board_dir)
      FileUtils.rm_rf(board_dir) if Dir.exists?(board_dir)
      Log.info { "Board '#{name}' and its directory '#{board_dir}' deleted." }
    end

    # Renames an existing board.
    # Updates the board's directory on the filesystem and refreshes the cache.
    def rename(old_name : String, new_name : String) : Board
      if old_name == "default"
        raise "The 'default' board cannot be renamed."
      end

      board = get(old_name)
      raise "Board '#{old_name}' not found for renaming." unless board

      board.rename(new_name)    # This updates the board_data_dir property and renames the directory
      @boards.delete(old_name)  # Remove old entry from cache
      @boards[new_name] = board # Add new entry to cache
      Log.info { "Board renamed from '#{old_name}' to '#{new_name}'." }
      board
    end
  end
end
