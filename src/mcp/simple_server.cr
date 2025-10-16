require "kemal"
require "json"

class SimpleMCPServer
  def initialize
    ToCry::Log.info { "Initializing Simple MCP Server" }
  end

  # Handle MCP JSON-RPC requests directly without inheriting from problematic base class
  def handle_kemal_request(env)
    # Get the JSON-RPC request body
    request_body = env.request.body || raise "Missing request body"
    json_request = JSON.parse(request_body)

    ToCry::Log.info { "MCP Request: #{json_request}" }

    # Extract method and parameters
    method = json_request["method"]?.try(&.as_string)
    id = json_request["id"]?
    params = json_request["params"]?.try(&.as_h) || {} of String => JSON::Any

    case method
    when "initialize"
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
    when "tools/list"
      response = {
        "jsonrpc" => "2.0",
        "id"      => id,
        "result"  => {
          "tools" => [
            {
              "name"        => "answer_to_life",
              "description" => "Returns the answer to life, the universe, and everything",
              "inputSchema" => {
                "type"       => "object",
                "properties" => {} of String => JSON::Any,
              },
            },
          ],
        },
      }
    when "tools/call"
      tool_name = params["name"]?.try(&.as_string)

      result = case tool_name
               when "answer_to_life"
                 {
                   "answer"      => JSON::Any.new(42),
                   "question"    => JSON::Any.new("What do you get if you multiply six by nine?"),
                   "explanation" => JSON::Any.new("Though the question was never properly understood, the answer remains 42."),
                 }
               else
                 raise "Unknown tool: #{tool_name}"
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
    else
      response = {
        "jsonrpc" => "2.0",
        "id"      => id,
        "error"   => {
          "code"    => -32601,
          "message" => "Method not found: #{method}",
        },
      }
    end

    env.response.content_type = "application/json"
    env.response.print response.to_json
  rescue ex
    ToCry::Log.error(exception: ex) { "Error handling MCP request: #{ex.message}" }
    env.response.status_code = 500
    env.response.content_type = "application/json"
    env.response.print({
      "jsonrpc" => "2.0",
      "error"   => {
        "code"    => -32603,
        "message" => "Internal error: #{ex.message}",
      },
      "id" => json_request["id"]?,
    }.to_json)
  end

  # Handle Server-Sent Events
  def handle_sse(env)
    env.response.headers["Content-Type"] = "text/event-stream"
    env.response.headers["Cache-Control"] = "no-cache"
    env.response.headers["Connection"] = "keep-alive"

    env.response.puts("event: connected")
    env.response.puts("data: {\"message\": \"Connected to ToCry MCP server\"}")
    env.response.puts
  rescue ex
    ToCry::Log.error(exception: ex) { "Error in SSE connection: #{ex.message}" }
  end
end
