require "json"
require "mcp"
require "../../services/board_service"

class DeleteBoardTool < MCP::AbstractTool
  include AuthenticatedTool
  # Tool metadata declaration
  @@tool_name = "tocry_delete_board"
  @@tool_description = "Delete a board"
  @@tool_input_schema = {
    "type"       => "object",
    "properties" => {
      "board_name" => {
        "type"        => "string",
        "description" => "Name of the board to delete",
      },
    },
    "required" => ["board_name"],
  }.to_json

  # Register this tool when the file is loaded

  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String)
    board_name = params["board_name"].as_s

    result = ToCry::Services::BoardService.delete_board(
      board_name: board_name,
      user_id: user_id,
      exclude_client_id: "mcp-client"
    )

    {
      "success" => result.success,
      "message" => result.message,
    }
  end
end
