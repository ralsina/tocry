require "../src/migrations"
require "../src/demo"

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
      # Regular filesystem-based setup
      ToCry.data_directory = data_path
      Sepia::Storage.configure(:filesystem, {"path" => data_path})
      ToCry.safe_mode_enabled = safe_mode
      if run_migrations
        ToCry::Migration.run
      end
    end

    # Initialize BoardManager and set it globally
    board_manager = ToCry::BoardManager.new(safe_mode)
    ToCry.board_manager = board_manager

    # Now seed demo data after BoardManager is available
    if demo_mode
      ToCry::Demo.seed_data
    end

    board_manager
  end
end
