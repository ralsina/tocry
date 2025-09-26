# /home/ralsina/code/tocry/src/endpoints/uploads.cr
require "kemal"
require "../tocry"
require "../upload" # Include the new Upload class
require "uuid"       # For generating unique filenames
require "file_utils" # For creating directories
require "./helpers"

module ToCry::Endpoints::Uploads
  MAX_IMAGE_SIZE = 1_048_576 # 1MB

  # API Endpoint to handle image uploads
  # Expects a multipart/form-data request with a file part.
  post "/upload/image" do |env|
    user_id = ToCry.get_current_user_id(env)

    # Ensure the user-images subdirectory exists within the uploads directory
    upload_dir = File.join(ToCry.data_directory, "uploads", "user-images")
    FileUtils.mkdir_p(upload_dir)

    # Get the first uploaded file from the request.
    uploaded_file = env.params.files.values.first?

    if uploaded_file.nil?
      raise ToCry::Endpoints::Helpers::MissingBodyError.new("No file uploaded.")
    end

    # Check if the file size exceeds the limit
    if uploaded_file.tempfile.size > MAX_IMAGE_SIZE
      next ToCry::Endpoints::Helpers.error_response(env, "Image size exceeds the 1MB limit.", 413)
    end

    # Extract file information
    original_filename = uploaded_file.filename.as(String)
    extension = File.extname(original_filename)
    content_type = uploaded_file.headers["Content-Type"]?

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
      file_size: uploaded_file.tempfile.size.to_i64,
      upload_type: "image",
      uploaded_by: user_id,
      relative_path: relative_path,
      content_type: content_type
    )
    upload.save

    # The public URL for the saved image
    public_url = upload.public_url
    ToCry::Log.info { "Image uploaded successfully: #{public_url} by user: #{user_id}" }

    # Respond with the URL and upload metadata so the frontend can use it
    ToCry::Endpoints::Helpers.created_response(env, {
      url: public_url,
      upload_id: upload.upload_id,
      original_filename: original_filename,
      file_size: upload.file_size
    })
  end
end
