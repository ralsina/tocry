require "json"
require "mcp"
require "../authenticated_tool"

class SearchNotesTool < MCP::AbstractTool
  include AuthenticatedTool
  # Tool metadata declaration
  @@tool_name = "tocry_search_notes"
  @@tool_description = "Search across all notes in all boards for matching content"
  @@tool_input_schema = {
    "type"       => "object",
    "properties" => {
      "query" => {
        "type"        => "string",
        "description" => "Search query - matches in title, content, and tags",
      },
      "board_name" => {
        "type"        => "string",
        "description" => "Optional: limit search to specific board",
      },
      "priority_filter" => {
        "type"        => "string",
        "description" => "Optional: filter by priority (high, medium, low)",
      },
      "limit" => {
        "type"        => "integer",
        "description" => "Optional: maximum number of results to return",
      },
    },
    "required" => ["query"],
  }.to_json

  # ameba:disable Metrics/CyclomaticComplexity
  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : Hash(String, JSON::Any) | Hash(String, Array(JSON::Any))
    query = params["query"].as_s.downcase
    board_name = params["board_name"]?.try(&.as_s)
    priority_filter = params["priority_filter"]?.try(&.as_s)
    limit = params["limit"]?.try(&.as_i)

    begin
      # Get the board manager
      board_manager = ToCry.board_manager

      # Determine which boards to search
      boards_to_search = if board_name
                           target_board = board_manager.get(board_name, user_id)
                           target_board ? [target_board] : [] of ToCry::Board
                         else
                           # Search all boards for the user
                           board_uuids = board_manager.list(user_id)
                           board_uuids.compact_map { |uuid| board_manager.get_by_uuid(uuid) }
                         end

      results = [] of Hash(String, String | Bool | Nil | Array(String))

      boards_to_search.each do |current_board|
        current_board.lanes.each do |lane|
          lane.notes.each do |note|
            # Search in title, content, and tags
            matches_query = note.title.downcase.includes?(query) ||
                            note.content.downcase.includes?(query) ||
                            note.tags.any?(&.downcase.includes?(query))

            # Filter by priority if specified
            matches_priority = priority_filter.nil? || note.priority.to_s == priority_filter

            if matches_query && matches_priority
              results << {
                "id"          => note.sepia_id,
                "title"       => note.title,
                "content"     => note.content,
                "board_name"  => current_board.name,
                "board_id"    => current_board.sepia_id,
                "lane_name"   => lane.name,
                "tags"        => note.tags.map { |tag_name| tag_name },
                "priority"    => note.priority.to_s,
                "start_date"  => note.start_date ? note.start_date : nil,
                "end_date"    => note.end_date ? note.end_date : nil,
                "public"      => note.public,
                "attachments" => note.attachments.map { |attachment| attachment },
              }
            end
          end
        end
      end

      # Apply limit if specified
      if limit && limit > 0
        results = results.first(limit)
      end

      {
        "success"         => JSON::Any.new(true),
        "count"           => JSON::Any.new(results.size),
        "query"           => JSON::Any.new(query),
        "boards_searched" => JSON::Any.new(boards_to_search.size),
      }
    rescue ex
      {
        "success"         => JSON::Any.new(false),
        "error"           => JSON::Any.new("Search failed: #{ex.message}"),
        "count"           => JSON::Any.new(0),
        "query"           => JSON::Any.new(query),
        "boards_searched" => JSON::Any.new(0),
      }
    end
  end
end
