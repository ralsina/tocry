require "json"
require "mcp"
require "../../services/note_service"

class UpdateNoteTool < MCP::AbstractTool
  include AuthenticatedTool
  # Tool metadata declaration
  @@tool_name = "tocry_update_note"
  @@tool_description = "Update an existing note's properties or move it to a different lane"
  @@tool_input_schema = {
    "type"       => "object",
    "properties" => {
      "note_id" => {
        "type"        => "string",
        "description" => "ID of the note to update",
      },
      "board_name" => {
        "type"        => "string",
        "description" => "Name of the board containing the note",
      },
      "title" => {
        "type"        => "string",
        "description" => "New title for the note (optional)",
      },
      "content" => {
        "type"        => "string",
        "description" => "New content for the note (optional)",
      },
      "tags" => {
        "type"        => "array",
        "description" => "New array of tags for the note (optional)",
      },
      "priority" => {
        "type"        => "string",
        "description" => "New priority level: high, medium, low (optional)",
      },
      "start_date" => {
        "type"        => "string",
        "description" => "New start date in YYYY-MM-DD format (optional)",
      },
      "end_date" => {
        "type"        => "string",
        "description" => "New end date in YYYY-MM-DD format (optional)",
      },
      "public" => {
        "type"        => "boolean",
        "description" => "Whether the note is publicly accessible (optional)",
      },
      "new_lane_name" => {
        "type"        => "string",
        "description" => "New lane name to move the note to (optional)",
      },
      "expanded" => {
        "type"        => "boolean",
        "description" => "Whether the note should be expanded (optional)",
      },
    },
    "required" => ["note_id", "board_name"],
  }.to_json

  # Register this tool when the file is loaded

  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : Hash(String, JSON::Any) | Hash(String, Array(JSON::Any))
    note_id = params["note_id"].as_s
    board_name = params["board_name"].as_s

    # Extract optional parameters
    title = params["title"]?.try(&.as_s)
    content = params["content"]?.try(&.as_s)
    tags = params["tags"]?.try(&.as_a.map(&.as_s))
    priority = params["priority"]?.try(&.as_s)
    start_date = params["start_date"]?.try(&.as_s)
    end_date = params["end_date"]?.try(&.as_s)
    public = params["public"]?.try(&.as_bool)
    expanded = params["expanded"]?.try(&.as_bool)
    new_lane_name = params["new_lane_name"]?.try(&.as_s)

    result = ToCry::Services::NoteService.update_note(
      board_name: board_name,
      note_id: note_id,
      user_id: user_id,
      title: title,
      content: content,
      tags: tags,
      priority: priority,
      start_date: start_date,
      end_date: end_date,
      public: public,
      expanded: expanded,
      new_lane_name: new_lane_name,
      exclude_client_id: "mcp-client"
    )

    # Check if the operation was successful
    if result.success
      # Extract note data from the response
      note = result.note
      unless note
        return {
          "error"   => JSON::Any.new("Note update failed - no note data returned"),
          "success" => JSON::Any.new(false),
        }
      end
      {
        "success"    => JSON::Any.new(true),
        "id"         => JSON::Any.new(note.sepia_id),
        "title"      => JSON::Any.new(note.title),
        "content"    => JSON::Any.new(note.content),
        "lane_name"  => JSON::Any.new(result.lane_name),
        "board_name" => JSON::Any.new(board_name),
        "tags"       => JSON::Any.new(note.tags.map { |tag| JSON::Any.new(tag) }),
        "priority"   => JSON::Any.new(note.priority.to_s),
        "start_date" => JSON::Any.new(note.start_date),
        "end_date"   => JSON::Any.new(note.end_date),
        "public"     => JSON::Any.new(note.public),
      }
    else
      {
        "error"   => JSON::Any.new(result.message),
        "success" => JSON::Any.new(false),
      }
    end
  end
end
