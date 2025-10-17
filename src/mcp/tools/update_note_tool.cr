require "json"
require "../tool"

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
        }),
        "required" => JSON::Any.new(["note_id", "board_name"].map { |param| JSON::Any.new(param) }),
      },
    )
  end

  def invoke(params : Hash(String, JSON::Any)) : Hash(String, JSON::Any)
    # Not used - authentication required for all tools
    raise "Authentication required"
  end

  # ameba:disable Metrics/CyclomaticComplexity
  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : Hash(String, JSON::Any)
    note_id = params["note_id"].as_s
    board_name = params["board_name"].as_s

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

      # Find the note
      found_note_and_lane = board.note(note_id)
      unless found_note_and_lane
        return {
          "error" => JSON::Any.new("Note '#{note_id}' not found in board '#{board_name}'"),
        }
      end

      current_note, current_lane = found_note_and_lane

      # Update note properties if provided
      if title = params["title"]?
        current_note.title = title.as_s
      end

      if content = params["content"]?
        current_note.content = content.as_s
      end

      if tags_array = params["tags"]?
        current_note.tags = tags_array.as_a.map(&.as_s)
      end

      if priority_str = params["priority"]?
        priority = case priority_str.as_s
                   when "high"   then ToCry::Priority::High
                   when "medium" then ToCry::Priority::Medium
                   when "low"    then ToCry::Priority::Low
                   else               nil
                   end
        current_note.priority = priority
      end

      if start_date = params["start_date"]?
        current_note.start_date = start_date.as_s
      end

      if end_date = params["end_date"]?
        current_note.end_date = end_date.as_s
      end

      if public_val = params["public"]?
        current_note.public = public_val.as_bool
      end

      # Handle lane change if specified
      if new_lane_name = params["new_lane_name"]?
        new_lane_name = new_lane_name.as_s

        # Only move if lane is different
        if new_lane_name != current_lane.name
          # Find the target lane
          target_lane = board.lanes.find { |lane| lane.name == new_lane_name }
          unless target_lane
            return {
              "error" => JSON::Any.new("Target lane '#{new_lane_name}' not found in board '#{board_name}'"),
            }
          end

          # Remove note from current lane
          current_lane.notes.delete(current_note)

          # Add note to target lane (at the end)
          target_lane.notes << current_note

          ToCry::Log.info { "Note '#{current_note.title}' moved from '#{current_lane.name}' to '#{new_lane_name}'" }
        end
      end

      # Save the board
      board.save

      ToCry::Log.info { "Note '#{current_note.title}' updated in board '#{board_name}' by user '#{user_id}'" }

      {
        "success"    => JSON::Any.new(true),
        "id"         => JSON::Any.new(current_note.sepia_id),
        "title"      => JSON::Any.new(current_note.title),
        "content"    => JSON::Any.new(current_note.content),
        "lane_name"  => JSON::Any.new(new_lane_name ? new_lane_name : current_lane.name),
        "board_name" => JSON::Any.new(board_name),
        "tags"       => JSON::Any.new(current_note.tags.map { |tag| JSON::Any.new(tag) }),
        "priority"   => JSON::Any.new(current_note.priority.to_s),
        "start_date" => current_note.start_date ? JSON::Any.new(current_note.start_date) : JSON::Any.new(nil),
        "end_date"   => current_note.end_date ? JSON::Any.new(current_note.end_date) : JSON::Any.new(nil),
        "public"     => JSON::Any.new(current_note.public),
      }
    rescue ex
      {
        "error"   => JSON::Any.new("Failed to update note: #{ex.message}"),
        "success" => JSON::Any.new(false),
      }
    end
  end
end
