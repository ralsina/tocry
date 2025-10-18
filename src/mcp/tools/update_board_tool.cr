require "json"
require "../tool"
require "../../services/board_service"
require "../authenticated_tool"

class UpdateBoardTool < Tool
  include AuthenticatedTool
  # Tool metadata declaration
  @@tool_name = "tocry_update_board"
  @@tool_description = "Update a board's properties"
  @@tool_input_schema = {
    "type"       => JSON::Any.new("object"),
    "properties" => JSON::Any.new({
      "board_name" => JSON::Any.new({
        "type"        => JSON::Any.new("string"),
        "description" => JSON::Any.new("Current name of the board to update"),
      }),
      "new_board_name" => JSON::Any.new({
        "type"        => JSON::Any.new("string"),
        "description" => JSON::Any.new("New name for the board (optional)"),
      }),
      "public" => JSON::Any.new({
        "type"        => JSON::Any.new("boolean"),
        "description" => JSON::Any.new("Whether the board should be publicly accessible (optional)"),
      }),
      "color_scheme" => JSON::Any.new({
        "type"        => JSON::Any.new("string"),
        "description" => JSON::Any.new("Color scheme for the board (optional)"),
      }),
      "lanes" => JSON::Any.new({
        "type"        => JSON::Any.new("array"),
        "description" => JSON::Any.new("Array of lanes with their names and positions (optional)"),
      }),
    }),
    "required" => JSON::Any.new(["board_name"].map { |param| JSON::Any.new(param) }),
  }

  # Register this tool when the file is loaded
  Tool.registered_tools[@@tool_name] = new

  # invoke() method is provided by AuthenticatedTool mixin

  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : String
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
        }.to_json
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
      }.to_json
    else
      {
        "error"   => result.message,
        "success" => false,
      }.to_json
    end
  end
end
