require "json"
require "mcp"
require "../../services/note_service"

class DeleteNoteTool < MCP::AbstractTool
  include AuthenticatedTool
  # Tool metadata declaration
  @@tool_name = "tocry_delete_note"
  @@tool_description = "Delete a note from a board"
  @@tool_input_schema = {
    "type"       => "object",
    "properties" => {
      "note_id" => {
        "type"        => "string",
        "description" => "ID of the note to delete",
      },
      "board_name" => {
        "type"        => "string",
        "description" => "Name of the board containing the note",
      },
    },
    "required" => ["note_id", "board_name"],
  }.to_json

  # Register this tool when the file is loaded

  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : Hash(String, JSON::Any) | Hash(String, Array(JSON::Any))
    note_id = params["note_id"].as_s
    board_name = params["board_name"].as_s

    result = ToCry::Services::NoteService.delete_note(
      board_name: board_name,
      note_id: note_id,
      user_id: user_id,
      exclude_client_id: "mcp-client"
    )

    {
      "success" => JSON::Any.new(result.success),
      "message" => JSON::Any.new(result.message),
    }
  end
end
