require "kemal"
require "./tocry"
require "ecr"

# Import the refactored endpoint modules
require "./endpoints/*"

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

# Global error handler for 403 Forbidden.
error 403 do |env|
  env.response.status_code = 403
  env.response.content_type = "text/html"
  ECR.render "templates/403.ecr"
end

error 404 do |env|
  env.response.status_code = 404
  env.response.content_type = "text/html"
  ECR.render "templates/404.ecr"
end
