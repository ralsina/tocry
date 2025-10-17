require "json"
require "../tool"

class SearchNotesTool < Tool
  def initialize
    super(
      name: "tocry_search_notes",
      description: "Search across all notes in all boards for matching content",
      input_schema: {
        "type"       => JSON::Any.new("object"),
        "properties" => JSON::Any.new({
          "query" => JSON::Any.new({
            "type"        => JSON::Any.new("string"),
            "description" => JSON::Any.new("Search query - matches in title, content, and tags"),
          }),
          "board_name" => JSON::Any.new({
            "type"        => JSON::Any.new("string"),
            "description" => JSON::Any.new("Optional: limit search to specific board"),
          }),
          "priority_filter" => JSON::Any.new({
            "type"        => JSON::Any.new("string"),
            "description" => JSON::Any.new("Optional: filter by priority (high, medium, low)"),
          }),
          "limit" => JSON::Any.new({
            "type"        => JSON::Any.new("integer"),
            "description" => JSON::Any.new("Optional: maximum number of results to return"),
          }),
        }),
        "required" => JSON::Any.new(["query"].map { |param_name| JSON::Any.new(param_name) }),
      },
    )
  end

  def invoke(params : Hash(String, JSON::Any)) : Hash(String, JSON::Any)
    # Not used - authentication required for all tools
    raise "Authentication required"
  end

  # ameba:disable Metrics/CyclomaticComplexity
  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : Hash(String, JSON::Any)
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

      results = [] of Hash(String, JSON::Any)

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
                "id"          => JSON::Any.new(note.sepia_id),
                "title"       => JSON::Any.new(note.title),
                "content"     => JSON::Any.new(note.content),
                "board_name"  => JSON::Any.new(current_board.name),
                "board_id"    => JSON::Any.new(current_board.sepia_id),
                "lane_name"   => JSON::Any.new(lane.name),
                "tags"        => JSON::Any.new(note.tags.map { |tag_name| JSON::Any.new(tag_name) }),
                "priority"    => JSON::Any.new(note.priority.to_s),
                "start_date"  => note.start_date ? JSON::Any.new(note.start_date) : JSON::Any.new(nil),
                "end_date"    => note.end_date ? JSON::Any.new(note.end_date) : JSON::Any.new(nil),
                "public"      => JSON::Any.new(note.public),
                "attachments" => JSON::Any.new(note.attachments.map { |attachment| JSON::Any.new(attachment) }),
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
        "results"         => JSON::Any.new(results.map { |result| JSON::Any.new(result) }),
        "count"           => JSON::Any.new(results.size),
        "query"           => JSON::Any.new(query),
        "boards_searched" => JSON::Any.new(boards_to_search.size),
      }
    rescue ex
      {
        "error"   => JSON::Any.new("Search failed: #{ex.message}"),
        "results" => JSON::Any.new([] of JSON::Any),
        "count"   => JSON::Any.new(0),
      }
    end
  end
end
