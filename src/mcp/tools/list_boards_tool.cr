require "json"
require "../tool"

class ListBoardsTool < Tool
  def initialize
    super(
      name: "tocry_list_boards",
      description: "List all accessible Kanban boards for the current user",
      input_schema: {
        "type"       => JSON::Any.new("object"),
        "properties" => JSON::Any.new({} of String => JSON::Any),
      },
    )
  end

  def invoke(params : Hash(String, JSON::Any)) : Hash(String, JSON::Any)
    # Not used - authentication required for all tools
    raise "Authentication required"
  end

  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : Hash(String, JSON::Any)
    # Get the board manager
    board_manager = ToCry.board_manager

    # List all boards for the authenticated user
    board_uuids = board_manager.list(user_id)

    boards_data = board_uuids.compact_map do |board_uuid|
      board = board_manager.get_by_uuid(board_uuid)
      next unless board

      {
        "id"           => JSON::Any.new(board.sepia_id),
        "name"         => JSON::Any.new(board.name),
        "lane_count"   => JSON::Any.new(board.lanes.size),
        "public"       => JSON::Any.new(board.public),
        "color_scheme" => board.color_scheme ? JSON::Any.new(board.color_scheme) : JSON::Any.new(nil),
      }
    end

    {
      "boards" => JSON::Any.new(boards_data.map { |board_data| JSON::Any.new(board_data) }),
      "count"  => JSON::Any.new(boards_data.size),
    }
  rescue ex
    {
      "error"  => JSON::Any.new("Failed to list boards: #{ex.message}"),
      "boards" => JSON::Any.new([] of JSON::Any),
      "count"  => JSON::Any.new(0),
    }
  end
end
