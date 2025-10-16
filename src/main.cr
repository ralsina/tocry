require "./initialization" # Import the initialization helper - API testing
require "./tocry"
require "baked_file_handler"
require "./migrations"
require "ecr" # Required for render
require "baked_file_system"
require "docopt"              # Keep docopt
require "./auth"              # Add auth (defines Google OAuth routes and current_user helper)
require "./endpoints"         # Add this line to include your new endpoints file
require "./auth_helpers"      # New: Contains authentication mode setup functions
require "./demo"              # Demo mode functionality
require "./websocket_handler" # WebSocket support for real-time synchronization
require "./mcp/kemal_handler" # MCP (Model Context Protocol) integration
require "kemal-basic-auth"
require "kemal"
require "kemal-session"
require "sepia"

DOC = <<-DOCOPT
ToCry, a list of things To Do. Or Cry.

Usage:
  tocry [options]
  tocry (-h | --help)
  tocry --version

Options:
  -p PORT, --port=PORT          Port to listen on [default: 3000].
  -b ADDRESS, --bind=ADDRESS    Address to bind to [default: 127.0.0.1].
  -h --help                     Show this screen.
  --version                     Show version.
  --data-path=PATH              Path to the data directory.
  --safe-mode                   Enable safe mode (checks data integrity).
  --demo                        Enable demo mode (in-memory storage with sample data).
  --no-mcp                      Disable MCP (Model Context Protocol) support.
  --unix-socket=PATH            Use Unix socket at specified path instead of TCP.
DOCOPT

class Assets
  extend BakedFileSystem
  # Bake assets directly from source (no minification for easier debugging)
  bake_folder "./assets"
end

# This `main()`function is called from the top-level so it's code that
# always gets executed.

def main
  # We parse the command line (`ARGV`) using the help we described above.

  args = Docopt.docopt(DOC, ARGV, version: ToCry::VERSION)
  ARGV.clear # Clear ARGV to prevent further processing by Crystal

  # Determine data path
  data_path = args["--data-path"]?.as?(String)
  if data_path.nil?
    # If no explicit data path provided, use user directory for non-root users
    # Check if we're root by checking if USER environment variable is "root"
    current_user = ENV["USER"]?
    if current_user == "root"
      data_path = "data"
    else
      # Use ~/.local/share/tocry for non-root users
      home_dir = ENV["HOME"]? || Dir.current
      data_path = File.join(home_dir, ".local", "share", "tocry")
    end
  end
  safe_mode = !!args["--safe-mode"] # Safely parse --safe-mode argument as boolean
  demo_mode = !!args["--demo"]      # Parse --demo argument as boolean
  disable_mcp = !!args["--no-mcp"]  # Parse --no-mcp argument as boolean

  # Initialize data environment using the helper
  ToCry.board_manager = ToCry::Initialization.setup_data_environment(data_path, safe_mode, true, demo_mode)

  if demo_mode
    ToCry::Log.info { "Demo mode enabled: using in-memory storage with sample data" }
  else
    ToCry::Log.info { "Using data path: #{data_path}" }
  end
  ToCry::Log.info { "Safe mode enabled: #{safe_mode}" }

  # Set global MCP status and log
  ToCry.mcp_enabled = !disable_mcp
  if disable_mcp
    ToCry::Log.info { "MCP (Model Context Protocol) support disabled" }
  else
    ToCry::Log.info { "MCP (Model Context Protocol) support enabled" }
  end

  # Check for Unix socket option first
  unix_socket_path = args["--unix-socket"]?.as?(String)

  if unix_socket_path
    # Unix socket mode - ignore port and bind address
    ToCry::Log.info { "Using Unix socket: #{unix_socket_path}" }
    port = 0          # Not used in Unix socket mode
    bind_address = "" # Not used in Unix socket mode
  else
    # TCP mode - parse port and bind address
    port = args["--port"].as(String).to_i32
    bind_address = args["--bind"].as(String)
    ToCry::Log.info { "Using TCP: #{bind_address}:#{port}" }
  end

  # Add a handler to serve user-uploaded images from the configured data path.
  # This replaces the `public_folder` macro.
  # Skip this in demo mode since we don't store actual files
  unless ToCry::Demo.demo_mode?
    uploads_path = File.join(data_path, "uploads")
    add_handler Kemal::StaticFileHandler.new(uploads_path)
    # Ensure the uploads directory exists to prevent issues.
    unless Dir.exists?(uploads_path)
      ToCry::Log.warn { "Uploads directory not found at '#{uploads_path}'. Creating it now." }
      FileUtils.mkdir_p(uploads_path)
    end

    # Ensure attachments base directory exists
    attachments_path = File.join(data_path, "uploads", "attachments")
    unless Dir.exists?(attachments_path)
      ToCry::Log.info { "Creating attachments directory at '#{attachments_path}'" }
      FileUtils.mkdir_p(attachments_path)
    end
  end

  # Log at debug level. Probably worth making it configurable.

  Log.setup(:debug) # Or use Log.setup_from_env for more flexibility
  ToCry::Log.info { "Starting ToCry server on #{bind_address}:#{port}" }
  # Start kemal listening on the right address

  # Enable gzip compression for all responses
  # This significantly reduces bandwidth usage for text-based content (HTML, CSS, JS, JSON)
  # Kemal automatically compresses responses > 860 bytes when client accepts gzip encoding
  gzip true

  # On every request, ensure the current user's data directory exists.
  before_all do |env|
    ToCry.ensure_user_directory_exists(env)
  end

  # Determine authentication mode based on environment variables
  use_google_auth = ENV["GOOGLE_CLIENT_ID"]? && ENV["GOOGLE_CLIENT_SECRET"]?
  use_basic_auth = ENV["TOCRY_AUTH_USER"]? && ENV["TOCRY_AUTH_PASS"]?

  Kemal.config.host_binding = bind_address

  # Configure sessions using the kemal-session shard.
  # A session secret is always required if sessions are used anywhere in the application.
  Kemal::Session.config do |config|
    config.samesite = HTTP::Cookie::SameSite::Strict
    config.cookie_name = "session_id"
    config.secret = ENV.fetch("SESSION_SECRET", "a_very_long_and_secret_key_that_should_be_changed")
    config.engine = Kemal::Session::MemoryEngine.new
  end
  ToCry::Log.info { "Session support enabled." }

  if use_google_auth
    setup_google_auth_mode
  elsif use_basic_auth
    setup_basic_auth_mode
  else # No Auth
    setup_no_auth_mode
  end

  # Serve OpenAPI spec statically
  get "/api/openapi.json" do |env|
    env.response.content_type = "application/json"
    File.read("openapi.json")
  end

  # Serve OpenAPI docs using Scalar
  get "/api/docs" do |env|
    env.response.content_type = "text/html"
    <<-HTML
    <!DOCTYPE html>
    <html>
    <head>
      <title>ToCry API Documentation</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body>
      <script
        id="api-reference"
        data-url="/api/openapi.json">
      </script>
      <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
    </body>
    </html>
    HTML
  end

  # Serve the main application HTML for the root path
  get "/" do |_|
    # Default to reactive UI
    render "templates/app.ecr"
  end

  # Demo mode: serve placeholder images for demo uploads
  get "/demo/image/:upload_id" do |env|
    upload_id = env.params.url["upload_id"]

    # Only serve demo images if we're actually in demo mode
    unless ToCry::Demo.demo_mode?
      next env.response.status = HTTP::Status::NOT_FOUND
    end

    # Create a simple placeholder image (SVG)
    placeholder_svg = <<-SVG
    <svg width="200" height="150" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="150" fill="#e0e0e0" stroke="#ccc" stroke-width="2"/>
      <text x="100" y="75" text-anchor="middle" font-family="Arial" font-size="14" fill="#666">Demo Image</text>
      <text x="100" y="95" text-anchor="middle" font-family="Arial" font-size="10" fill="#999">#{upload_id[0..7]}...</text>
    </svg>
    SVG

    env.response.content_type = "image/svg+xml"
    env.response.headers["Cache-Control"] = "public, max-age=3600"
    placeholder_svg
  end

  # WebSocket endpoint for real-time board synchronization
  # Usage: /ws?board=board-name
  ws "/ws" do |socket, env|
    ToCry::WebSocketHandler.handle_websocket(socket, env)
  end

  baked_asset_handler = BakedFileHandler::BakedFileHandler.new(Assets)
  add_handler baked_asset_handler

  # Configure server based on socket type
  if unix_socket_path
    # Remove existing socket file if it exists
    File.delete(unix_socket_path) if File.exists?(unix_socket_path)

    ToCry::Log.info { "Starting ToCry server on Unix socket #{unix_socket_path}" }

    # Use Kemal's built-in Unix socket support
    Kemal.run do |config|
      # Don't bind to TCP port when using Unix socket
      config.port = 0
      if server = config.server
        server.bind_unix(unix_socket_path)
      else
        ToCry::Log.error { "Failed to get server instance for Unix socket binding" }
      end
    end
  else
    # Use standard TCP server
    Kemal.run(port: port)
  end
end

main()
