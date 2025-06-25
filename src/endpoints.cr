require "kemal"
require "./tocry"
require "uuid"
require "file_utils"
require "uri"

# Import the refactored endpoint modules
require "./endpoints/helpers"
require "./endpoints/boards"
require "./endpoints/lanes"
require "./endpoints/notes"
require "./endpoints/uploads"

# Global error handler for missing request bodies or invalid JSON.
error ToCry::Endpoints::Helpers::MissingBodyError | JSON::ParseException do |env, ex|
  env.response.status_code = 400 # Bad Request
  env.response.content_type = "application/json"
  {error: ex.message}.to_json
end

# Global error handler for any other unhandled exceptions.
error Exception do |env, ex|     # Removed begin/end block as it's not needed here
  env.response.status_code = 500 # Internal Server Error
  ToCry::Log.error(exception: ex) { "An unexpected error occurred: #{ex.message}" }
  env.response.content_type = "application/json"
  {error: "An unexpected error occurred."}.to_json
end

error 404 do |env|
  env.response.status_code = 404
  env.response.content_type = "text/html"
  render "templates/404.ecr"
end
