require "file_utils" # For File.dirname, File.basename
require "kemal"
require "json"              # For JSON serialization
require "ecr"               # For ECR templating
require "./lane"            # Include the Lane class from its new file
require "./board"           # Include the Board class from its new file
require "./upload"          # Include the Upload class for file management
require "./board_index"     # Include the BoardIndex class for board indexing
require "./board_reference" # Include the BoardReference class for user-specific board references
require "./board_manager"
require "./color_scheme"

module ToCry
  VERSION = {{ `shards version #{__DIR__}/../`.chomp.stringify }}

  Log = ::Log.for(self)

  # A class variable to store the configured data directory.
  # It's initialized with a default, but will be set by `main.cr` at startup.
  @@data_directory : String = "data"
  @@safe_mode_enabled : Bool = false # New class variable for safe mode

  # Getter for the globally configured data directory.
  def self.data_directory
    @@data_directory
  end

  # Setter for safe mode.
  def self.safe_mode_enabled=(enabled : Bool)
    @@safe_mode_enabled = enabled
  end

  @@_board_manager : BoardManager? = nil

  # Getter for the BoardManager instance.
  def self.board_manager : BoardManager
    @@_board_manager.not_nil!
  end

  # Setter for the BoardManager instance.
  def self.board_manager=(manager : BoardManager)
    @@_board_manager = manager
  end

  # Setter for the globally configured data directory.
  # This method should be called once at application startup.
  def self.data_directory=(path : String)
    @@data_directory = path
  end

  # --- User Directory Management ---

  # Returns the base directory for all user data.
  def self.users_base_directory : String
    File.join(data_directory, "users")
  end

  # Gets the sanitized user ID for the current request.
  # Returns "root" for no-auth/basic-auth, or a sanitized email for Google Auth.
  def self.get_current_user_id(env : HTTP::Server::Context) : String
    # Google Auth has the user email in the session
    if user = current_user(env)
      # Sanitize email to be a valid directory name.
      # Replace characters that are invalid in some filesystems.
      sanitized_id = user.email.gsub(/[^a-zA-Z0-9_.-@]/, "_")
      begin
        ToCry::Endpoints::Helpers.validate_path_component(sanitized_id, allow_dots: true) # Use generalized helper
        return sanitized_id
      rescue ex
        Log.warn(exception: ex) { "Could not use sanitized email '#{sanitized_id}' as user directory name. Falling back to 'invalid_user'." }
        return "invalid_user"
      end
    end
    # Default user for no-auth or basic-auth modes.
    "root"
  end

  # Create the root user directory if it doesn't exist.
  # With Sepia-based board management, we no longer need symlinks.
  def self.create_root_user_directory(user_dir)
    # Simply ensure the user directory exists
    FileUtils.mkdir_p(user_dir)
    Log.debug { "Root user directory ensured at '#{user_dir}'" }
  end

  # Ensures that the data directory for the current user exists.
  # This is called on every request via a middleware.
  def self.ensure_user_directory_exists(env : HTTP::Server::Context)
    user_id = get_current_user_id(env)                  # Get the user ID
    user_dir = File.join(users_base_directory, user_id) # Path to the user's base directory

    if user_id == "root"
      self.create_root_user_directory(user_dir)
    else
      # For non-root users, create the user's main directory and their boards subdirectory.
      # This is idempotent and safe to call on every request.
      FileUtils.mkdir_p(File.join(user_dir, "boards"))
    end
  rescue ex
    Log.error(exception: ex) { "Failed to create user directory for '#{user_id}'" }
    # We don't re-raise, as this is a non-critical background task for now.
  end
end
