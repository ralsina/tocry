# /home/ralsina/code/tocry/src/endpoints/uploads.cr
require "kemal"
require "../tocry"
require "../upload"  # Include the new Upload class
require "../demo"    # Include demo functionality
require "uuid"       # For generating unique filenames
require "file_utils" # For creating directories
require "./helpers"

module ToCry::Endpoints::Uploads
  MAX_IMAGE_SIZE = 1_048_576 # 1MB in normal mode

  # API Endpoint to handle image uploads
  # Expects a multipart/form-data request with a file part.
  post "/api/v1/upload/image" do |env|
    user_id = ToCry.get_current_user_id(env)

    # Get the first uploaded file from the request.
    uploaded_file = env.params.files.values.first?

    if uploaded_file.nil?
      raise ToCry::Endpoints::Helpers::MissingBodyError.new("No file uploaded.")
    end

    # Extract file information
    original_filename = uploaded_file.filename.as(String)
    extension = File.extname(original_filename)
    content_type = uploaded_file.headers["Content-Type"]?
    file_size = uploaded_file.tempfile.size.to_i64

    # Handle demo mode vs normal mode
    if ToCry::Demo.demo_mode?
      # Demo mode: use smaller size limit and create dummy upload
      if file_size > ToCry::Demo::MAX_UPLOAD_SIZE
        next ToCry::Endpoints::Helpers.error_response(env, "Image size exceeds the 64KB demo limit.", 413)
      end

      upload = ToCry::Demo.handle_demo_upload(
        filename: original_filename,
        content_type: content_type,
        file_size: file_size,
        uploaded_by: user_id,
        upload_type: "image"
      )

      if upload.nil?
        next ToCry::Endpoints::Helpers.error_response(env, "Demo upload failed.", 400)
      end

      # Create a dummy public URL for demo mode
      public_url = "/demo/image/#{upload.upload_id}#{extension}"
    else
      # Normal mode: full functionality
      if file_size > MAX_IMAGE_SIZE
        next ToCry::Endpoints::Helpers.error_response(env, "Image size exceeds the 1MB limit.", 413)
      end

      # Ensure the user-images subdirectory exists within the uploads directory
      upload_dir = File.join(ToCry.data_directory, "uploads", "user-images")
      FileUtils.mkdir_p(upload_dir)

      # Generate a unique filename to prevent overwrites, while keeping the original extension
      unique_filename = "#{UUID.random}#{extension}"
      save_path = File.join(upload_dir, unique_filename)
      relative_path = File.join("uploads", "user-images", unique_filename)

      # Save the file by copying the tempfile to our target location
      File.open(save_path, "w") do |outf|
        IO.copy(uploaded_file.tempfile, outf)
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

    ToCry::Log.info { "Image uploaded successfully: #{public_url} by user: #{user_id} (demo: #{ToCry::Demo.demo_mode?})" }

    # Respond with the URL and upload metadata so the frontend can use it
    ToCry::Endpoints::Helpers.created_response(env, {
      url:               public_url,
      upload_id:         upload.upload_id,
      original_filename: original_filename,
      file_size:         upload.file_size,
    })
  end

end
