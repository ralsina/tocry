require "json"
require "../tool"
require "../../services/note_service"
require "../authenticated_tool"

class GetBoardTool < Tool
  include AuthenticatedTool
  # Tool metadata declaration
  @@tool_name = "tocry_get_board"
  @@tool_description = "Get complete board structure with all lanes and notes"
  @@tool_input_schema = {
    "type"       => JSON::Any.new("object"),
    "properties" => JSON::Any.new({
      "board_name" => JSON::Any.new({
        "type"        => JSON::Any.new("string"),
        "description" => JSON::Any.new("Name of the board to retrieve"),
      }),
    }),
    "required" => JSON::Any.new(["board_name"].map { |param| JSON::Any.new(param) }),
  }

  # Register this tool when the file is loaded
  Tool.registered_tools[@@tool_name] = new

  # invoke() method is provided by AuthenticatedTool mixin

  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : String
    board_name = params["board_name"].as_s

    # Use NoteService to get board details (handles all validation and data transformation)
    result = ToCry::Services::NoteService.get_board_with_details(board_name, user_id)

    if result[:success]
      board_data = result[:board]

      # Convert service response to JSON and back to ensure proper JSON::Any format
      board_json = board_data.to_json
      board_parsed = JSON.parse(board_json)

      # Transform service response to match MCP tool format
      {
        "success"      => true,
        "id"           => board_parsed["id"],
        "name"         => board_name, # Use the user-specific board name that was requested
        "lanes"        => board_parsed["lanes"],
        "public"       => board_parsed["public"],
        "color_scheme" => board_parsed["color_scheme"],
        "lane_count"   => board_parsed["lanes"].as_a.size,
        "total_notes"  => board_parsed["lanes"].as_a.sum(&.["notes"].as_a.size),
      }.to_json
    else
      {
        "success" => false,
        "error"   => result[:error],
      }.to_json
    end
  end
end
