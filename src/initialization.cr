require "../src/migrations"

module ToCry::Initialization
  def self.setup_data_environment(data_path : String, safe_mode : Bool = false, run_migrations : Bool = true) : ToCry::BoardManager
    ToCry.data_directory = data_path
    Sepia::Storage::INSTANCE.path = data_path
    ToCry.safe_mode_enabled = safe_mode
    if run_migrations
      ToCry::Migration.run
    end
    # Initialize BoardManager directly and return it
    ToCry::BoardManager.new(safe_mode)
  end
end
