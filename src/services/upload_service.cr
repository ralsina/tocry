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

    # Response struct for all upload operations
    # Provides a consistent return type with all possible fields
    struct UploadResponse
      # ameba:disable Naming/QueryBoolMethods
      property success : Bool = false
      property message : String = ""
      property url : String = ""
      property upload_id : String = ""
      property original_filename : String = ""
      property file_size : Int64 = 0

      def initialize(@success : Bool = false, @message : String = "", @url : String = "", @upload_id : String = "", @original_filename : String = "", @file_size : Int64 = 0)
      end
    end

    # Create an image upload
    def self.create_image_upload(
      original_filename : String,
      content_type : String?,
      file_size : Int64,
      user_id : String,
      uploaded_file : IO,
      demo_mode : Bool = false,
    )
      upload : ToCry::Upload?
      public_url : String

      if demo_mode
        # Demo mode: use smaller size limit and create dummy upload
        if file_size > ToCry::Demo::MAX_UPLOAD_SIZE
          return UploadResponse.new(
            success: false,
            message: "Image size exceeds the 64KB demo limit."
          )
        end

        upload = ToCry::Demo.handle_demo_upload(
          filename: original_filename,
          content_type: content_type,
          file_size: file_size,
          uploaded_by: user_id,
          upload_type: "image"
        )

        if upload.nil?
          return UploadResponse.new(
            success: false,
            message: "Demo upload failed."
          )
        end

        # Create a dummy public URL for demo mode
        extension = File.extname(original_filename)
        public_url = "/demo/image/#{upload.upload_id}#{extension}"
      else
        # Normal mode: full functionality
        if file_size > MAX_IMAGE_SIZE
          return UploadResponse.new(
            success: false,
            message: "Image size exceeds the 1MB limit."
          )
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

      if actual_upload = upload
        UploadResponse.new(
          success: true,
          message: "Image uploaded successfully",
          url: public_url,
          upload_id: actual_upload.upload_id,
          original_filename: original_filename,
          file_size: actual_upload.file_size
        )
      else
        UploadResponse.new(
          success: false,
          message: "Upload failed - no upload record created"
        )
      end
    rescue ex
      UploadResponse.new(
        success: false,
        message: "Failed to create image upload: #{ex.message}"
      )
    end
  end
end
