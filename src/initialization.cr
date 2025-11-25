require "../src/migrations"
require "../src/demo"
require "../src/conflict_resolution"

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
      # Regular filesystem-based setup with file watching enabled
      ToCry.data_directory = data_path

      Sepia::Storage.configure(:filesystem, {
        "path"  => data_path,
        "watch" => !demo_mode
      })
      ToCry.safe_mode_enabled = safe_mode
      if run_migrations
        ToCry::Migration.run
      end
    end

    # Initialize BoardManager and set it globally
    board_manager = ToCry::BoardManager.new(safe_mode)
    ToCry.board_manager = board_manager

    # Initialize multi-instance coordinator for file system change handling
    # This will set up file system watchers if enabled (disabled in demo mode)
    ToCry::MultiInstanceCoordinator.initialize(watcher_enabled: !demo_mode)

    # Now seed demo data after BoardManager is available
    if demo_mode
      ToCry::Demo.seed_data
    end

    board_manager
  end
end
