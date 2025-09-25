require "uuid"
require "sepia"

module ToCry
  # User class with Sepia persistence for multi-auth mode support.
  # Handles three authentication modes:
  # 1. No Auth: Uses a single "root" user with access to all boards
  # 2. Basic Auth: Uses a single "root" user with access to all boards
  # 3. Google Auth: Creates persistent user records with email-based IDs
  class User < Sepia::Object
    include JSON::Serializable
    include Sepia::Container

    property email : String
    property name : String
    property provider : String # e.g., "noauth", "basic", "google", "fake_google"
    property is_root : Bool = false # Special flag for root user access

    # Constructor that uses email as sepia_id (similar to Board using name)
    def initialize(@email : String, @name : String, @provider : String)
      super(@email) # Pass email as sepia_id to Sepia::Object
      # Root user identification should be explicit via is_root flag, not inferred
      @is_root = (@email == "root")
    end

    # Default constructor for deserialization (Sepia needs this)
    def initialize(@email : String = "", @name : String = "", @provider : String = "", @is_root : Bool = false)
    end

    # Saves the user using Sepia persistence (inherited from Sepia::Object)
    def save
      super
      self
    end

    # Finds a user by their email using Sepia
    def self.find_by_email(email : String) : User?
      # For root user in no-auth/basic-auth mode, ensure it exists
      if email == "root"
        return ensure_root_user
      end

      # For other users, search in Sepia storage
      # Use the sepia_id which would be the email for users
      begin
        ToCry::User.load(email)
      rescue
        nil
      end
    end

    # Finds a user by their ID (sepia_id) using Sepia
    # In our case, sepia_id is the email for regular users or "root" for root user
    def self.find_by_id(id : String) : User?
      begin
        ToCry::User.load(id)
      rescue
        nil
      end
    end

    # Ensures the root user exists for no-auth/basic-auth modes
    # This user has special privileges to access all boards
    private def self.ensure_root_user : User
      # Try to load existing root user
      begin
        existing_root = ToCry::User.load("root")
        return existing_root if existing_root.is_root
      rescue
        # Root user doesn't exist yet, will create below
      end

      # Create root user if it doesn't exist
      # Provider reflects the actual auth mode being used
      provider = if ENV["TOCRY_AUTH_USER"]? && ENV["TOCRY_AUTH_PASS"]?
                   "basic"
                 else
                   "noauth"
                 end

      root_user = User.new(
        email: "root",
        name: "Root User",
        provider: provider
      )
      root_user.is_root = true
      root_user.save
      root_user
    end    # Helper method to check if user has access to all boards (root privileges)
    def has_global_board_access? : Bool
      @is_root
    end
  end
end
