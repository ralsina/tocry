require "json"
require "../tool"
require "../../services/board_service"

class UpdateBoardTool < Tool
  def initialize
    super(
      name: "tocry_update_board",
      description: "Update a board's properties",
      input_schema: {
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
      },
    )
  end

  def invoke(params : Hash(String, JSON::Any)) : Hash(String, JSON::Any)
    # Not used - authentication required for all tools
    raise "Authentication required"
  end

  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : Hash(String, JSON::Any)
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
    if result[:success]
      {
        "success"        => JSON::Any.new(true),
        "id"             => JSON::Any.new(result[:id]),
        "old_name"       => JSON::Any.new(result[:old_name]),
        "new_name"       => JSON::Any.new(result[:new_name]),
        "public"         => result[:public],
        "color_scheme"   => result[:color_scheme],
        "lane_count"     => JSON::Any.new(result[:lane_count]),
        "total_notes"    => JSON::Any.new(result[:total_notes]),
      }
    else
      {
        "error"   => JSON::Any.new(result[:error]),
        "success" => JSON::Any.new(false),
      }
    end
  end
end
