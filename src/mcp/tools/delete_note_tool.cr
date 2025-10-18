require "json"
require "../tool"
require "../../services/note_service"
require "../authenticated_tool"

class DeleteNoteTool < Tool
  include AuthenticatedTool
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

  # Register this tool when the file is loaded
  Tool.registered_tools[@@tool_name] = new

  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : String
    note_id = params["note_id"].as_s
    board_name = params["board_name"].as_s

    result = ToCry::Services::NoteService.delete_note(
      board_name: board_name,
      note_id: note_id,
      user_id: user_id,
      exclude_client_id: "mcp-client"
    )

    {
      "success" => result.success,
      "message" => result.message,
    }.to_json
  end
end
