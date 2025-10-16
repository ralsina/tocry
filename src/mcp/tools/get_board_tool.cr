require "json"

class GetBoardTool < ModelContextProtocol::Server::Tool
  def initialize
    super(
      name: "tocry_get_board",
      description: "Get complete board structure with all lanes and notes",
      parameters: {
        "type"       => JSON::Any.new("object"),
        "properties" => JSON::Any.new({
          "board_name" => JSON::Any.new({
            "type"        => JSON::Any.new("string"),
            "description" => JSON::Any.new("Name of the board to retrieve"),
          }),
        }),
        "required" => JSON::Any.new(["board_name"].map { |param| JSON::Any.new(param) }),
      },
      required_parameters: ["board_name"]
    )
  end

  def invoke(params : Hash(String, JSON::Any)) : Hash(String, JSON::Any)
    # Not used - authentication required for all tools
    raise "Authentication required"
  end

  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : Hash(String, JSON::Any)
    board_name = params["board_name"].as_s

    begin
      # Get the board manager
      board_manager = ToCry.board_manager

      # Get the specific board
      board = board_manager.get(board_name, user_id)

      unless board
        return {
          "error" => JSON::Any.new("Board '#{board_name}' not found for user '#{user_id}'"),
        }
      end

      # Serialize lanes with all notes
      lanes_data = board.lanes.map do |lane|
        notes_data = lane.notes.map do |note|
          {
            "id"          => JSON::Any.new(note.sepia_id),
            "title"       => JSON::Any.new(note.title),
            "content"     => JSON::Any.new(note.content),
            "tags"        => JSON::Any.new(note.tags.map { |tag| JSON::Any.new(tag) }),
            "priority"    => JSON::Any.new(note.priority.to_s),
            "start_date"  => note.start_date ? JSON::Any.new(note.start_date) : JSON::Any.new(nil),
            "end_date"    => note.end_date ? JSON::Any.new(note.end_date) : JSON::Any.new(nil),
            "public"      => JSON::Any.new(note.public),
            "attachments" => JSON::Any.new(note.attachments.map { |attachment| JSON::Any.new(attachment) }),
            "expanded"    => JSON::Any.new(note.expanded),
          }
        end

        {
          "name"       => JSON::Any.new(lane.name),
          "notes"      => JSON::Any.new(notes_data.map { |note_data| JSON::Any.new(note_data) }),
          "note_count" => JSON::Any.new(lane.notes.size),
        }
      end

      {
        "id"           => JSON::Any.new(board.sepia_id),
        "name"         => JSON::Any.new(board.name),
        "lanes"        => JSON::Any.new(lanes_data.map { |lane_data| JSON::Any.new(lane_data) }),
        "public"       => JSON::Any.new(board.public),
        "color_scheme" => board.color_scheme ? JSON::Any.new(board.color_scheme) : JSON::Any.new(nil),
        "lane_count"   => JSON::Any.new(board.lanes.size),
        "total_notes"  => JSON::Any.new(board.lanes.sum(&.notes.size)),
      }
    rescue ex
      {
        "error" => JSON::Any.new("Failed to get board: #{ex.message}"),
      }
    end
  end
end
