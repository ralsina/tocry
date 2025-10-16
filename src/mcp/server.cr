require "kemal"
require "model_context_protocol"
require "./tools/answer_to_life_tool"
require "./tools/list_boards_tool"
require "./tools/get_board_tool"
require "./tools/search_notes_tool"
require "./tools/create_note_tool"
require "./tools/update_note_tool"
require "./tools/get_note_tool"

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

    # Register all ToCry MCP tools
    register_tool(AnswerToLifeTool.new)
    register_tool(ListBoardsTool.new)
    register_tool(GetBoardTool.new)
    register_tool(SearchNotesTool.new)
    register_tool(CreateNoteTool.new)
    register_tool(UpdateNoteTool.new)
    register_tool(GetNoteTool.new)
  end

  # Handle MCP JSON-RPC requests through Kemal
  def handle_kemal_request(env, user_id : String)
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

      # Process the request using the MCP server logic with authenticated user
      response = handle_request_with_user(mcp_request, user_id)

      # Send the response
      env.response.content_type = "application/json"
      env.response.print response.to_json

    rescue ex
      ToCry::Log.error(exception: ex) { "Error handling MCP request: #{ex.message}" }
      env.response.status_code = 500
      env.response.content_type = "application/json"

      # Build error response as JSON::Any
      error_data = {
        "jsonrpc" => JSON::Any.new("2.0"),
        "error" => JSON::Any.new({
          "code" => JSON::Any.new(-32603),
          "message" => JSON::Any.new("Internal error: #{ex.message}")
        } of String => JSON::Any)
      } of String => JSON::Any

      # Add id if it exists in the request
      if json_request && (request_id = json_request["id"]?)
        error_data["id"] = request_id
      end

      env.response.print(error_data.to_json)
    end
  end

  # Handle Server-Sent Events for real-time communication
  def handle_sse(env, user_id : String)
    env.response.headers["Content-Type"] = "text/event-stream"
    env.response.headers["Cache-Control"] = "no-cache"
    env.response.headers["Connection"] = "keep-alive"

    # Send initial connection event with user info
    env.response.puts("event: connected")
    env.response.puts("data: {\"message\": \"Connected to ToCry MCP server as user: #{user_id}\"}")
    env.response.puts

    # For now, just keep the connection open
    # In the future, this could be used for real-time updates
  rescue ex
    ToCry::Log.error(exception: ex) { "Error in SSE connection: #{ex.message}" }
  end

  # Override handle_request to pass authenticated user_id to tools
  private def handle_request_with_user(request : ModelContextProtocol::Messages::Request, user_id : String) : ModelContextProtocol::Messages::Response
    case request.method
    when "initialize"
      handle_initialize(request)
    when "tools/list"
      handle_list_tools(request)
    when "tools/invoke"
      handle_invoke_tool_with_user(request, user_id)
    else
      ModelContextProtocol::Messages::Response.new(
        request.id,
        error: ModelContextProtocol::Messages::Error.new(
          ModelContextProtocol::Messages::ErrorCodes::METHOD_NOT_FOUND,
          "Method not found: #{request.method}"
        )
      )
    end
  rescue ex : Exception
    ModelContextProtocol::Messages::Response.new(
      request.id,
      error: ModelContextProtocol::Messages::Error.new(
        ModelContextProtocol::Messages::ErrorCodes::INTERNAL_ERROR,
        "Internal error: #{ex.message}"
      )
    )
  end

  # Override handle_invoke_tool to pass user_id to tools
  private def handle_invoke_tool_with_user(request : ModelContextProtocol::Messages::Request, user_id : String) : ModelContextProtocol::Messages::Response
    params = request.params
    raise "Missing parameters" unless params

    tool_name = params["name"]?.try(&.as_s)
    raise "Missing tool name" unless tool_name

    tool = @tools[tool_name]?
    raise "Tool not found: #{tool_name}" unless tool

    tool_params = params["params"]?.try(&.as_h) || {} of String => JSON::Any

    # Check if this is one of our authenticated tools
    case tool_name
    when "answer_to_life"
      result = tool.as(AnswerToLifeTool).invoke_with_user(tool_params, user_id)
    when "tocry_list_boards"
      result = tool.as(ListBoardsTool).invoke_with_user(tool_params, user_id)
    when "tocry_get_board"
      result = tool.as(GetBoardTool).invoke_with_user(tool_params, user_id)
    when "tocry_search_notes"
      result = tool.as(SearchNotesTool).invoke_with_user(tool_params, user_id)
    when "tocry_create_note"
      result = tool.as(CreateNoteTool).invoke_with_user(tool_params, user_id)
    when "tocry_update_note"
      result = tool.as(UpdateNoteTool).invoke_with_user(tool_params, user_id)
    when "tocry_get_note"
      result = tool.as(GetNoteTool).invoke_with_user(tool_params, user_id)
    else
      # Fallback for tools that don't support authentication (like example tools)
      result = tool.invoke(tool_params)
    end

    ModelContextProtocol::Messages::Response.new(request.id, result: result)
  rescue ex : ModelContextProtocol::Server::ToolError
    ModelContextProtocol::Messages::Response.new(
      request.id,
      error: ModelContextProtocol::Messages::Error.new(
        ModelContextProtocol::Messages::ErrorCodes::INVALID_PARAMS,
        ex.message || "Tool error"
      )
    )
  rescue ex : Exception
    ModelContextProtocol::Messages::Response.new(
      request.id,
      error: ModelContextProtocol::Messages::Error.new(
        ModelContextProtocol::Messages::ErrorCodes::INTERNAL_ERROR,
        "Internal error: #{ex.message}"
      )
    )
  end
end
