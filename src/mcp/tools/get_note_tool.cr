require "json"

class GetNoteTool < ModelContextProtocol::Server::Tool
  def initialize
    super(
      name: "tocry_get_note",
      description: "Get detailed information about a specific note",
      parameters: {
        "type"       => JSON::Any.new("object"),
        "properties" => JSON::Any.new({
          "note_id" => JSON::Any.new({
            "type"        => JSON::Any.new("string"),
            "description" => JSON::Any.new("ID of the note to retrieve"),
          }),
          "board_name" => JSON::Any.new({
            "type"        => JSON::Any.new("string"),
            "description" => JSON::Any.new("Name of the board containing the note (optional - if not provided, searches all boards)"),
          }),
        }),
        "required" => JSON::Any.new(["note_id"].map { |param| JSON::Any.new(param) }),
      },
      required_parameters: ["note_id"]
    )
  end

  def invoke(params : Hash(String, JSON::Any)) : Hash(String, JSON::Any)
    # Not used - authentication required for all tools
    raise "Authentication required"
  end

  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : Hash(String, JSON::Any)
    note_id = params["note_id"].as_s
    board_name = params["board_name"]?.try(&.as_s)

    begin
      # Get the board manager
      board_manager = ToCry.board_manager

      note_result = nil
      found_board = nil
      found_lane = nil

      if board_name
        # Search specific board
        board = board_manager.get(board_name, user_id)
        if board
          result = board.note(note_id)
          if result
            note_result, found_lane = result
            found_board = board
          end
        end
      else
        # Search all boards for the user
        board_uuids = board_manager.list(user_id)
        board_uuids.each do |board_uuid|
          board = board_manager.get_by_uuid(board_uuid)
          next unless board

          result = board.note(note_id)
          if result
            note_result, found_lane = result
            found_board = board
            break
          end
        end
      end

      unless note_result && found_board && found_lane
        return {
          "error" => JSON::Any.new("Note '#{note_id}' not found for user '#{user_id}'"),
        }
      end

      {
        "success"     => JSON::Any.new(true),
        "id"          => JSON::Any.new(note_result.sepia_id),
        "title"       => JSON::Any.new(note_result.title),
        "content"     => JSON::Any.new(note_result.content),
        "board_name"  => JSON::Any.new(found_board.name),
        "board_id"    => JSON::Any.new(found_board.sepia_id),
        "lane_name"   => JSON::Any.new(found_lane.name),
        "tags"        => JSON::Any.new(note_result.tags.map { |tag_name| JSON::Any.new(tag_name) }),
        "priority"    => JSON::Any.new(note_result.priority.to_s),
        "start_date"  => note_result.start_date ? JSON::Any.new(note_result.start_date) : JSON::Any.new(nil),
        "end_date"    => note_result.end_date ? JSON::Any.new(note_result.end_date) : JSON::Any.new(nil),
        "public"      => JSON::Any.new(note_result.public),
        "attachments" => JSON::Any.new(note_result.attachments.map { |attachment| JSON::Any.new(attachment) }),
        "expanded"    => JSON::Any.new(note_result.expanded),
      }
    rescue ex
      {
        "error"   => JSON::Any.new("Failed to get note: #{ex.message}"),
        "success" => JSON::Any.new(false),
      }
    end
  end
end
