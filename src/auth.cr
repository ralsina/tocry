require "kemal"
require "multi_auth"
require "./tocry"
require "./user"

# --- Configuration ---
# For a real app, load secrets from environment variables. You can get these
# by creating OAuth 2.0 Client IDs in the Google Cloud Console.
MultiAuth.config("google", ENV.fetch("GOOGLE_CLIENT_ID", "YOUR_ID"), ENV.fetch("GOOGLE_CLIENT_SECRET", "YOUR_SECRET"))

# --- Helpers ---

# Gets the currently logged-in user from the session, if any.
def current_user(env)
  if user_id = env.session.string?("user_id")
    User.find_by_id(user_id)
  else
    nil
  end
end

# Constructs a MultiAuth instance for the given provider.
def multi_auth(env)
  provider = env.params.url["provider"]
  # Dynamically construct the full redirect URI (scheme + host + path)
  # This must match what you configured in your OAuth provider (e.g., Google Cloud Console).
  scheme = Kemal.config.scheme # Corrected: Use Kemal.config.scheme
  host = env.request.headers["Host"].as(String)
  callback_path = "/auth/#{provider}/callback"
  MultiAuth.make(provider, "#{scheme}://#{host}#{callback_path}")
end

# --- Routes ---

# API Endpoint to get current user's session info.
get "/me" do |env|
  env.response.content_type = "application/json"
  if user = current_user(env)
    ToCry::Log.info { "User '#{user.name}' ('#{user.email}') requested their session info." }
    {
      logged_in: true,
      name:      user.name,
      email:     user.email,
    }.to_json
  else
    {logged_in: false}.to_json
  end
end

# OAuth initiation (e.g., /auth/github)
get "/auth/:provider" do |env| # Corrected: Top-level route definition
  env.redirect multi_auth(env).authorize_uri
end

# OAuth callback
get "/auth/:provider/callback" do |env| # Corrected: Top-level route definition
  provider = env.params.url["provider"]
  auth_user = multi_auth(env).user(env.params.query)

  # Ensure email is present, as it's crucial for user identification.
  unless email = auth_user.email
    ToCry::Log.error { "OAuth callback for provider '#{provider}' received without an email address." }
    halt env, 400, "Email address is required for authentication."
  end

  # Use a default name if not provided by the OAuth provider.
  name = auth_user.name || "Unknown User"

  # Find an existing user or create a new one.
  user = User.find_by_email(email) ||
         User.new(
           email: email,
           name: name,
           provider: provider
         ).save

  env.session.string("user_id", user.id)
  env.redirect "/"
end

# Logout
get "/logout" do |env|
  env.session.destroy

  # Directly render the "Logged Out" page.
  env.response.content_type = "text/html"
  <<-HTML
  <!DOCTYPE html>
  <html>
  <head><title>Logged Out</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css" /></head>
  <body><main class="container"><article><h1>Logged Out</h1><p>You have been successfully logged out.</p><p><a href="/auth/google" role="button">Login with Google</a></p></article></main></body>
  </html>
  HTML
end
