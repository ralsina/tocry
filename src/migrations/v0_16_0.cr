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
  # - Improved user lookup using sepia_id (email) instead of searching all users
  # - Root user gets special is_root flag for global board access privileges
  # - Migration handles both new installations and updates to existing root users
  private def self.migrate_users_to_sepia
    # Ensure the root user exists for no-auth/basic-auth modes
    # This will be automatically created when first accessed via ToCry::User.find_by_email("root")
    # but we can explicitly create it here for clarity
    begin
      existing_root = ToCry::User.load("root")
      # Check if existing root user has proper configuration
      if existing_root.is_root
        Log.info { "Root user already exists with proper configuration" }
        return
      else
        # Update existing root user to have proper configuration
        Log.info { "Updating existing root user with proper is_root flag and provider" }
        existing_root.is_root = true

        # Set provider based on current authentication mode
        current_provider = if ENV["TOCRY_AUTH_USER"]? && ENV["TOCRY_AUTH_PASS"]?
                            "basic"
                          else
                            "noauth"
                          end
        existing_root.provider = current_provider
        existing_root.save
        Log.info { "Updated root user configuration for persistent storage with provider: #{current_provider}" }
        return
      end
    rescue
      # Root user doesn't exist, will be created below
      Log.info { "Root user does not exist, creating new one" }
    end

    # Create root user with proper configuration
    # Provider should reflect the actual authentication mode being used
    provider = if ENV["TOCRY_AUTH_USER"]? && ENV["TOCRY_AUTH_PASS"]?
                 "basic"
               else
                 "noauth"
               end

    root_user = ToCry::User.new(
      email: "root",
      name: "Root User",
      provider: provider
    )
    root_user.is_root = true
    root_user.save

    Log.info { "Created persistent root user for no-auth/basic-auth modes" }
    Log.info { "User persistence migration to Sepia completed" }
  end
end
