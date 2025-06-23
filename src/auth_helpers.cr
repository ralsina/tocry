require "kemal"
require "kemal-basic-auth" # For basic_auth helper
require "./auth"           # For current_user helper
require "./tocry"          # For ToCry::Log

# Function to set up Google Auth mode
# This function defines Kemal routes and filters specific to Google OAuth.
def setup_google_auth_mode
  ToCry::Log.info { "Authentication Mode: Google OAuth" }
  ToCry::Log.info { "Google Authentication enabled." }

  # Root URL for Google Auth mode
  get "/" do |env|
    if current_user(env)
      # If user is logged in, redirect to the default board.
      env.redirect "/b/default"
    else
      # If not logged in, show a simple login page.
      env.response.content_type = "text/html"
      <<-HTML
      <!DOCTYPE html>
      <html>
      <head><title>Login</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css" /></head>
      <body><main class="container"><article><h1>Welcome to ToCry</h1><p>Please log in to continue.</p><p><a href="/auth/google" role="button">Login with Google</a></p></article></main></body>
      </html>
      HTML
    end
  end

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
        # Check if it's an API request (e.g., Accept: application/json).
        # This is a heuristic; a more robust API might use a specific header or path prefix.
        if env.request.headers["Accept"]?.try &.includes?("application/json")
          env.response.status_code = 401
          env.response.content_type = "application/json"
          env.response.print({error: "Unauthorized"}.to_json)
          halt env
        else
          # It's likely an HTML page request, redirect to the root login page.
          env.redirect "/"
        end
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

  # Root URL for Basic Auth mode
  get "/" do |env| # Redirect to the default board.
    env.redirect "/b/default"
  end
end

# Function to set up No Auth mode
# This function defines Kemal routes and filters for when no authentication is enabled.
def setup_no_auth_mode
  ToCry::Log.info { "Authentication Mode: No Auth" }
  ToCry::Log.warn { "No Authentication is ENABLED. To enable, set TOCRY_AUTH_USER/TOCRY_AUTH_PASS or GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET environment variables." }

  # Root URL for No Auth mode: Redirect to default board directly
  get "/" do |env| # This route is still needed for the redirect.
    env.redirect "/b/default"
  end
end
