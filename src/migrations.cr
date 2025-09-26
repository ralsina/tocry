require "./migrations/v0_1_0"
require "./migrations/v0_6_1"
require "./migrations/v0_8_0"
require "./migrations/v0_10_0"
require "./migrations/v0_15_0"
require "./migrations/v0_16_0"
require "./migrations/v0_17_0"
require "./migrations/v0_18_0"

module ToCry
  # The Migration module handles evolving the data directory from one version
  # of the application to the next.
  module Migration
    Log = ::Log.for(self)

    private def self.version_file_path
      File.join(ToCry.data_directory, ".version")
    end

    # The main entry point for running all necessary migrations.
    # This should be called once at application startup.
    def self.run
      FileUtils.mkdir_p(ToCry.data_directory)
      stored_version_str = get_stored_version
      current_version = SemanticVersion.parse(VERSION)

      if stored_version_str
        stored_version = SemanticVersion.parse(stored_version_str)

        if stored_version > current_version
          Log.fatal { "Data directory version (#{stored_version}) is newer than application version (#{current_version}). " +
            "Downgrading is not supported. Please use a newer version of the application." }
          exit 1
        elsif stored_version == current_version
          Log.info { "Data directory is up to date (version #{current_version}). No migration needed." }
          return
        end
      end

      Log.warn { "Data directory is at version '#{stored_version_str || "pre-0.1.0"}' and needs migration to '#{current_version}'." }
      apply_migrations(stored_version_str)

      # After successful migration, update the version file.
      update_version_file
      Log.info { "Successfully migrated data to version #{current_version}." }
    rescue ex
      Log.fatal(exception: ex) { "A critical error occurred during data migration. The application will exit to prevent data corruption." }
      exit 1
    end

    private def self.get_stored_version : String?
      path = version_file_path
      File.exists?(path) ? File.read(path).strip : nil
    end

    private def self.update_version_file
      File.write(version_file_path, VERSION)
    end

    # This is where we will add all migration steps in order.
    private def self.apply_migrations(from_version : String?)
      # Parse from_version once if it exists
      parsed_from_version = from_version ? SemanticVersion.parse(from_version) : nil

      # Migration 1: from pre-versioning to multi-board structure.
      # This runs only for old installations that don't have a .version file.
      if from_version.nil?
        migrate_to_multi_board_v1
      end

      # Migration 2: from "uploads" to ".uploads"
      # This runs for any version before this feature is introduced.
      # This runs for any version before 0.7.0
      if from_version.nil? || (parsed_from_version && parsed_from_version < SemanticVersion.parse("0.6.1"))
        migrate_uploads_to_hidden
      end

      # Migration 3: from flat board directories to UUID-based board directories.
      # This runs for any version before 0.8.0.
      # Boards are moved from data/{boardname} to data/boards/{UUID}.{boardname}/
      if from_version.nil? || (parsed_from_version && parsed_from_version < SemanticVersion.parse("0.8.0"))
        migrate_boards_to_uuid_structure
      end

      # Migration 4: from board-centric notes to centralized note storage.
      # This runs for any version before 0.10.0.
      if from_version.nil? || (parsed_from_version && parsed_from_version < SemanticVersion.parse("0.10.0"))
        migrate_to_centralized_notes
      end

      # Migration 5: migrate color schemes from separate JSON files to Board objects.
      # This runs for any version before 0.15.0.
      if from_version.nil? || (parsed_from_version && parsed_from_version < SemanticVersion.parse("0.15.0"))
        migrate_color_schemes_to_sepia
      end

      # Migration 6: migrate User class from in-memory storage to Sepia persistence.
      # This runs for any version before 0.16.0.
      if from_version.nil? || (parsed_from_version && parsed_from_version < SemanticVersion.parse("0.16.0"))
        migrate_users_to_sepia
      end

      # Migration 7: migrate upload management to use Sepia for metadata tracking.
      # This runs for any version before 0.17.0.
      if from_version.nil? || (parsed_from_version && parsed_from_version < SemanticVersion.parse("0.17.0"))
        migrate_uploads_to_sepia
      end

      # Migration 8: migrate BoardManager to use Sepia for board indexing and user access.
      # This runs for any version before 0.18.0.
      if from_version.nil? || (parsed_from_version && parsed_from_version < SemanticVersion.parse("0.18.0"))
        migrate_board_manager_to_sepia
      end
    end
  end
end
