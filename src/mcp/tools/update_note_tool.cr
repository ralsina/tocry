require "json"
require "../tool"
require "../../services/note_service"

class UpdateNoteTool < Tool
  def initialize
    super(
      name: "tocry_update_note",
      description: "Update an existing note's properties or move it to a different lane",
      input_schema: {
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
      if result[:success]
        return {
          "success"    => JSON::Any.new(true),
          "id"         => JSON::Any.new(result[:id]),
          "title"      => JSON::Any.new(result[:title]),
          "content"    => JSON::Any.new(result[:content]),
          "lane_name"  => JSON::Any.new(result[:lane_name]),
          "board_name" => JSON::Any.new(board_name),
          "tags"       => JSON::Any.new(result[:tags]),
          "priority"   => JSON::Any.new(result[:priority]),
          "start_date" => result[:start_date],
          "end_date"   => result[:end_date],
          "public"     => result[:public],
        }
      else
        return {
          "error"   => JSON::Any.new(result[:error]),
          "success" => JSON::Any.new(false),
        }
      end
  end
end
