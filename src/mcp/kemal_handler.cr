require "kemal"
require "mcp"
require "./tocry_adapters"

# Load all MCP tools explicitly
require "./tools/list_boards_tool"
require "./tools/create_board_tool"
require "./tools/get_board_tool"
require "./tools/update_board_tool"
require "./tools/delete_board_tool"
require "./tools/create_note_tool"
require "./tools/get_note_tool"
require "./tools/update_note_tool"
require "./tools/delete_note_tool"
require "./tools/search_notes_tool"

class MCPHandler
  @@mcp_server : MCP::Server?

  def self.initialize_server
    @@mcp_server ||= MCP::Server.new(
      ToCryMCPConfig.new,
      ToCryLogProvider.new
    )
  end

  def self.handle_post(env)
    initialize_server

    # Check if MCP is enabled
    unless ToCry.mcp_enabled
      env.response.status_code = 404
      env.response.content_type = "application/json"
      env.response.print({
        "jsonrpc" => "2.0",
        "error"   => {
          "code"    => -32601,
          "message" => "MCP support is disabled",
        },
        "id" => nil,
      }.to_json)
      return
    end

    ToCry::Log.info { "Received MCP request: #{env.request.method} #{env.request.path}" }

    # Get authenticated user from ToCry's authentication system
    user_id = ToCry.get_current_user_id(env)
    ToCry::Log.info { "MCP request from authenticated user: #{user_id}" }

    # Handle the request with our new server
    mcp_server = @@mcp_server.as(MCP::Server)
    response = mcp_server.handle_request(env, user_id)

    env.response.content_type = "application/json"
    env.response.print response
  end

  def self.handle_get(env)
    initialize_server

    # Check if MCP is enabled
    unless ToCry.mcp_enabled
      env.response.status_code = 404
      env.response.content_type = "text/plain"
      env.response.print "MCP support is disabled"
      return
    end

    ToCry::Log.info { "MCP SSE connection established" }

    # Get authenticated user from ToCry's authentication system
    user_id = ToCry.get_current_user_id(env)
    ToCry::Log.info { "MCP SSE connection from authenticated user: #{user_id}" }

    # Handle SSE with our new server
    mcp_server = @@mcp_server.as(MCP::Server)
    mcp_server.handle_sse(env, user_id)
  end
end

# MCP JSON-RPC endpoint - protected by ToCry's authentication middleware
post "/mcp" do |env|
  MCPHandler.handle_post(env)
end

# MCP Server-Sent Events endpoint - protected by ToCry's authentication middleware
get "/mcp" do |env|
  MCPHandler.handle_get(env)
end
