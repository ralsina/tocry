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
  def self.create_root_user_directory(user_dir)
    root_boards_symlink_path = File.join(user_dir, "boards") # Expected path for the symlink
    target_boards_path = Path[board_manager.board_base_dir].relative_to(
      Path[root_boards_symlink_path].dirname
    ) # The target path for the symlink

    # Ensure the parent directory for the symlink exists
    FileUtils.mkdir_p(user_dir)

    if File.symlink?(root_boards_symlink_path)
      Log.debug { "Root user boards symlink already exists at '#{root_boards_symlink_path}'." }
    elsif File.exists?(root_boards_symlink_path)
      Log.warn { "Root user boards directory exists but is not a symlink. Removing '#{root_boards_symlink_path}' to create symlink." }
      FileUtils.rm_rf(root_boards_symlink_path)                    # Remove existing directory if it's not a symlink
      FileUtils.ln_s(target_boards_path, root_boards_symlink_path) # Create the symlink
      Log.info { "Created symlink for root user boards from '#{root_boards_symlink_path}' to '#{target_boards_path}'." }
    else
      FileUtils.ln_s(target_boards_path, root_boards_symlink_path) # Create the symlink
      Log.info { "Created symlink for root user boards from '#{root_boards_symlink_path}' to '#{target_boards_path}'." }
    end
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

  # Traverses the data directory and identifies broken symlinks.
  # Returns an array of absolute paths to broken symlinks.
  def self.find_broken_symlinks : Array(String)
    broken_symlinks = [] of String
    Log.info { "--- Starting find_broken_symlinks scan in: #{data_directory} ---" }
    Dir.glob([File.join(data_directory, "**/*")]).each do |path|
      Log.info { "  Scanning path: #{path}" }
      if File.symlink?(path)
        Log.info { "    Found symlink: #{path}" }
        begin
          resolved_path = File.realpath(path)
          Log.info { "    Symlink target resolved to: #{resolved_path}" }
        rescue ex
          Log.error { "    ERROR: Symlink #{path} is broken or unresolvable. Exception: #{ex.message}" }
          broken_symlinks << path
        end
      else
        Log.info { "    Not a symlink: #{path}" }
      end
    end
    Log.info { "--- Finished find_broken_symlinks scan. Broken links found: #{broken_symlinks.size} ---" }
    broken_symlinks
  end
end
