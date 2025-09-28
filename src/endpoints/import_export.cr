require "kemal"
require "../tocry"
require "../data_export"
require "./helpers"

module ToCry::Endpoints::ImportExport
  # Helper method to send files
  private def self.send_file(env, file_path, disposition = "inline", filename = nil)
    env.response.content_type = "application/gzip"
    env.response.headers["Content-Disposition"] = "#{disposition}; filename=\"#{filename || File.basename(file_path)}\""

    File.open(file_path, "rb") do |file|
      IO.copy(file, env.response.output)
    end
  end
  # API Endpoint to export user data
  # Exports all user data including boards, lanes, notes, and uploads as a tarball
  get "/api/export" do |env|
    user = ToCry.get_current_user_id(env)

    # Skip export in demo mode
    if ToCry::Demo.demo_mode?
      env.response.status_code = 403
      next ToCry::Endpoints::Helpers.error_response(env, "Data export not available in demo mode", 403)
    end

    # Generate export filename
    filename = ToCry::DataExport.export_filename(user)
    export_path = File.join(Dir.tempdir, filename)

    begin
      # Export the data
      success = ToCry::DataExport.export_user_data(user, export_path)

      unless success
        env.response.status_code = 500
        next ToCry::Endpoints::Helpers.error_response(env, "Failed to export data", 500)
      end

      # Send the file
      send_file env, export_path, disposition: "attachment", filename: filename

      # Clean up the temporary file after sending
      spawn do
        sleep 5.seconds # Give time for the file to be sent
        File.delete(export_path) if File.exists?(export_path)
      end
    rescue ex
      ToCry::Log.error(exception: ex) { "Export failed: #{ex.message}" }
      env.response.status_code = 500
      ToCry::Endpoints::Helpers.error_response(env, "An error occurred during export", 500)
    end
  end

  # API Endpoint to validate an import file
  # Validates that the uploaded file is a valid ToCry export
  post "/api/import/validate" do |env|
    # Just check authentication but don't use the user ID for validation

    # Skip import in demo mode
    if ToCry::Demo.demo_mode?
      env.response.status_code = 403
      next ToCry::Endpoints::Helpers.error_response(env, "Data import not available in demo mode", 403)
    end

    # Check for uploaded file
    unless env.params.files.has_key?("file")
      env.response.status_code = 400
      next ToCry::Endpoints::Helpers.error_response(env, "No file uploaded", 400)
    end

    uploaded_file = env.params.files["file"]
    temp_path = uploaded_file.tempfile.path

    begin
      # Validate the export file
      is_valid = ToCry::DataExport.validate_export_file(temp_path)

      if is_valid
        ToCry::Endpoints::Helpers.success_response(env, {valid: true, message: "Valid export file"})
      else
        ToCry::Endpoints::Helpers.success_response(env, {valid: false, message: "Invalid export file format"})
      end
    rescue ex
      ToCry::Log.error(exception: ex) { "Import validation failed: #{ex.message}" }
      env.response.status_code = 400
      ToCry::Endpoints::Helpers.error_response(env, "Failed to validate import file", 400)
    ensure
      # Clean up temporary file
      File.delete(temp_path) if File.exists?(temp_path)
    end
  end

  # API Endpoint to import user data
  # Imports data from a previously exported tarball
  post "/api/import" do |env|
    user = ToCry.get_current_user_id(env)

    # Skip import in demo mode
    if ToCry::Demo.demo_mode?
      env.response.status_code = 403
      next ToCry::Endpoints::Helpers.error_response(env, "Data import not available in demo mode", 403)
    end

    # Check for uploaded file
    unless env.params.files.has_key?("file")
      env.response.status_code = 400
      next ToCry::Endpoints::Helpers.error_response(env, "No file uploaded", 400)
    end

    uploaded_file = env.params.files["file"]
    temp_path = uploaded_file.tempfile.path

    begin
      # Validate the file first
      unless ToCry::DataExport.validate_export_file(temp_path)
        env.response.status_code = 400
        next ToCry::Endpoints::Helpers.error_response(env, "Invalid export file format", 400)
      end

      # Import the data
      success = ToCry::DataExport.import_user_data(user, temp_path)

      if success
        ToCry::Endpoints::Helpers.success_response(env, {
          success: true,
          message: "Data imported successfully",
          reload_required: true
        })
      else
        env.response.status_code = 500
        ToCry::Endpoints::Helpers.error_response(env, "Failed to import data", 500)
      end
    rescue ex
      ToCry::Log.error(exception: ex) { "Import failed: #{ex.message}" }
      env.response.status_code = 500
      ToCry::Endpoints::Helpers.error_response(env, "An error occurred during import", 500)
    ensure
      # Clean up temporary file
      File.delete(temp_path) if File.exists?(temp_path)
    end
  end
end
