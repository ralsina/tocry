require "file_utils"
require "semantic_version"

module ToCry
  # The Migration module handles evolving the data directory from one version
  # of the application to the next.
  module Migration
    Log          = ::Log.for(self)
    DATA_DIR     = "data"
    VERSION_FILE = File.join(DATA_DIR, ".version")

    # The main entry point for running all necessary migrations.
    # This should be called once at application startup.
    def self.run
      FileUtils.mkdir_p(DATA_DIR)
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
      File.exists?(VERSION_FILE) ? File.read(VERSION_FILE).strip : nil
    end

    private def self.update_version_file
      File.write(VERSION_FILE, VERSION)
    end

    # This is where we will add all migration steps in order.
    private def self.apply_migrations(from_version : String?)
      # Migration 1: from pre-versioning to multi-board structure.
      # This runs only for old installations that don't have a .version file.
      if from_version.nil?
        migrate_to_multi_board_v1
      end

      # Future migrations would be added here, for example:
      # if from_version && SemanticVersion.new(from_version) < SemanticVersion.new("0.2.0")
      #   migrate_to_v0_2_0
      # end
    end

    private def self.migrate_to_multi_board_v1
      default_board_dir = File.join(DATA_DIR, "default")
      old_lane_dirs = Dir.glob(File.join(DATA_DIR, "[0-9][0-9][0-9][0-9]_*"))

      if !old_lane_dirs.empty? && !Dir.exists?(default_board_dir)
        Log.warn { "Old single-board data structure detected. Migrating to 'default' board..." }

        FileUtils.mkdir_p(default_board_dir)
        Log.info { "Created new default board directory at '#{default_board_dir}'." }

        old_lane_dirs.each do |old_dir_path|
          dir_basename = File.basename(old_dir_path)
          new_dir_path = File.join(default_board_dir, dir_basename)
          FileUtils.mv(old_dir_path, new_dir_path)
          Log.info { "Moved '#{old_dir_path}' to '#{new_dir_path}'." }
        end

        # Move the .notes directory if it exists
        notes_dir = File.join(DATA_DIR, ".notes")
        new_notes_dir = File.join(default_board_dir, ".notes")
        FileUtils.mv(notes_dir, new_notes_dir) if Dir.exists?(notes_dir)

        Log.info { "Initial data migration to multi-board format completed." }
      else

        Log.info { "No old single-board data found to migrate." }
      end
    end
  end
end
