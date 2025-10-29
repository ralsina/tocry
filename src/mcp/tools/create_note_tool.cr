require "json"
require "mcp"
require "../../services/note_service"

class CreateNoteTool < MCP::AbstractTool
  include AuthenticatedTool
  # Tool metadata declaration
  @@tool_name = "tocry_create_note"
  @@tool_description = "Create a new note in a specific lane on a board"
  @@tool_input_schema = {
    "type"       => "object",
    "properties" => {
      "board_name" => {
        "type"        => "string",
        "description" => "Name of the board where the note will be created",
      },
      "lane_name" => {
        "type"        => "string",
        "description" => "Name of the lane where the note will be created",
      },
      "title" => {
        "type"        => "string",
        "description" => "Title of the note",
      },
      "content" => {
        "type"        => "string",
        "description" => "Content of the note (optional)",
      },
      "tags" => {
        "type"        => "array",
        "description" => "Array of tags for the note (optional)",
      },
      "priority" => {
        "type"        => "string",
        "description" => "Priority level: high, medium, low (optional)",
      },
      "start_date" => {
        "type"        => "string",
        "description" => "Start date in YYYY-MM-DD format (optional)",
      },
      "end_date" => {
        "type"        => "string",
        "description" => "End date in YYYY-MM-DD format (optional)",
      },
      "public" => {
        "type"        => "boolean",
        "description" => "Whether the note is publicly accessible (optional)",
      },
    },
    "required" => ["board_name", "lane_name", "title"],
  }.to_json

  # Register this tool when the file is loaded

  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String)
    board_name = params["board_name"].as_s
    lane_name = params["lane_name"].as_s
    title = params["title"].as_s

    # Extract optional parameters
    content = params["content"]?.try(&.as_s)
    tags = params["tags"]?.try(&.as_a.map(&.as_s))
    priority = params["priority"]?.try(&.as_s)
    start_date = params["start_date"]?.try(&.as_s)
    end_date = params["end_date"]?.try(&.as_s)
    public = params["public"]?.try(&.as_bool)

    result = ToCry::Services::NoteService.create_note(
      board_name: board_name,
      lane_name: lane_name,
      title: title,
      user_id: user_id,
      content: content,
      tags: tags,
      priority: priority,
      start_date: start_date,
      end_date: end_date,
      public: public,
      exclude_client_id: "mcp-client"
    )

    # Check if the operation was successful
    if result.success
      note = result.note
      unless note
        return {
          "error"   => "Note creation failed - no note data returned",
          "success" => false,
        }
      end
      {
        "success"    => true,
        "id"         => note.sepia_id,
        "title"      => note.title,
        "content"    => note.content,
        "lane_name"  => result.lane_name,
        "board_name" => board_name,
        "tags"       => note.tags,
        "priority"   => note.priority.to_s,
        "start_date" => note.start_date,
        "end_date"   => note.end_date,
        "public"     => note.public,
      }
    else
      {
        "error"   => result.message,
        "success" => false,
      }
    end
  end
end
