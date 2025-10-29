require "json"
require "mcp"
require "../authenticated_tool"
require "../../services/board_service"

class CreateBoardTool < MCP::AbstractTool
  include AuthenticatedTool
  # Tool metadata declaration
  @@tool_name = "tocry_create_board"
  @@tool_description = "Create a new board"
  @@tool_input_schema = {
    "type"       => "object",
    "properties" => {
      "board_name" => {
        "type"        => "string",
        "description" => "Name of the new board",
      },
      "public" => {
        "type"        => "boolean",
        "description" => "Whether the board should be publicly accessible (optional, default: false)",
      },
      "color_scheme" => {
        "type"        => "string",
        "description" => "Color scheme for the board (optional)",
      },
    },
    "required" => ["board_name"],
  }.to_json

  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String)
    board_name = params["board_name"].as_s
    public = params["public"]?.try(&.as_bool)
    color_scheme = params["color_scheme"]?.try(&.as_s)

    result = ToCry::Services::BoardService.create_board(
      board_name: board_name,
      user_id: user_id,
      public: public,
      color_scheme: color_scheme,
      exclude_client_id: "mcp-client"
    )

    # Convert service result to MCP format
    if result.success
      # Extract board data from the response
      board = result.board
      unless board
        return {
          "error"   => "Board creation failed - no board data returned",
          "success" => false,
        }
      end
      {
        "success"      => true,
        "id"           => board.sepia_id,
        "name"         => board.name,
        "public"       => board.public,
        "color_scheme" => board.color_scheme,
        "lane_count"   => board.lanes.size,
        "total_notes"  => board.lanes.sum(&.notes.size),
      }
    else
      {
        "error"   => result.message,
        "success" => false,
      }
    end
  end
end
