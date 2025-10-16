require "json"

class ListBoardsTool < ModelContextProtocol::Server::Tool
  def initialize
    super(
      name: "tocry_list_boards",
      description: "List all accessible Kanban boards for the current user",
      parameters: {
        "type" => JSON::Any.new("object"),
        "properties" => JSON::Any.new({} of String => JSON::Any),
      },
      required_parameters: [] of String
    )
  end

  def invoke(params : Hash(String, JSON::Any)) : Hash(String, JSON::Any)
    # Not used - authentication required for all tools
    raise "Authentication required"
  end

  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : Hash(String, JSON::Any)
    begin
      # Get the board manager
      board_manager = ToCry.board_manager

      # List all boards for the authenticated user
      board_uuids = board_manager.list(user_id)

      boards_data = board_uuids.map do |board_uuid|
        board = board_manager.get_by_uuid(board_uuid)
        if board
          {
            "id" => JSON::Any.new(board.sepia_id),
            "name" => JSON::Any.new(board.name),
            "lane_count" => JSON::Any.new(board.lanes.size),
            "public" => JSON::Any.new(board.public),
            "color_scheme" => board.color_scheme ? JSON::Any.new(board.color_scheme.not_nil!) : JSON::Any.new(nil)
          }
        else
          nil
        end
      end.compact

      {
        "boards" => JSON::Any.new(boards_data.map { |b| JSON::Any.new(b) }),
        "count" => JSON::Any.new(boards_data.size)
      }

    rescue ex
      {
        "error" => JSON::Any.new("Failed to list boards: #{ex.message}"),
        "boards" => JSON::Any.new([] of JSON::Any),
        "count" => JSON::Any.new(0)
      }
    end
  end
end
