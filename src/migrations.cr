require "file_utils"
require "uuid"
require "semantic_version"

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
      # Migration 1: from pre-versioning to multi-board structure.
      # This runs only for old installations that don't have a .version file.
      if from_version.nil?
        migrate_to_multi_board_v1
      end

      # Migration 2: from "uploads" to ".uploads"
      # This runs for any version before this feature is introduced.
      # This runs for any version before 0.7.0
      if from_version.nil? || (from_version && SemanticVersion.parse(from_version) < SemanticVersion.parse("0.6.1"))
        migrate_uploads_to_hidden
      end

      # Migration 3: from flat board directories to UUID-based board directories.
      # This runs for any version before 0.8.0.
      # Boards are moved from data/{boardname} to data/boards/{UUID}.{boardname}/
      if from_version.nil? || (from_version && SemanticVersion.parse(from_version) < SemanticVersion.parse("0.8.0"))
        migrate_boards_to_uuid_structure
      end
    end

    private def self.migrate_to_multi_board_v1
      data_dir = ToCry.data_directory
      default_board_dir = File.join(data_dir, "default")
      old_lane_dirs = Dir.glob(File.join(data_dir, "[0-9][0-9][0-9][0-9]_*"))

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
        notes_dir = File.join(data_dir, ".notes")
        new_notes_dir = File.join(default_board_dir, ".notes")
        FileUtils.mv(notes_dir, new_notes_dir) if Dir.exists?(notes_dir)

        Log.info { "Initial data migration to multi-board format completed." }
      else
        Log.info { "No old single-board data found to migrate." }
      end
    end

    private def self.migrate_uploads_to_hidden
      data_dir = ToCry.data_directory
      old_uploads_path = File.join(data_dir, "uploads")
      new_uploads_path = File.join(data_dir, ".uploads")

      if Dir.exists?(old_uploads_path) && !Dir.exists?(new_uploads_path)
        Log.warn { "Found 'uploads' directory. Renaming to '.uploads' to prevent it from being treated as a board." }
        FileUtils.mv(old_uploads_path, new_uploads_path)
        Log.info { "Successfully moved '#{old_uploads_path}' to '#{new_uploads_path}'." }
      end
    end

    private def self.migrate_boards_to_uuid_structure
      data_dir = ToCry.data_directory
      new_boards_base_dir = File.join(data_dir, "boards")
      FileUtils.mkdir_p(new_boards_base_dir)

      # List all entries directly under data_dir
      all_entries = Dir.glob(File.join(data_dir, "*"))

      # Define system/special directories to exclude from migration.
      # These are either internal files/dirs or targets of other migrations.
      excluded_names = [
        ".version", # Application version file
        ".notes",   # Special directory, handled separately if not moved by v1
        ".uploads", # Target of v2 migration
        "uploads",  # Old uploads directory, renamed to .uploads for 0.6.1
        "boards",   # Target of this migration
      ]

      migrated_count = 0
      all_entries.each do |entry_path|
        entry_basename = File.basename(entry_path)

        # Skip files and explicitly excluded directories
        next unless File.directory?(entry_path)
        next if excluded_names.includes?(entry_basename)

        # Skip if it's already a UUID-based board (e.g., "uuid.name")
        if entry_basename.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\..+$/)
          Log.info { "Skipping '#{entry_basename}', already appears to be a UUID-based board." }
          next
        end

        # Generate a UUID and construct the new name
        uuid = UUID.random.to_s
        new_board_name = "#{uuid}.#{entry_basename}"
        new_board_path = File.join(new_boards_base_dir, new_board_name)

        begin
          FileUtils.mv(entry_path, new_board_path)
          Log.info { "Migrated board '#{entry_basename}' to '#{new_board_path}'." }
          migrated_count += 1
        rescue ex
          Log.error(exception: ex) { "Failed to migrate board '#{entry_basename}': #{ex.message}" }
        end
      end

      # Rename .uploads to uploads
      uploads_dir = File.join(data_dir, ".uploads")
      new_uploads_dir = File.join(data_dir, "uploads")

      FileUtils.mv(uploads_dir, new_uploads_dir) if Dir.exists?(uploads_dir)

      if migrated_count > 0
        Log.info { "Completed migration of #{migrated_count} board(s) to UUID-based structure." }
      else
        Log.info { "No flat board directories found to migrate to UUID-based structure." }
      end
    end
  end
end
