require "./tocry"
require "./endpoints" # Add this line to include your new endpoints file
require "baked_file_handler"
require "./migrations"
require "baked_file_system"
require "docopt"
require "kemal-basic-auth"
require "kemal"

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

  # Port and binding address are important
  port = args["--port"].as(String).to_i32
  bind_address = args["--bind"].as(String)

  # Log at debug level. Probably worth making it configurable.

  Log.setup(:debug) # Or use Log.setup_from_env for more flexibility
  ToCry::Log.info { "Starting ToCry server on #{bind_address}:#{port}" }
  # Start kemal listening on the right address

  # Run any pending data migrations before loading the board.
  ToCry::Migration.run

  # Load the board state from the file system on startup
  ToCry::BOARD.load

  Kemal.config.host_binding = bind_address

  # Read credentials and realm from environment variables
  auth_user = ENV["TOCRY_AUTH_USER"]?
  auth_pass = ENV["TOCRY_AUTH_PASS"]?

  # Both username and password are set, enable basic authentication
  if auth_user && auth_pass
    ToCry::Log.info { "Basic Authentication enabled. User: #{auth_user}" }
    basic_auth auth_user.as(String), auth_pass.as(String)
  elsif auth_user || auth_pass
    # Only one of the credentials was set - this is a misconfiguration.
    # Exit with an error code to prevent running in an insecure state.
    ToCry::Log.fatal { "Basic Authentication misconfigured: Both TOCRY_AUTH_USER and TOCRY_AUTH_PASS must be set if authentication is intended." }
    exit 1
  else
    # Neither username nor password are set, run without authentication.
    ToCry::Log.warn { "Basic Authentication is DISABLED. To enable, set TOCRY_AUTH_USER and TOCRY_AUTH_PASS environment variables." }
  end
  baked_asset_handler = BakedFileHandler::BakedFileHandler.new(Assets)
  add_handler baked_asset_handler
  Kemal.run(port: port)
end

main()
