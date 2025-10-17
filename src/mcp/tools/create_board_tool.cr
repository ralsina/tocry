require "json"
require "../tool"
require "../../services/board_service"

class CreateBoardTool < Tool
  def initialize
    super(
      name: "tocry_create_board",
      description: "Create a new board",
      input_schema: {
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
      },
    )
  end

  def invoke(params : Hash(String, JSON::Any)) : Hash(String, JSON::Any)
    # Not used - authentication required for all tools
    raise "Authentication required"
  end

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
    if result[:success]
      {
        "success"      => JSON::Any.new(true),
        "id"           => JSON::Any.new(result[:id]),
        "name"         => JSON::Any.new(result[:name]),
        "public"       => result[:public],
        "color_scheme" => result[:color_scheme],
        "lane_count"   => JSON::Any.new(result[:lane_count]),
        "total_notes"  => JSON::Any.new(result[:total_notes]),
      }
    else
      {
        "error"   => JSON::Any.new(result[:error]),
        "success" => JSON::Any.new(false),
      }
    end
  end
end
