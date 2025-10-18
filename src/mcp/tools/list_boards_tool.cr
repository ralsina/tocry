require "json"
require "../tool"
require "../../services/note_service"
require "../authenticated_tool"

class ListBoardsTool < Tool
  include AuthenticatedTool
  # Tool metadata declaration
  @@tool_name = "tocry_list_boards"
  @@tool_description = "List all accessible Kanban boards for the current user"
  @@tool_input_schema = {
    "type"       => JSON::Any.new("object"),
    "properties" => JSON::Any.new({} of String => JSON::Any),
  }

  # Register this tool when the file is loaded
  Tool.registered_tools[@@tool_name] = new

  # invoke() method is provided by AuthenticatedTool mixin

  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : String
    # Use NoteService to list all boards (handles all business logic)
    result = ToCry::Services::NoteService.list_all_boards(user_id)

    if result[:success]
      # Transform service response to match MCP tool format
      boards_data = result[:boards].map do |board|
        {
          "id"           => board["id"].as(String),
          "name"         => board["name"].as(String),
          "lane_count"   => board["lane_count"].as(Int32),
          "public"       => board["public"].as(Bool),
          "color_scheme" => board["color_scheme"].nil? ? nil : board["color_scheme"].as(String),
        }
      end

      {
        "success" => true,
        "boards"  => boards_data,
        "count"   => boards_data.size,
      }.to_json
    else
      {
        "success" => false,
        "error"   => result[:error],
        "boards"  => [] of Hash(String, String | Int32 | Bool | Nil),
        "count"   => 0,
      }.to_json
    end
  end
end
