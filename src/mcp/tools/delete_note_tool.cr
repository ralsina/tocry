require "json"
require "../tool"
require "../../services/note_service"

class DeleteNoteTool < Tool
  def initialize
    super(
      name: "tocry_delete_note",
      description: "Delete a note from a board",
      input_schema: {
        "type"       => JSON::Any.new("object"),
        "properties" => JSON::Any.new({
          "note_id" => JSON::Any.new({
            "type"        => JSON::Any.new("string"),
            "description" => JSON::Any.new("ID of the note to delete"),
          }),
          "board_name" => JSON::Any.new({
            "type"        => JSON::Any.new("string"),
            "description" => JSON::Any.new("Name of the board containing the note"),
          }),
        }),
        "required" => JSON::Any.new(["note_id", "board_name"].map { |param| JSON::Any.new(param) }),
      },
    )
  end

  def invoke(params : Hash(String, JSON::Any)) : Hash(String, JSON::Any)
    # Not used - authentication required for all tools
    raise "Authentication required"
  end

  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : Hash(String, JSON::Any)
    note_id = params["note_id"].as_s
    board_name = params["board_name"].as_s

    begin
      # Check if board exists to maintain idempotent behavior (matching REST endpoint)
      board = ToCry.board_manager.get(board_name, user_id)
      unless board
        ToCry::Log.info { "Note '#{note_id}' deletion skipped - board '#{board_name}' doesn't exist for user '#{user_id}'" }
        return {
          "success" => JSON::Any.new(true),
          "message" => JSON::Any.new("Note deleted successfully."),
          "id"      => JSON::Any.new(note_id),
          "title"   => JSON::Any.new(""),
          "lane_name" => JSON::Any.new(""),
          "board_name" => JSON::Any.new(board_name),
        }
      end

      # Check if note exists to maintain idempotent behavior (matching REST endpoint)
      found_note_and_lane = board.note(note_id)
      unless found_note_and_lane
        ToCry::Log.info { "Note '#{note_id}' already deleted or never existed in board '#{board_name}' by user '#{user_id}'" }
        return {
          "success" => JSON::Any.new(true),
          "message" => JSON::Any.new("Note deleted successfully."),
          "id"      => JSON::Any.new(note_id),
          "title"   => JSON::Any.new(""),
          "lane_name" => JSON::Any.new(""),
          "board_name" => JSON::Any.new(board_name),
        }
      end

      # Use NoteService to delete the note
      result = ToCry::Services::NoteService.delete_note(
          board_name: board_name,
          note_id: note_id,
          user_id: user_id,
          exclude_client_id: "mcp-client"
        )

        # Check if the operation was successful
        if result[:success]
          return {
            "success"    => JSON::Any.new(true),
            "message"    => JSON::Any.new("Note deleted successfully."),
            "id"         => JSON::Any.new(result[:id]),
            "title"      => JSON::Any.new(result[:title]),
            "lane_name"  => JSON::Any.new(result[:lane_name]),
            "board_name" => JSON::Any.new(board_name),
          }
        else
          return {
            "error"   => JSON::Any.new(result[:error]),
            "success" => JSON::Any.new(false),
          }
        end
    rescue ex
      return {
        "error"   => JSON::Any.new("Failed to delete note: #{ex.message}"),
        "success" => JSON::Any.new(false),
      }
    end
  end
end
