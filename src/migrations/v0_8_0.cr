module ToCry::Migration
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
