require "json"
require "../tool"
require "../../services/note_service"

class DeleteNoteTool < Tool
  # Tool metadata declaration
  @@tool_name = "tocry_delete_note"
  @@tool_description = "Delete a note from a board"
  @@tool_input_schema = {
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
  }

  def invoke(params : Hash(String, JSON::Any)) : Hash(String, JSON::Any)
    # Not used - authentication required for all tools
    raise "Authentication required"
  end

  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : Hash(String, JSON::Any)
    note_id = params["note_id"].as_s
    board_name = params["board_name"].as_s

    result = ToCry::Services::NoteService.delete_note(
      board_name: board_name,
      note_id: note_id,
      user_id: user_id,
      exclude_client_id: "mcp-client"
    )

    if result[:success]
      {
        "success"    => JSON::Any.new(true),
        "message"    => JSON::Any.new("Note deleted successfully."),
        "id"         => JSON::Any.new(result[:id]),
        "title"      => JSON::Any.new(result[:title]),
        "lane_name"  => JSON::Any.new(result[:lane_name]),
        "board_name" => JSON::Any.new(board_name),
      }
    else
      {
        "error"   => JSON::Any.new(result[:error]),
        "success" => JSON::Any.new(false),
      }
    end
  end
end
