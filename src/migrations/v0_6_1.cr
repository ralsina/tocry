module ToCry::Migration
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
end
