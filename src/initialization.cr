require "../src/migrations"
require "../src/demo"
require "../src/file_change_handler"

module ToCry::Initialization
  def self.setup_data_environment(data_path : String, safe_mode : Bool = false, run_migrations : Bool = true, demo_mode : Bool = false) : ToCry::BoardManager
    if demo_mode
      # Setup in-memory storage first
      ToCry::Demo.setup_demo_storage
      # Set a dummy data directory path for compatibility
      ToCry.data_directory = "/tmp/tocry_demo"
      ToCry.safe_mode_enabled = safe_mode
      # Skip migrations in demo mode - we have fresh seeded data
    else
      # Regular filesystem-based setup with configurable file watching
      ToCry.data_directory = data_path

      # Check if file watching is enabled via environment variable
      file_watching_enabled = ENV["TOCRY_FILE_WATCHING_ENABLED"]? == "true"

      Sepia::Storage.configure(:filesystem, {
        "path"  => data_path,
        "watch" => file_watching_enabled
      })
      ToCry.safe_mode_enabled = safe_mode
      if run_migrations
        ToCry::Migration.run
      end
    end

    # Initialize BoardManager and set it globally
    board_manager = ToCry::BoardManager.new(safe_mode)
    ToCry.board_manager = board_manager

    # Initialize file change handler for multi-instance synchronization
    # This will set up file system watchers if enabled
    file_watching_enabled = ENV["TOCRY_FILE_WATCHING_ENABLED"]? == "true" && !demo_mode
    ToCry::FileChangeHandler.initialize(watcher_enabled: file_watching_enabled)

    # Now seed demo data after BoardManager is available
    if demo_mode
      ToCry::Demo.seed_data
    end

    board_manager
  end
end
