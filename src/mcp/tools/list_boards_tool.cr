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

  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : Hash(String, JSON::Any)
    # Use NoteService to list all boards (handles all business logic)
    result = ToCry::Services::NoteService.list_all_boards(user_id)

    if result[:success]
      # Transform service response to match MCP tool format
      boards_data = result[:boards].map do |board|
        {
          "id"           => JSON::Any.new(board["id"].as(String)),
          "name"         => JSON::Any.new(board["name"].as(String)),
          "lane_count"   => JSON::Any.new(board["lane_count"].as(Int32)),
          "public"       => JSON::Any.new(board["public"].as(Bool)),
          "color_scheme" => board["color_scheme"].nil? ? JSON::Any.new(nil) : JSON::Any.new(board["color_scheme"].as(String)),
        }
      end

      {
        "success" => JSON::Any.new(true),
        "boards"  => JSON::Any.new(boards_data.map { |board_data| JSON::Any.new(board_data) }),
        "count"   => JSON::Any.new(boards_data.size),
      }
    else
      {
        "success" => JSON::Any.new(false),
        "error"   => JSON::Any.new(result[:error]),
        "boards"  => JSON::Any.new([] of JSON::Any),
        "count"   => JSON::Any.new(0),
      }
    end
  end
end
