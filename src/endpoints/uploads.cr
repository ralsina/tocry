# /home/ralsina/code/tocry/src/endpoints/uploads.cr
require "kemal"
require "../tocry"
require "../upload" # Include the new Upload class
require "../demo"   # Include demo functionality
require "./helpers"
require "../services/upload_service"

module ToCry::Endpoints::Uploads
  # API Endpoint to handle image uploads
  # Expects a multipart/form-data request with a file part.
  post "/api/v1/upload/image" do |env|
    begin
      user_id = ToCry.get_current_user_id(env)

      # Get the first uploaded file from the request.
      uploaded_file = env.params.files.values.first?

      if uploaded_file.nil?
        raise ToCry::Endpoints::Helpers::MissingBodyError.new("No file uploaded.")
      end

      # Extract file information
      original_filename = uploaded_file.filename.as(String)
      content_type = uploaded_file.headers["Content-Type"]?
      file_size = uploaded_file.tempfile.size.to_i64

      # Use UploadService to handle the upload (handles all business logic)
      result = ToCry::Services::UploadService.create_image_upload(
        original_filename: original_filename,
        content_type: content_type,
        file_size: file_size,
        user_id: user_id,
        uploaded_file: uploaded_file.tempfile,
        demo_mode: ToCry::Demo.demo_mode?
      )

      if result.success
        upload_data = {
          url:               result.url,
          upload_id:         result.upload_id,
          original_filename: result.original_filename,
          file_size:         result.file_size,
        }
        ToCry::Endpoints::Helpers.created_response(env, upload_data)
      else
        ToCry::Endpoints::Helpers.error_response(env, result.message, 400)
      end
    rescue ex
      ToCry::Log.error(exception: ex) { "Error uploading image" }
      ToCry::Endpoints::Helpers.error_response(env, "Failed to upload image", 500)
    end
  end
end
