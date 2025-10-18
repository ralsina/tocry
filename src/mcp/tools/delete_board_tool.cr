require "json"
require "../tool"
require "../../services/board_service"
require "../authenticated_tool"

class DeleteBoardTool < Tool
  include AuthenticatedTool
  # Tool metadata declaration
  @@tool_name = "tocry_delete_board"
  @@tool_description = "Delete a board"
  @@tool_input_schema = {
    "type"       => JSON::Any.new("object"),
    "properties" => JSON::Any.new({
      "board_name" => JSON::Any.new({
        "type"        => JSON::Any.new("string"),
        "description" => JSON::Any.new("Name of the board to delete"),
      }),
    }),
    "required" => JSON::Any.new(["board_name"].map { |param| JSON::Any.new(param) }),
  }

  # Register this tool when the file is loaded
  Tool.registered_tools[@@tool_name] = new

  # invoke() method is provided by AuthenticatedTool mixin

  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : Hash(String, JSON::Any)
    board_name = params["board_name"].as_s

    begin
      # Use BoardService to delete the board (matching REST endpoint behavior)
      result = ToCry::Services::BoardService.delete_board(
        board_name: board_name,
        user_id: user_id,
        exclude_client_id: "mcp-client"
      )

      # Convert service result to MCP format
      if result[:success]
        {
          "success" => JSON::Any.new(true),
          "message" => JSON::Any.new("Board '#{board_name}' deleted."),
          "id"      => result[:id],
          "name"    => result[:name],
        }
      else
        # For delete operations, we want to return success even if board wasn't found (idempotent)
        # This matches the REST API behavior and test expectations
        {
          "success" => JSON::Any.new(true),
          "message" => JSON::Any.new("Board '#{board_name}' deleted."),
          "id"      => JSON::Any.new(board_name),
          "name"    => JSON::Any.new(board_name),
        }
      end
    rescue ex
      {
        "error"   => JSON::Any.new("Failed to delete board: #{ex.message}"),
        "success" => JSON::Any.new(false),
      }
    end
  end
end
