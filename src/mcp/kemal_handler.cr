require "kemal"
require "./server"

class MCPHandler
  @@mcp_server = ToCryMCPServer.new

  def self.handle_post(env)
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
    response = @@mcp_server.handle_request(env, user_id)

    env.response.content_type = "application/json"
    env.response.print response
  end

  def self.handle_get(env)
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
    @@mcp_server.handle_sse(env, user_id)
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
