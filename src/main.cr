require "./tocry"
require "baked_file_handler"
require "./migrations"
require "ecr" # Required for render
require "baked_file_system"
require "docopt"         # Keep docopt
require "./auth"         # Add auth (defines Google OAuth routes and current_user helper)
require "./endpoints"    # Add this line to include your new endpoints file
require "./auth_helpers" # New: Contains authentication mode setup functions
require "kemal-basic-auth"
require "kemal"
require "kemal-session"

DOC = <<-DOCOPT
ToCry, a list of things To Do. Or Cry.

Usage:
  tocry [options]
  tocry (-h | --help)
  tocry [--data-path=PATH]
  tocry --version

Options:
  -p PORT, --port=PORT          Port to listen on [default: 3000].
  -b ADDRESS, --bind=ADDRESS    Address to bind to [default: 127.0.0.1].
  -h --help                     Show this screen.
  --version                     Show version.
  --data-path=PATH              Path to the data directory [default: data].
DOCOPT

class Assets
  extend BakedFileSystem
  bake_folder "./assets"
end

# This `main()`function is called from the top-level so it's code that
# always gets executed.

def main
  # We parse the command line (`ARGV`) using the help we described above.

  args = Docopt.docopt(DOC, ARGV, version: ToCry::VERSION)
  ARGV.clear                                            # Clear ARGV to prevent further processing by Crystal
  data_path = args["--data-path"]?.as(String) || "data" # Default to "data"
  ToCry::Log.info { "Using data path: #{data_path}" }

  # Port and binding address are important
  port = args["--port"].as(String).to_i32
  bind_address = args["--bind"].as(String)

  # Configure the global data directory for the ToCry application
  ToCry.data_directory = data_path

  # Add a handler to serve user-uploaded images from the configured data path.
  # This replaces the `public_folder` macro.
  uploads_path = File.join(data_path, "uploads")
  add_handler Kemal::StaticFileHandler.new(uploads_path)
  # Ensure the uploads directory exists to prevent issues.
  unless Dir.exists?(uploads_path)
    ToCry::Log.warn { "Uploads directory not found at '#{uploads_path}'. Creating it now." }
    FileUtils.mkdir_p(uploads_path)
  end

  # Log at debug level. Probably worth making it configurable.

  Log.setup(:debug) # Or use Log.setup_from_env for more flexibility
  ToCry::Log.info { "Starting ToCry server on #{bind_address}:#{port}" }
  # Start kemal listening on the right address

  # Run any pending data migrations before loading the board.
  ToCry::Migration.run

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

  # Serve the main application HTML for the root path
  get "/" do |env|
    # Get the current user
    user = ToCry.get_current_user_id(env)
    pp! user

    # List boards for the current user
    boards = ToCry.board_manager.list(user)

    # If there's exactly one board, redirect to it
    case boards.size
    when 0
      render "templates/app.ecr"
    when 1
      env.redirect "/b/#{boards.first}"
    else
      render "templates/board_selection.ecr"
    end
  end

  baked_asset_handler = BakedFileHandler::BakedFileHandler.new(Assets)
  add_handler baked_asset_handler

  Kemal.run(port: port)
end

main()
