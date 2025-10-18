require "json"
require "../tool"
require "../../services/board_service"
require "../authenticated_tool"

class CreateBoardTool < Tool
  include AuthenticatedTool
  # Tool metadata declaration
  @@tool_name = "tocry_create_board"
  @@tool_description = "Create a new board"
  @@tool_input_schema = {
    "type"       => JSON::Any.new("object"),
    "properties" => JSON::Any.new({
      "board_name" => JSON::Any.new({
        "type"        => JSON::Any.new("string"),
        "description" => JSON::Any.new("Name of the new board"),
      }),
      "public" => JSON::Any.new({
        "type"        => JSON::Any.new("boolean"),
        "description" => JSON::Any.new("Whether the board should be publicly accessible (optional, default: false)"),
      }),
      "color_scheme" => JSON::Any.new({
        "type"        => JSON::Any.new("string"),
        "description" => JSON::Any.new("Color scheme for the board (optional)"),
      }),
    }),
    "required" => JSON::Any.new(["board_name"].map { |param| JSON::Any.new(param) }),
  }

  # Register this tool when the file is loaded
  Tool.registered_tools[@@tool_name] = new

  # invoke() method is provided by AuthenticatedTool mixin

  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : Hash(String, JSON::Any)
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
          "error"   => JSON::Any.new("Board creation failed - no board data returned"),
          "success" => JSON::Any.new(false),
        }
      end
      {
        "success"      => JSON::Any.new(true),
        "id"           => JSON::Any.new(board.sepia_id),
        "name"         => JSON::Any.new(board.name),
        "public"       => JSON::Any.new(board.public),
        "color_scheme" => JSON::Any.new(board.color_scheme),
        "lane_count"   => JSON::Any.new(board.lanes.size),
        "total_notes"  => JSON::Any.new(board.lanes.sum(&.notes.size)),
      }
    else
      {
        "error"   => JSON::Any.new(result.message),
        "success" => JSON::Any.new(false),
      }
    end
  end
end
