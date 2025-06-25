require "kemal"
require "kemal-basic-auth" # For basic_auth helper
require "./auth"           # For current_user helper
require "./tocry"          # For ToCry::Log

# Function to set up Google Auth mode
# This function defines Kemal routes and filters specific to Google OAuth.
def setup_google_auth_mode
  ToCry::Log.info { "Authentication Mode: Google OAuth" }
  ToCry::Log.info { "Google Authentication enabled." }

  # Global protection for all routes when Google Auth is enabled.
  before_all "/*" do |env|
    # Exclude specific public routes from authentication check.
    # These routes are handled by their own specific definitions.
    # Use regex for paths with parameters.
    case env.request.path
    when "/", "/me", "/logout"
      # Exact matches
      next
    when %r{^/auth/[^/]+$}, %r{^/auth/[^/]+/callback$} # Matches /auth/:provider and /auth/:provider/callback
      # Allow these paths to proceed without authentication check here.
      next
    when %r{/user-images/.*} # Allow access to user-uploaded images
      next
    else
      # For all other routes, check authentication.
      unless current_user(env)
        halt env, 403, LOGIN_REQUIRED_PAGE_HTML
      end
    end
    # If current_user(env) is true, or if it's an excluded path, the request proceeds.
  end
end

# Function to set up Basic Auth mode
# This function defines Kemal routes and filters specific to Basic Authentication.
def setup_basic_auth_mode
  ToCry::Log.info { "Authentication Mode: Basic Auth" }
  auth_user = ENV["TOCRY_AUTH_USER"].as(String)
  auth_pass = ENV["TOCRY_AUTH_PASS"].as(String)

  if auth_user.empty? || auth_pass.empty?
    ToCry::Log.fatal { "Basic Authentication misconfigured: TOCRY_AUTH_USER and TOCRY_AUTH_PASS must not be empty." }
    exit 1
  end

  ToCry::Log.info { "Basic Authentication enabled. User: #{auth_user}" }
  basic_auth auth_user, auth_pass # This applies a global filter from kemal-basic-auth
end

# Function to set up No Auth mode
# This function defines Kemal routes and filters for when no authentication is enabled.
def setup_no_auth_mode
  ToCry::Log.info { "Authentication Mode: No Auth" }
  ToCry::Log.warn { "No Authentication is ENABLED. To enable, set TOCRY_AUTH_USER/TOCRY_AUTH_PASS or GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET environment variables." }
end
