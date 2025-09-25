module ToCry::Migration
  # Migration for v0.16.0: User persistence with Sepia
  #
  # This migration migrates the User class from in-memory storage to Sepia persistence.
  # Since users were previously stored only in memory (lost on restart), there is no
  # existing data to migrate. However, this migration ensures the root user is properly
  # initialized for no-auth and basic-auth modes.
  #
  # Changes:
  # - User class now extends Sepia::Object for persistent storage
  # - Users survive server restarts in Google Auth mode
  # - Root user is automatically created for no-auth/basic-auth modes
  # - User sessions persist across restarts
  private def self.migrate_users_to_sepia
    # Ensure the root user exists for no-auth/basic-auth modes
    # This will be automatically created when first accessed via ToCry::User.find_by_email("root")
    # but we can explicitly create it here for clarity
    begin
      existing_root = ToCry::User.load("root")
      if existing_root.is_root
        Log.info { "Root user already exists with proper configuration" }
        return
      end
    rescue
      # Root user doesn't exist, will be created
    end

    # Create root user with proper configuration
    root_user = ToCry::User.new(
      email: "root",
      name: "Root User",
      provider: "system"
    )
    root_user.is_root = true
    root_user.save

    Log.info { "Created persistent root user for no-auth/basic-auth modes" }
    Log.info { "User persistence migration to Sepia completed" }
  end
end
