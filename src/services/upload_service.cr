require "../tocry"
require "../upload"
require "../demo"
require "uuid"
require "file_utils"

module ToCry::Services
  # Service layer for upload operations
  # Centralizes file upload logic, validation, and persistence
  class UploadService
    MAX_IMAGE_SIZE = 1_048_580 # 1MB

    # Create an image upload
    def self.create_image_upload(
      original_filename : String,
      content_type : String?,
      file_size : Int64,
      user_id : String,
      uploaded_file : IO,
      demo_mode : Bool = false
    )
      if demo_mode
        # Demo mode: use smaller size limit and create dummy upload
        if file_size > ToCry::Demo::MAX_UPLOAD_SIZE
          return {
            success: false,
            error:   "Image size exceeds the 64KB demo limit.",
            upload:  nil,
          }
        end

        upload = ToCry::Demo.handle_demo_upload(
          filename: original_filename,
          content_type: content_type,
          file_size: file_size,
          uploaded_by: user_id,
          upload_type: "image"
        )

        if upload.nil?
          return {
            success: false,
            error:   "Demo upload failed.",
            upload:  nil,
          }
        end

        # Create a dummy public URL for demo mode
        extension = File.extname(original_filename)
        public_url = "/demo/image/#{upload.upload_id}#{extension}"
      else
        # Normal mode: full functionality
        if file_size > MAX_IMAGE_SIZE
          return {
            success: false,
            error:   "Image size exceeds the 1MB limit.",
            upload:  nil,
          }
        end

        # Ensure the user-images subdirectory exists within the uploads directory
        upload_dir = File.join(ToCry.data_directory, "uploads", "user-images")
        FileUtils.mkdir_p(upload_dir)

        # Generate a unique filename to prevent overwrites, while keeping the original extension
        extension = File.extname(original_filename)
        unique_filename = "#{UUID.random}#{extension}"
        save_path = File.join(upload_dir, unique_filename)
        relative_path = File.join("uploads", "user-images", unique_filename)

        # Save the file by copying the tempfile to our target location
        File.open(save_path, "w") do |outf|
          IO.copy(uploaded_file, outf)
        end

        # Create Upload record with Sepia persistence
        upload = ToCry::Upload.new(
          original_filename: original_filename,
          file_extension: extension,
          file_size: file_size,
          upload_type: "image",
          uploaded_by: user_id,
          relative_path: relative_path,
          content_type: content_type
        )
        upload.save

        public_url = upload.public_url
      end

      ToCry::Log.info { "Image uploaded successfully: #{public_url} by user: #{user_id} (demo: #{demo_mode})" }

      {
        success: true,
        error:   "",
        upload:  {
          url:               public_url,
          upload_id:         upload.upload_id,
          original_filename: original_filename,
          file_size:         upload.file_size,
        },
      }
    rescue ex
      {
        success: false,
        error:   "Failed to create image upload: #{ex.message}",
        upload:  nil,
      }
    end
  end
end
