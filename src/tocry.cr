require "file_utils" # For File.dirname, File.basename
require "kemal"
require "json"    # For JSON serialization
require "ecr"     # For ECR templating
require "./lane"  # Include the Lane class from its new file
require "./board" # Include the Board class from its new file
require "./board_manager"

module ToCry
  VERSION = {{ `shards version #{__DIR__}/../`.chomp.stringify }}

  Log = ::Log.for(self)

  # A class variable to store the configured data directory.
  # It's initialized with a default, but will be set by `main.cr` at startup.
  @@data_directory : String = "data"

  # Getter for the globally configured data directory.
  def self.data_directory
    @@data_directory
  end

  # Lazily initialized singleton instance of BoardManager to manage board operations.
  # This ensures @@data_directory is set before BoardManager is used.
  @@board_manager : BoardManager? = nil

  def self.board_manager
    @@board_manager ||= begin
      Log.info { "Initializing BoardManager with data directory: #{@@data_directory}" }
      BoardManager.new
    end
  end

  # Setter for the globally configured data directory.
  # This method should be called once at application startup.
  def self.data_directory=(path : String)
    @@data_directory = path
  end

  # Helper function to validate a string as a safe filename component.
  # Rejects empty strings, '.', '..', strings containing path separators, or strings starting with '.'.
  def self.validate_filename_component(name : String)
    if name.empty?
      raise "Name cannot be empty."
    end
    if name == "." || name == ".." || name.includes?('/') || name.includes?('\\') || name.starts_with?('.')
      raise "Invalid name: It cannot be '.' or '..', contain path separators, or start with a dot."
    end
  end
end
