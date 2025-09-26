module ToCry::Migration
  # Migration for v0.17.0: Upload management with Sepia
  #
  # This migration introduces the Upload class for tracking file upload metadata
  # with Sepia persistence. Since uploads were previously managed with direct
  # file operations and no metadata tracking, this migration creates Upload
  # records for existing files where possible.
  #
  # Changes:
  # - Upload class extends Sepia::Object for persistent upload metadata
  # - Image uploads now tracked with user ownership and metadata
  # - Note attachments tracked with Upload records and note associations
  # - Enhanced file management with cleanup capabilities
  # - Backward compatibility maintained for existing files
  # - Migration attempts to create Upload records for existing files
  private def self.migrate_uploads_to_sepia
    data_dir = ToCry.data_directory

    # Migrate existing user-images
    migrate_existing_images(data_dir)

    # Migrate existing note attachments
    migrate_existing_attachments(data_dir)

    Log.info { "Upload management migration to Sepia completed" }
  end

  private def self.migrate_existing_images(data_dir : String)
    images_dir = File.join(data_dir, "uploads", "user-images")

    return unless Dir.exists?(images_dir)

    Log.info { "Migrating existing image uploads..." }

    Dir.glob(File.join(images_dir, "*")).each do |image_path|
      next unless File.file?(image_path)

      filename = File.basename(image_path)
      next if filename.starts_with?(".") # Skip hidden files

      begin
        # Try to extract info from the filename
        file_stats = File.info(image_path)
        extension = File.extname(filename)
        relative_path = File.join("uploads", "user-images", filename)

        # Create Upload record for existing image
        # We don't know the original uploader, so use "root" as fallback
        upload = ToCry::Upload.new(
          original_filename: filename, # We don't have the original name, use current
          file_extension: extension,
          file_size: file_stats.size.to_i64,
          upload_type: "image",
          uploaded_by: "root", # Default to root user for existing files
          relative_path: relative_path,
          content_type: guess_content_type_from_extension(extension)
        )

        # Override the upload date with file modification time if possible
        upload.upload_date = file_stats.modification_time
        upload.save

        Log.info { "Migrated image upload: #{filename}" }

      rescue ex
        Log.warn { "Failed to migrate image upload '#{filename}': #{ex.message}" }
        # Continue with other files
      end
    end
  end

  private def self.migrate_existing_attachments(data_dir : String)
    attachments_dir = File.join(data_dir, "uploads", "attachments")

    return unless Dir.exists?(attachments_dir)

    Log.info { "Migrating existing note attachments..." }

    # Iterate through note directories
    Dir.glob(File.join(attachments_dir, "*")).each do |note_dir|
      next unless File.directory?(note_dir)

      note_id = File.basename(note_dir)

      # Iterate through attachment files in this note directory
      Dir.glob(File.join(note_dir, "*")).each do |attachment_path|
        next unless File.file?(attachment_path)

        filename = File.basename(attachment_path)
        next if filename.starts_with?(".") # Skip hidden files

        begin
          file_stats = File.info(attachment_path)
          extension = File.extname(filename)
          relative_path = File.join("uploads", "attachments", note_id, filename)

          # Try to extract original filename from UUID prefix pattern
          original_filename = if filename.includes?("_")
                               filename.split("_", 2)[1]? || filename
                             else
                               filename
                             end

          # Create Upload record for existing attachment
          upload = ToCry::Upload.new(
            original_filename: original_filename,
            file_extension: extension,
            file_size: file_stats.size.to_i64,
            upload_type: "attachment",
            uploaded_by: "root", # Default to root user for existing files
            relative_path: relative_path,
            content_type: guess_content_type_from_extension(extension),
            note_id: note_id
          )

          # Override the upload date with file modification time
          upload.upload_date = file_stats.modification_time
          upload.save

          Log.info { "Migrated attachment: #{filename} for note #{note_id}" }

        rescue ex
          Log.warn { "Failed to migrate attachment '#{filename}' for note '#{note_id}': #{ex.message}" }
          # Continue with other files
        end
      end
    end
  end

  private def self.guess_content_type_from_extension(extension : String) : String?
    case extension.downcase
    when ".jpg", ".jpeg" then "image/jpeg"
    when ".png" then "image/png"
    when ".gif" then "image/gif"
    when ".webp" then "image/webp"
    when ".pdf" then "application/pdf"
    when ".txt" then "text/plain"
    when ".md" then "text/markdown"
    when ".json" then "application/json"
    when ".zip" then "application/zip"
    else nil
    end
  end
end
