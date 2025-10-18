require "json"
require "../tool"
require "../../services/note_service"
require "../authenticated_tool"

class UpdateNoteTool < Tool
  include AuthenticatedTool
  # Tool metadata declaration
  @@tool_name = "tocry_update_note"
  @@tool_description = "Update an existing note's properties or move it to a different lane"
  @@tool_input_schema = {
    "type"       => JSON::Any.new("object"),
    "properties" => JSON::Any.new({
      "note_id" => JSON::Any.new({
        "type"        => JSON::Any.new("string"),
        "description" => JSON::Any.new("ID of the note to update"),
      }),
      "board_name" => JSON::Any.new({
        "type"        => JSON::Any.new("string"),
        "description" => JSON::Any.new("Name of the board containing the note"),
      }),
      "title" => JSON::Any.new({
        "type"        => JSON::Any.new("string"),
        "description" => JSON::Any.new("New title for the note (optional)"),
      }),
      "content" => JSON::Any.new({
        "type"        => JSON::Any.new("string"),
        "description" => JSON::Any.new("New content for the note (optional)"),
      }),
      "tags" => JSON::Any.new({
        "type"        => JSON::Any.new("array"),
        "description" => JSON::Any.new("New array of tags for the note (optional)"),
      }),
      "priority" => JSON::Any.new({
        "type"        => JSON::Any.new("string"),
        "description" => JSON::Any.new("New priority level: high, medium, low (optional)"),
      }),
      "start_date" => JSON::Any.new({
        "type"        => JSON::Any.new("string"),
        "description" => JSON::Any.new("New start date in YYYY-MM-DD format (optional)"),
      }),
      "end_date" => JSON::Any.new({
        "type"        => JSON::Any.new("string"),
        "description" => JSON::Any.new("New end date in YYYY-MM-DD format (optional)"),
      }),
      "public" => JSON::Any.new({
        "type"        => JSON::Any.new("boolean"),
        "description" => JSON::Any.new("Whether the note is publicly accessible (optional)"),
      }),
      "new_lane_name" => JSON::Any.new({
        "type"        => JSON::Any.new("string"),
        "description" => JSON::Any.new("New lane name to move the note to (optional)"),
      }),
      "expanded" => JSON::Any.new({
        "type"        => JSON::Any.new("boolean"),
        "description" => JSON::Any.new("Whether the note should be expanded (optional)"),
      }),
    }),
    "required" => JSON::Any.new(["note_id", "board_name"].map { |param| JSON::Any.new(param) }),
  }

  # Register this tool when the file is loaded
  Tool.registered_tools[@@tool_name] = new

  # invoke() method is provided by AuthenticatedTool mixin

  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : String
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
          "error"   => "Note update failed - no note data returned",
          "success" => false,
        }.to_json
      end
      {
        "success"    => true,
        "id"         => note.sepia_id,
        "title"      => note.title,
        "content"    => note.content,
        "lane_name"  => result.lane_name,
        "board_name" => board_name,
        "tags"       => note.tags.map { |tag| tag },
        "priority"   => note.priority.to_s,
        "start_date" => note.start_date,
        "end_date"   => note.end_date,
        "public"     => note.public,
      }.to_json
    else
      {
        "error"   => result.message,
        "success" => false,
      }.to_json
    end
  end
end
