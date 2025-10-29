require "json"
require "mcp"
require "../../services/board_service"
require "../authenticated_tool"

class UpdateBoardTool < MCP::AbstractTool
  include AuthenticatedTool
  # Tool metadata declaration
  @@tool_name = "tocry_update_board"
  @@tool_description = "Update a board's properties"
  @@tool_input_schema = {
    "type"       => "object",
    "properties" => {
      "board_name" => {
        "type"        => "string",
        "description" => "Current name of the board to update",
      },
      "new_board_name" => {
        "type"        => "string",
        "description" => "New name for the board (optional)",
      },
      "public" => {
        "type"        => "boolean",
        "description" => "Whether the board should be publicly accessible (optional)",
      },
      "color_scheme" => {
        "type"        => "string",
        "description" => "Color scheme for the board (optional)",
      },
      "lanes" => {
        "type"        => "array",
        "description" => "Array of lanes with their names and positions (optional)",
      },
    },
    "required" => ["board_name"],
  }.to_json

  # invoke() method is provided by AuthenticatedTool mixin

  # Register this tool when the file is loaded


  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String)
    board_name = params["board_name"].as_s

    # Extract optional parameters
    new_board_name = params["new_board_name"]?.try(&.as_s)
    public = params["public"]?.try(&.as_bool)
    color_scheme = params["color_scheme"]?.try(&.as_s)

    # Convert lanes parameter to proper format if present
    lanes = nil
    if lanes_param = params["lanes"]?
      lanes = lanes_param.as_a.map(&.as_h)
    end

    result = ToCry::Services::BoardService.update_board(
      board_name: board_name,
      user_id: user_id,
      new_board_name: new_board_name,
      public: public,
      color_scheme: color_scheme,
      lanes: lanes,
      exclude_client_id: "mcp-client"
    )

    # Convert service result to MCP format
    if result.success
      # Extract board data from the response
      board = result.board
      unless board
        return {
          "error"   => "Board update failed - no board data returned",
          "success" => false,
        }
      end
      {
        "success"      => true,
        "id"           => board.sepia_id,
        "name"         => result.new_name.empty? ? result.old_name : result.new_name,
        "old_name"     => result.old_name,
        "new_name"     => result.new_name,
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
