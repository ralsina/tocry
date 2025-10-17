require "json"
require "../tool"
require "../../services/board_service"

class DeleteBoardTool < Tool
  def initialize
    super(
      name: "tocry_delete_board",
      description: "Delete a board",
      input_schema: {
        "type"       => JSON::Any.new("object"),
        "properties" => JSON::Any.new({
          "board_name" => JSON::Any.new({
            "type"        => JSON::Any.new("string"),
            "description" => JSON::Any.new("Name of the board to delete"),
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

    result = ToCry::Services::BoardService.delete_board(
      board_name: board_name,
      user_id: user_id,
      exclude_client_id: "mcp-client"
    )

    # Convert service result to MCP format
    if result[:success]
      {
        "success" => JSON::Any.new(true),
        "message" => result[:message],
        "id"      => result[:id],
        "name"    => result[:name],
      }
    else
      {
        "error"   => JSON::Any.new(result[:error]),
        "success" => JSON::Any.new(false),
      }
    end
  end
end
