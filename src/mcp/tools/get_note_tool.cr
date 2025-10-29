require "json"
require "mcp"

class GetNoteTool < MCP::AbstractTool
  include AuthenticatedTool
  # Tool metadata declaration
  @@tool_name = "tocry_get_note"
  @@tool_description = "Get detailed information about a specific note"
  @@tool_input_schema = {
    "type"       => "object",
    "properties" => {
      "note_id" => {
        "type"        => "string",
        "description" => "ID of the note to retrieve",
      },
      "board_name" => {
        "type"        => "string",
        "description" => "Name of the board containing the note (optional - if not provided, searches all boards)",
      },
    },
  }.to_json

  # Register this tool when the file is loaded

  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String)
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
          "success" => JSON::Any.new(false),
          "error"   => JSON::Any.new("Note '#{note_id}' not found for user '#{user_id}'"),
        }
      end

      {
        "success"     => true,
        "id"          => note_result.sepia_id,
        "title"       => note_result.title,
        "content"     => note_result.content,
        "board_name"  => found_board.name,
        "board_id"    => found_board.sepia_id,
        "lane_name"   => found_lane.name,
        "tags"        => note_result.tags.map { |tag_name| tag_name },
        "priority"    => note_result.priority.to_s,
        "start_date"  => note_result.start_date ? note_result.start_date : nil,
        "end_date"    => note_result.end_date ? note_result.end_date : nil,
        "public"      => note_result.public,
        "attachments" => note_result.attachments.map { |attachment| attachment },
        "expanded"    => note_result.expanded,
      }
    rescue ex
      {
        "error"   => "Failed to get note: #{ex.message}",
        "success" => false,
      }
    end
  end
end
