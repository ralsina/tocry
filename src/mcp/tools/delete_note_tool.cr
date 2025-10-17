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

    result = ToCry::Services::NoteService.delete_note(
        board_name: board_name,
        note_id: note_id,
        user_id: user_id,
        exclude_client_id: "mcp-client"
      )

      # Check if the operation was successful
      if result[:success]
        return {
          "success"    => JSON::Any.new(result[:success]),
          "message"    => result[:message],
          "id"         => result[:id],
          "title"      => result[:title],
          "lane_name"  => result[:lane_name],
          "board_name" => JSON::Any.new(board_name),
        }
      else
        return {
          "error"   => JSON::Any.new(result[:error]),
          "success" => JSON::Any.new(false),
        }
      end
  end
end
