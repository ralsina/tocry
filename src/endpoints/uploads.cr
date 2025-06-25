# /home/ralsina/code/tocry/src/endpoints/uploads.cr
require "kemal"
require "../tocry"
require "uuid"       # For generating unique filenames
require "file_utils" # For creating directories
require "./helpers"

module ToCry::Endpoints::Uploads
  MAX_IMAGE_SIZE = 1_048_576 # 1MB

  # API Endpoint to handle image uploads
  # Expects a multipart/form-data request with a file part.
  post "/upload/image" do |env|
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
      env.response.status_code = 413 # Payload Too Large
      env.response.content_type = "application/json"
      next {error: "Image size exceeds the 1MB limit."}.to_json
    end

    # Generate a unique filename to prevent overwrites, while keeping the original extension
    extension = File.extname(uploaded_file.filename.as(String))
    unique_filename = "#{UUID.random}#{extension}"
    save_path = File.join(upload_dir, unique_filename)

    # Save the file by copying the tempfile to our target location
    File.open(save_path, "w") do |outf|
      IO.copy(uploaded_file.tempfile, outf)
    end

    # The public URL for the saved image
    public_url = "/user-images/#{unique_filename}"
    ToCry::Log.info { "Image uploaded successfully: #{public_url}" }

    # Respond with the URL so the frontend can use it
    env.response.status_code = 201 # Created
    env.response.content_type = "application/json"
    {url: public_url}.to_json
  end
end
