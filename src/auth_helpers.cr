require "kemal"
require "kemal-basic-auth" # For basic_auth helper
require "./auth"           # For current_user helper
require "./tocry"          # For ToCry::Log

def check_access(env)
  # Exclude specific public routes from authentication check.
  # These routes are handled by their own specific definitions or are public.
  # Use regex for paths with parameters.
  case env.request.path
  when "/me", "/logout"
    # Exact matches
  when %r{^/auth/[^/]+$}, %r{^/auth/[^/]+/callback$} # Matches /auth/:provider and /auth/:provider/callback
    # Allow these paths to proceed without authentication check here.
  when %r{/user-images/.*} # Allow access to user-uploaded images
  else
    # For all other routes, check authentication.
    unless current_user(env)
      env.response.status_code = 403
    end
  end
  # If current_user(env) is true, or if it's an excluded path, the request proceeds.
end

# Function to set up Google Auth mode
# This function defines Kemal routes and filters specific to Google OAuth.
def setup_google_auth_mode
  fake_user_email = ENV["TOCRY_FAKE_AUTH_USER"]
  if fake_user_email && !fake_user_email.to_s.empty?
    ToCry::Log.warn { "Google Authentication running in fake mode for user: #{fake_user_email}" }
    before_all do |env|
      unless current_user(env)
        user = User.find_by_email(fake_user_email) ||
               User.new(
                 email: fake_user_email,
                 name: "Fake User",
                 provider: "fake_google"
               ).save
        env.session.string("user_id", user.id)
        ToCry::Log.info { "Fake user session created for #{fake_user_email}" }
      end
    end
    return
  end
  ToCry::Log.info { "Authentication Mode: Google OAuth" }
  ToCry::Log.info { "Google Authentication enabled." }

  # Global protection for all routes when Google Auth is enabled.
  before_all do |env|
    check_access(env)
  end

  # This is a special case for / which sometimes is accessed as ""
  # and not matched by the above rule.
  before_all "" do |env|
    check_access(env)
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
