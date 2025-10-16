require "json"

class CreateNoteTool < ModelContextProtocol::Server::Tool
  def initialize
    super(
      name: "tocry_create_note",
      description: "Create a new note in a specific lane on a board",
      parameters: {
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
      required_parameters: ["board_name", "lane_name", "title"]
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

    begin
      # Get the board manager
      board_manager = ToCry.board_manager

      # Get the board
      board = board_manager.get(board_name, user_id)
      unless board
        return {
          "error" => JSON::Any.new("Board '#{board_name}' not found for user '#{user_id}'"),
        }
      end

      # Find the target lane
      target_lane = board.lanes.find { |lane| lane.name == lane_name }
      unless target_lane
        return {
          "error" => JSON::Any.new("Lane '#{lane_name}' not found in board '#{board_name}'"),
        }
      end

      # Parse optional parameters
      content = params["content"]?.try(&.as_s) || ""
      tags = params["tags"]?.try(&.as_a.map(&.as_s)) || [] of String
      priority_str = params["priority"]?.try(&.as_s)
      start_date = params["start_date"]?.try(&.as_s)
      end_date = params["end_date"]?.try(&.as_s)
      public = params["public"]?.try(&.as_bool) || false

      # Parse priority
      priority = case priority_str
                 when "high"   then ToCry::Priority::High
                 when "medium" then ToCry::Priority::Medium
                 when "low"    then ToCry::Priority::Low
                 else               nil
                 end

      # Create new note
      new_note = ToCry::Note.new(
        title: title,
        tags: tags,
        content: content,
        expanded: false,
        public: public,
        attachments: [] of String,
        start_date: start_date,
        end_date: end_date,
        priority: priority
      )

      # Add note to the lane
      target_lane.notes << new_note
      board.save

      # Log the action
      ToCry::Log.info { "Note '#{title}' created in lane '#{lane_name}' on board '#{board_name}' by user '#{user_id}'" }

      {
        "success"    => JSON::Any.new(true),
        "id"         => JSON::Any.new(new_note.sepia_id),
        "title"      => JSON::Any.new(new_note.title),
        "content"    => JSON::Any.new(new_note.content),
        "lane_name"  => JSON::Any.new(lane_name),
        "board_name" => JSON::Any.new(board_name),
        "tags"       => JSON::Any.new(new_note.tags.map { |tag_name| JSON::Any.new(tag_name) }),
        "priority"   => JSON::Any.new(new_note.priority.to_s),
        "start_date" => new_note.start_date ? JSON::Any.new(new_note.start_date) : JSON::Any.new(nil),
        "end_date"   => new_note.end_date ? JSON::Any.new(new_note.end_date) : JSON::Any.new(nil),
        "public"     => JSON::Any.new(new_note.public),
      }
    rescue ex
      {
        "error"   => JSON::Any.new("Failed to create note: #{ex.message}"),
        "success" => JSON::Any.new(false),
      }
    end
  end
end
