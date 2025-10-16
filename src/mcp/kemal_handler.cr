require "kemal"
require "./server"

class MCPHandler
  @@mcp_server = ToCryMCPServer.new

  def self.handle_post(env)
    ToCry::Log.info { "Received MCP request: #{env.request.method} #{env.request.path}" }
    @@mcp_server.handle_kemal_request(env)
  end

  def self.handle_get(env)
    ToCry::Log.info { "MCP SSE connection established" }
    @@mcp_server.handle_sse(env)
  end
end

# MCP JSON-RPC endpoint
post "/mcp" do |env|
  MCPHandler.handle_post(env)
end

# MCP Server-Sent Events endpoint
get "/mcp" do |env|
  MCPHandler.handle_get(env)
end
