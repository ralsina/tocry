require "kemal"
require "json"
require "./tool"
require "./tools/answer_to_life_tool"
require "./tools/list_boards_tool"
require "./tools/get_board_tool"
require "./tools/search_notes_tool"
require "./tools/create_note_tool"
require "./tools/update_note_tool"
require "./tools/get_note_tool"

# Lightweight MCP 2024-11-05 Server Implementation
class ToCryMCPServer
  def initialize
    # Register all ToCry MCP tools
    @tools = {} of String => Tool

    @tools["answer_to_life"] = AnswerToLifeTool.new
    @tools["tocry_list_boards"] = ListBoardsTool.new
    @tools["tocry_get_board"] = GetBoardTool.new
    @tools["tocry_search_notes"] = SearchNotesTool.new
    @tools["tocry_create_note"] = CreateNoteTool.new
    @tools["tocry_update_note"] = UpdateNoteTool.new
    @tools["tocry_get_note"] = GetNoteTool.new
  end

  # Handle MCP JSON-RPC requests via Kemal
  def handle_request(env, user_id : String)
    # Parse JSON-RPC request
    request_body = env.request.body || raise "Missing request body"
    json_request = JSON.parse(request_body)
    request_id = json_request["id"]?

    ToCry::Log.info { "MCP Request: #{json_request}" }

    # Validate JSON-RPC 2.0 format
    unless json_request["jsonrpc"]? == "2.0"
      return send_error(-32600, "Invalid Request", request_id)
    end

    method = json_request["method"]?.try(&.as_s)
    id = json_request["id"]?
    params = json_request["params"]?.try(&.as_h) || {} of String => JSON::Any

    case method
    when "initialize"
      handle_initialize(params, id)
    when "tools/list"
      handle_tools_list(params, id)
    when "tools/call"
      handle_tools_call(params, id, user_id)
    else
      send_error(-32601, "Method not found: #{method}", id)
    end
  rescue ex
    ToCry::Log.error(exception: ex) { "Error handling MCP request: #{ex.message}" }
    send_error(-32603, "Internal error: #{ex.message}", request_id)
  end

  # Handle Server-Sent Events for real-time communication
  def handle_sse(env, user_id : String)
    env.response.headers["Content-Type"] = "text/event-stream"
    env.response.headers["Cache-Control"] = "no-cache"
    env.response.headers["Connection"] = "keep-alive"
    env.response.headers["Access-Control-Allow-Origin"] = "*"
    env.response.headers["Access-Control-Allow-Headers"] = "Cache-Control"

    # Send initial connection event
    env.response.puts("event: connected")
    env.response.puts("data: {\"message\": \"Connected to ToCry MCP server as user: #{user_id}\"}")
    env.response.puts
    env.response.flush

    # Keep connection alive with periodic heartbeats
    spawn do
      loop do
        sleep(30.seconds) # Send heartbeat every 30 seconds
        begin
          env.response.puts(": heartbeat")
          env.response.puts
          env.response.flush
        rescue ex
          break # Connection closed
        end
      end
    end
  rescue ex
    ToCry::Log.error(exception: ex) { "Error in SSE connection: #{ex.message}" }
  end

  private def handle_initialize(params, id)
    client_version = params["protocolVersion"]?.try(&.as_s)

    # Accept 2025-06-18 (Claude) and 2024-11-05 (standard)
    unless client_version == "2025-06-18" || client_version == "2024-11-05"
      return send_error(-32602, "Unsupported protocol version: #{client_version}", id)
    end

    response = {
      "jsonrpc" => "2.0",
      "id"      => id,
      "result"  => {
        "protocolVersion" => "2024-11-05",
        "capabilities"    => {
          "tools" => {
            "listChanged" => true,
          },
        },
        "serverInfo" => {
          "name"    => "ToCry MCP Server",
          "version" => "0.1.0",
        },
      },
    }

    response.to_json
  end

  private def handle_tools_list(params, id)
    tools = @tools.values.map do |tool|
      {
        "name"        => tool.name,
        "description" => tool.description,
        "inputSchema" => tool.input_schema,
      }
    end

    response = {
      "jsonrpc" => "2.0",
      "id"      => id,
      "result"  => {
        "tools" => tools,
      },
    }

    response.to_json
  end

  # ameba:disable Metrics/CyclomaticComplexity
  private def handle_tools_call(params, id, user_id : String)
    tool_name = params["name"]?.try(&.as_s)

    unless tool_name
      return send_error(-32602, "Missing tool name", id)
    end

    tool = @tools[tool_name]?
    unless tool
      return send_error(-32602, "Unknown tool: #{tool_name}", id)
    end

    # MCP 2024-11-05 uses "arguments", 0.1.0 uses "params"
    arguments = params["arguments"]?.try(&.as_h) || params["params"]?.try(&.as_h) || {} of String => JSON::Any

    begin
      # Check if this is one of our authenticated tools
      result = case tool_name
               when "answer_to_life"
                 tool.as(AnswerToLifeTool).invoke_with_user(arguments, user_id)
               when "tocry_list_boards"
                 tool.as(ListBoardsTool).invoke_with_user(arguments, user_id)
               when "tocry_get_board"
                 tool.as(GetBoardTool).invoke_with_user(arguments, user_id)
               when "tocry_search_notes"
                 tool.as(SearchNotesTool).invoke_with_user(arguments, user_id)
               when "tocry_create_note"
                 tool.as(CreateNoteTool).invoke_with_user(arguments, user_id)
               when "tocry_update_note"
                 tool.as(UpdateNoteTool).invoke_with_user(arguments, user_id)
               when "tocry_get_note"
                 tool.as(GetNoteTool).invoke_with_user(arguments, user_id)
               else
                 # Fallback for tools that don't support authentication
                 tool.invoke(arguments)
               end

      response = {
        "jsonrpc" => "2.0",
        "id"      => id,
        "result"  => {
          "content" => [
            {
              "type" => "text",
              "text" => result.to_json,
            },
          ],
        },
      }

      response.to_json
    rescue ex : Exception
      send_error(-32602, "Tool error: #{ex.message}", id)
    end
  end

  private def send_error(code, message, id)
    {
      "jsonrpc" => "2.0",
      "id"      => id,
      "error"   => {
        "code"    => code,
        "message" => message,
      },
    }.to_json
  end
end
