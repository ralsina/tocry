require "json"
require "../tool"
require "../../services/note_service"

class CreateNoteTool < Tool
  def initialize
    super(
      name: "tocry_create_note",
      description: "Create a new note in a specific lane on a board",
      input_schema: {
        "type"       => JSON::Any.new("object"),
        "properties" => JSON::Any.new({
          "board_name" => JSON::Any.new({
            "type"        => JSON::Any.new("string"),
            "description" => JSON::Any.new("Name of the board where the note will be created"),
          }),
          "lane_name" => JSON::Any.new({
            "type"        => JSON::Any.new("string"),
            "description" => JSON::Any.new("Name of the lane where the note will be created"),
          }),
          "title" => JSON::Any.new({
            "type"        => JSON::Any.new("string"),
            "description" => JSON::Any.new("Title of the note"),
          }),
          "content" => JSON::Any.new({
            "type"        => JSON::Any.new("string"),
            "description" => JSON::Any.new("Content of the note (optional)"),
          }),
          "tags" => JSON::Any.new({
            "type"        => JSON::Any.new("array"),
            "description" => JSON::Any.new("Array of tags for the note (optional)"),
          }),
          "priority" => JSON::Any.new({
            "type"        => JSON::Any.new("string"),
            "description" => JSON::Any.new("Priority level: high, medium, low (optional)"),
          }),
          "start_date" => JSON::Any.new({
            "type"        => JSON::Any.new("string"),
            "description" => JSON::Any.new("Start date in YYYY-MM-DD format (optional)"),
          }),
          "end_date" => JSON::Any.new({
            "type"        => JSON::Any.new("string"),
            "description" => JSON::Any.new("End date in YYYY-MM-DD format (optional)"),
          }),
          "public" => JSON::Any.new({
            "type"        => JSON::Any.new("boolean"),
            "description" => JSON::Any.new("Whether the note is publicly accessible (optional)"),
          }),
        }),
        "required" => JSON::Any.new(["board_name", "lane_name", "title"].map { |param| JSON::Any.new(param) }),
      },
    )
  end

  def invoke(params : Hash(String, JSON::Any)) : Hash(String, JSON::Any)
    # Not used - authentication required for all tools
    raise "Authentication required"
  end

  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : Hash(String, JSON::Any)
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
