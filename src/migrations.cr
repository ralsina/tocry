require "crystar"
require "compress/gzip"
require "./migrations/v0_1_0"
require "./migrations/v0_6_1"
require "./migrations/v0_8_0"
require "./migrations/v0_10_0"
require "./migrations/v0_15_0_consolidated"
require "./migrations/v0_15_1_fix_single_user"
require "./migrations/v0_22_0_lane_identity"

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
      stored_version_str = stored_version
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

      # Create backup before applying migrations
      backup_dir = File.join(Dir.current, "backups")
      FileUtils.mkdir_p(backup_dir)
      timestamp = Time.utc.to_s("%Y%m%d%H%M%S")
      backup_filename = "tocry_backup_#{timestamp}.tar.gz"
      backup_path = File.join(backup_dir, backup_filename)

      Log.info { "Creating backup of data directory '#{ToCry.data_directory}' to '#{backup_path}' before migration." }
      begin
        File.open(backup_path, "w") do |file_io|
          Compress::Gzip::Writer.open(file_io) do |gzip_writer|
            Crystar::Writer.open(gzip_writer) do |tar_writer|
              # Helper method to add files/directories recursively
              add_to_tar(tar_writer, ToCry.data_directory, ToCry.data_directory)
            end
          end
        end
        Log.info { "Backup created successfully." }
      rescue ex
        Log.error(exception: ex) { "Failed to create backup: #{ex.message}" }
        # Continue with migration, but log the error. Consider making this fatal in production.
      end

      apply_migrations(stored_version_str)

      # After successful migration, update the version file.
      update_version_file
      Log.info { "Successfully migrated data to version #{current_version}." }
    rescue ex
      Log.fatal(exception: ex) { "A critical error occurred during data migration. The application will exit to prevent data corruption." }
      exit 1
    end

    private def self.stored_version : String?
      path = version_file_path
      File.exists?(path) ? File.read(path).strip : nil
    end

    private def self.update_version_file
      File.write(version_file_path, VERSION)
    end

    private def self.add_to_tar(tar_writer : Crystar::Writer, source_path : String, base_path : String)
      Dir.each_child(source_path) do |entry_name|
        full_path = File.join(source_path, entry_name)
        relative_path = Path[full_path].relative_to(Path[base_path]).to_s

        if File.file?(full_path)
          file_info = File.info(full_path)
          header = Crystar::Header.new(
            name: relative_path,
            mode: file_info.permissions.to_i64,
            size: file_info.size
          )
          tar_writer.write_header(header)
          tar_writer.write(File.read(full_path).to_slice) # Write content directly
        elsif File.directory?(full_path)
          dir_info = File.info(full_path)
          header = Crystar::Header.new(
            name: relative_path + "/", # Tar directories usually end with a slash
            mode: dir_info.permissions.to_i64,
            size: 0 # Directories have size 0 in tar headers
          )
          tar_writer.write_header(header)
          add_to_tar(tar_writer, full_path, base_path) # Recurse
        end
      end
    end

    # This is where we will add all migration steps in order.
    # ameba:disable Metrics/CyclomaticComplexity
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

      # Migration 5: Complete Sepia integration (consolidated migration).
      # This runs for any version before 0.15.0.
      # Combines: color schemes, user persistence, upload management, and BoardManager Sepia migration.
      if from_version.nil? || (parsed_from_version && parsed_from_version < SemanticVersion.parse("0.15.0"))
        migrate_complete_sepia_integration
      end

      # Migration 6: Fix single-user mode board visibility.
      # This runs for any version before 0.15.1.
      # Ensures all boards are visible to root user in single-user mode.
      if from_version.nil? || (parsed_from_version && parsed_from_version < SemanticVersion.parse("0.15.1"))
        migrate_fix_single_user_board_visibility
      end

      # Migration 7: Fix lane identity and storage.
      # This runs for any version before 0.22.0.
      # Migrates lanes from name-based storage to UUID-based storage.
      if from_version.nil? || (parsed_from_version && parsed_from_version < SemanticVersion.parse("0.22.0"))
        migrate_fix_lane_identity_and_storage
      end
    end
  end
end
