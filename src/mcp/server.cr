require "kemal"
require "model_context_protocol"
require "./tools/answer_to_life_tool"

# Custom transport that works with Kemal integration
class KemalMCPTransport < ModelContextProtocol::Transport::Base
  def initialize
    @request_handlers = [] of ModelContextProtocol::Messages::Request -> ModelContextProtocol::Messages::Response
    @notification_handlers = [] of ModelContextProtocol::Messages::Notification -> Nil
  end

  def send_request(request : ModelContextProtocol::Messages::Request) : ModelContextProtocol::Messages::Response
    # For our integration, we handle requests directly through Kemal
    # This method won't be called in server mode
    raise "Not implemented for Kemal integration"
  end

  def send_notification(notification : ModelContextProtocol::Messages::Notification) : Nil
    # For our integration, we handle notifications directly through Kemal
    # This method won't be called in server mode
    raise "Not implemented for Kemal integration"
  end

  def on_request(&block : ModelContextProtocol::Messages::Request -> ModelContextProtocol::Messages::Response)
    @request_handlers << block
  end

  def on_notification(&block : ModelContextProtocol::Messages::Notification -> Nil)
    @notification_handlers << block
  end

  def close : Nil
    # No connections to close in Kemal integration
  end
end

class ToCryMCPServer < ModelContextProtocol::Server::Server
  def initialize
    transport = KemalMCPTransport.new
    super(transport)

    # Register our simple test tool
    register_tool(AnswerToLifeTool.new)
  end

  # Handle MCP JSON-RPC requests through Kemal
  def handle_kemal_request(env)
    begin
      # Get the JSON-RPC request body
      request_body = env.request.body.not_nil!

      # Parse the JSON-RPC request
      json_request = JSON.parse(request_body)

      # Create MCP Request object from JSON
      method = json_request["method"]?.try(&.as_s) || ""

      # Convert id to correct type (Int64 | String)
      id_value = if raw_id = json_request["id"]?
                   if raw_id.as_i?
                     raw_id.as_i64
                   elsif raw_id.as_s?
                     raw_id.as_s
                   else
                     raise "Invalid id type"
                   end
                 else
                   raise "Missing id field"
                 end

      params = json_request["params"]?.try(&.as_h)

      mcp_request = ModelContextProtocol::Messages::Request.new(
        id: id_value,
        method: method,
        params: params
      )

      # Process the request using the MCP server logic
      response = handle_request(mcp_request)

      # Send the response
      env.response.content_type = "application/json"
      env.response.print response.to_json

    rescue ex
      ToCry::Log.error(exception: ex) { "Error handling MCP request: #{ex.message}" }
      env.response.status_code = 500
      env.response.content_type = "application/json"
      env.response.print({
        "jsonrpc" => "2.0",
        "error" => {
          "code" => -32603,
          "message" => "Internal error: #{ex.message}"
        },
        "id" => nil
      }.to_json)
    end
  end

  # Handle Server-Sent Events for real-time communication
  def handle_sse(env)
    env.response.headers["Content-Type"] = "text/event-stream"
    env.response.headers["Cache-Control"] = "no-cache"
    env.response.headers["Connection"] = "keep-alive"

    # Send initial connection event
    env.response.puts("event: connected")
    env.response.puts("data: {\"message\": \"Connected to ToCry MCP server\"}")
    env.response.puts

    # For now, just keep the connection open
    # In the future, this could be used for real-time updates
  rescue ex
    ToCry::Log.error(exception: ex) { "Error in SSE connection: #{ex.message}" }
  end
end
