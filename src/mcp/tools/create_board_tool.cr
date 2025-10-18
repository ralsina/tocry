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

  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : String
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
        }.to_json
      end
      {
        "success"      => true,
        "id"           => board.sepia_id,
        "name"         => board.name,
        "public"       => board.public,
        "color_scheme" => board.color_scheme,
        "lane_count"   => board.lanes.size,
        "total_notes"  => board.lanes.sum(&.notes.size),
      }.to_json
    else
      {
        "error"   => result.message,
        "success" => false,
      }.to_json
    end
  end
end
