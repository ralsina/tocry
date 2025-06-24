require "file_utils"

module ToCry
  # The BoardManager is responsible for discovering, loading, and managing
  # multiple Board instances. It interacts with the filesystem to handle
  # the multi-board data structure, using the globally configured data directory.
  class BoardManager
    Log = ::Log.for(self)
    @boards = {} of String => Board

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
      @boards.delete(name) # Remove from cache
      board_dir = File.join(ToCry.data_directory, name)
      FileUtils.rm_rf(board_dir) if Dir.exists?(board_dir)
      Log.info { "Board '#{name}' and its directory '#{board_dir}' deleted." }
    end
  end
end
