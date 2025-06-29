module ToCry::Migration
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
end
