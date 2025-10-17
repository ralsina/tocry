require "../tocry"
require "../websocket_handler"
require "./websocket_notifier"

module ToCry::Services
  # Service layer for note operations
  # Centralizes note CRUD logic, validation, and WebSocket notifications
  class NoteService
    # Create a new note in a specific lane
    def self.create_note(
      board_name : String,
      lane_name : String,
      title : String,
      user_id : String,
      content : String? = nil,
      tags : Array(String)? = nil,
      priority : String? = nil,
      start_date : String? = nil,
      end_date : String? = nil,
      public : Bool? = false,
      expanded : Bool? = false,
      exclude_client_id : String? = "mcp-client"
    )
      begin
        board = ToCry.board_manager.get(board_name, user_id)
        unless board
          return {
            success: false,
            error:   "Board '#{board_name}' not found for user '#{user_id}'",
            id:      "",
            title:   "",
            content: "",
            lane_name: "",
            board_name: board_name,
            tags:    [] of JSON::Any,
            priority: "",
            start_date: JSON::Any.new(nil),
            end_date: JSON::Any.new(nil),
            public:  JSON::Any.new(false),
          }
        end

        # Find the target lane
        target_lane = board.lanes.find { |lane| lane.name == lane_name }
        unless target_lane
          return {
            success: false,
            error:   "Lane '#{lane_name}' not found in board '#{board_name}'",
            id:      "",
            title:   "",
            content: "",
            lane_name: lane_name,
            board_name: board_name,
            tags:    [] of JSON::Any,
            priority: "",
            start_date: JSON::Any.new(nil),
            end_date: JSON::Any.new(nil),
            public:  JSON::Any.new(false),
          }
        end

        # Parse priority
        priority_enum = case priority
                     when "high"   then ToCry::Priority::High
                     when "medium" then ToCry::Priority::Medium
                     when "low"    then ToCry::Priority::Low
                     else               nil
                     end

        # Create new note
        new_note = ToCry::Note.new(
          title: title,
          tags: tags || [] of String,
          content: content || "",
          expanded: expanded || false,
          public: public || false,
          attachments: [] of String,
          start_date: start_date,
          end_date: end_date,
          priority: priority_enum
        )

        # Add note to the lane
        target_lane.notes << new_note
        board.save

        # Prepare note data for WebSocket broadcast
        note_data = {
          "id"         => JSON::Any.new(new_note.sepia_id),
          "title"      => JSON::Any.new(new_note.title),
          "content"    => JSON::Any.new(new_note.content),
          "lane_name"  => JSON::Any.new(lane_name),
          "tags"       => JSON::Any.new(new_note.tags.map { |tag| JSON::Any.new(tag) }),
          "priority"   => JSON::Any.new(new_note.priority.to_s),
          "start_date" => JSON::Any.new(new_note.start_date),
          "end_date"   => JSON::Any.new(new_note.end_date),
          "public"     => JSON::Any.new(new_note.public),
          "expanded"   => JSON::Any.new(new_note.expanded),
          "attachments" => JSON::Any.new(new_note.attachments.map { |attachment| JSON::Any.new(attachment) }),
        }

        # Broadcast WebSocket notification
        WebSocketNotifier.broadcast_note_change(
          WebSocketHandler::MessageType::NOTE_CREATED,
          board_name,
          note_data,
          user_id,
          exclude_client_id
        )

        ToCry::Log.info { "Note '#{title}' created in lane '#{lane_name}' on board '#{board_name}' by user '#{user_id}' with WebSocket broadcast" }

        {
          success:    true,
          id:         new_note.sepia_id,
          title:      new_note.title,
          content:    new_note.content,
          lane_name:  lane_name,
          board_name: board_name,
          tags:       new_note.tags.map { |tag_name| JSON::Any.new(tag_name) },
          priority:   new_note.priority.to_s,
          start_date: new_note.start_date ? JSON::Any.new(new_note.start_date) : JSON::Any.new(nil),
          end_date:   new_note.end_date ? JSON::Any.new(new_note.end_date) : JSON::Any.new(nil),
          public:     JSON::Any.new(new_note.public),
          error:      "",
        }
      rescue ex
        {
          success: false,
          error:   "Failed to create note: #{ex.message}",
          id:      "",
          title:   "",
          content: "",
          lane_name: lane_name,
          board_name: board_name,
          tags:    [] of JSON::Any,
          priority: "",
          start_date: JSON::Any.new(nil),
          end_date: JSON::Any.new(nil),
          public:  JSON::Any.new(false),
        }
      end
    end

    # Update an existing note
    def self.update_note(
      board_name : String,
      note_id : String,
      user_id : String,
      title : String? = nil,
      content : String? = nil,
      tags : Array(String)? = nil,
      priority : String? = nil,
      start_date : String? = nil,
      end_date : String? = nil,
      public : Bool? = nil,
      expanded : Bool? = nil,
      new_lane_name : String? = nil,
      exclude_client_id : String? = "mcp-client"
    )
      begin
        board = ToCry.board_manager.get(board_name, user_id)
        unless board
          return {
            success: false,
            error:   "Board '#{board_name}' not found for user '#{user_id}'",
            id:      "",
            title:   "",
            content: "",
            lane_name: "",
            board_name: board_name,
            tags:    [] of JSON::Any,
            priority: "",
            start_date: JSON::Any.new(nil),
            end_date: JSON::Any.new(nil),
            public:  JSON::Any.new(false),
          }
        end

        # Find the note
        found_note_and_lane = board.note(note_id)
        unless found_note_and_lane
          return {
            success: false,
            error:   "Note '#{note_id}' not found in board '#{board_name}'",
            id:      "",
            title:   "",
            content: "",
            lane_name: "",
            board_name: board_name,
            tags:    [] of JSON::Any,
            priority: "",
            start_date: JSON::Any.new(nil),
            end_date: JSON::Any.new(nil),
            public:  JSON::Any.new(false),
          }
        end

        current_note, current_lane = found_note_and_lane

        # Update note properties if provided
        if title
          current_note.title = title
        end

        if content
          current_note.content = content
        end

        if tags
          current_note.tags = tags
        end

        if priority
          priority_enum = case priority
                        when "high"   then ToCry::Priority::High
                        when "medium" then ToCry::Priority::Medium
                        when "low"    then ToCry::Priority::Low
                        else               nil
                        end
          current_note.priority = priority_enum
        end

        if start_date
          current_note.start_date = start_date
        end

        if end_date
          current_note.end_date = end_date
        end

        if public != nil
          current_note.public = public.not_nil!
        end

        if expanded != nil
          current_note.expanded = expanded.not_nil!
        end

        # Handle lane change if specified
        final_lane_name = current_lane.name
        if new_lane_name && new_lane_name != current_lane.name
          # Find the target lane
          target_lane = board.lanes.find { |lane| lane.name == new_lane_name }
          unless target_lane
            return {
              success: false,
              error:   "Target lane '#{new_lane_name}' not found in board '#{board_name}'",
              id:      "",
              title:   "",
              content: "",
              lane_name: new_lane_name,
              board_name: board_name,
              tags:    [] of JSON::Any,
              priority: "",
              start_date: JSON::Any.new(nil),
              end_date: JSON::Any.new(nil),
              public:  JSON::Any.new(false),
            }
          end

          # Remove note from current lane
          current_lane.notes.delete(current_note)

          # Add note to target lane (at the end)
          target_lane.notes << current_note
          final_lane_name = new_lane_name
        end

        # Save the board
        board.save

        # Prepare note data for WebSocket broadcast
        note_data = {
          "id"         => JSON::Any.new(current_note.sepia_id),
          "title"      => JSON::Any.new(current_note.title),
          "content"    => JSON::Any.new(current_note.content),
          "lane_name"  => JSON::Any.new(final_lane_name),
          "tags"       => JSON::Any.new(current_note.tags.map { |tag| JSON::Any.new(tag) }),
          "priority"   => JSON::Any.new(current_note.priority.to_s),
          "start_date" => JSON::Any.new(current_note.start_date),
          "end_date"   => JSON::Any.new(current_note.end_date),
          "public"     => JSON::Any.new(current_note.public),
          "expanded"   => JSON::Any.new(current_note.expanded),
        }

        # Determine message type based on whether note was moved between lanes
        message_type = if new_lane_name && new_lane_name != current_lane.name
                        WebSocketHandler::MessageType::LANE_UPDATED
                      else
                        WebSocketHandler::MessageType::NOTE_UPDATED
                      end

        # Broadcast WebSocket notification
        WebSocketNotifier.broadcast_note_change(
          message_type,
          board_name,
          note_data,
          user_id,
          exclude_client_id
        )

        ToCry::Log.info { "Note '#{current_note.title}' updated in board '#{board_name}' by user '#{user_id}' with WebSocket broadcast" }

        {
          success:    true,
          id:         current_note.sepia_id,
          title:      current_note.title,
          content:    current_note.content,
          lane_name:  final_lane_name,
          board_name: board_name,
          tags:       current_note.tags.map { |tag| JSON::Any.new(tag) },
          priority:   current_note.priority.to_s,
          start_date: current_note.start_date ? JSON::Any.new(current_note.start_date) : JSON::Any.new(nil),
          end_date:   current_note.end_date ? JSON::Any.new(current_note.end_date) : JSON::Any.new(nil),
          public:     JSON::Any.new(current_note.public),
          error:      "",
        }
      rescue ex
        {
          success: false,
          error:   "Failed to update note: #{ex.message}",
          id:      "",
          title:   "",
          content: "",
          lane_name: "",
          board_name: board_name,
          tags:    [] of JSON::Any,
          priority: "",
          start_date: JSON::Any.new(nil),
          end_date: JSON::Any.new(nil),
          public:  JSON::Any.new(false),
        }
      end
    end

    # Delete a note
    def self.delete_note(
      board_name : String,
      note_id : String,
      user_id : String,
      exclude_client_id : String? = "mcp-client"
    )
      begin
        board = ToCry.board_manager.get(board_name, user_id)
        unless board
          return {
            success: false,
            error:   "Board '#{board_name}' not found for user '#{user_id}'",
            id:      "",
            title:   "",
            content: "",
            lane_name: "",
            board_name: board_name,
            tags:    [] of JSON::Any,
            priority: "",
            start_date: JSON::Any.new(nil),
            end_date: JSON::Any.new(nil),
            public:  JSON::Any.new(false),
          }
        end

        # Find the note
        found_note_and_lane = board.note(note_id)
        unless found_note_and_lane
          return {
            success: false,
            error:   "Note '#{note_id}' not found in board '#{board_name}'",
            id:      "",
            title:   "",
            content: "",
            lane_name: "",
            board_name: board_name,
            tags:    [] of JSON::Any,
            priority: "",
            start_date: JSON::Any.new(nil),
            end_date: JSON::Any.new(nil),
            public:  JSON::Any.new(false),
          }
        end

        note_to_delete, lane = found_note_and_lane
        note_title = note_to_delete.title

        # Remove note from lane
        lane.notes.delete(note_to_delete)
        board.save

        # Prepare note data for WebSocket broadcast
        note_data = {
          "id"       => JSON::Any.new(note_id),
          "title"    => JSON::Any.new(note_title),
          "lane_name"=> JSON::Any.new(lane.name),
        }

        # Broadcast WebSocket notification
        WebSocketNotifier.broadcast_note_change(
          WebSocketHandler::MessageType::NOTE_DELETED,
          board_name,
          note_data,
          user_id,
          exclude_client_id
        )

        ToCry::Log.info { "Note '#{note_title}' deleted from board '#{board_name}' by user '#{user_id}' with WebSocket broadcast" }

        {
          success:    true,
          id:         note_id,
          title:      note_title,
          content:    "",
          lane_name:  lane.name,
          board_name: board_name,
          tags:    [] of JSON::Any,
          priority: "",
          start_date: JSON::Any.new(nil),
          end_date: JSON::Any.new(nil),
          public:  JSON::Any.new(false),
          error:      "",
        }
      rescue ex
        {
          success: false,
          error:   "Failed to delete note: #{ex.message}",
          id:      "",
          title:   "",
          content: "",
          lane_name: "",
          board_name: board_name,
          tags:    [] of JSON::Any,
          priority: "",
          start_date: JSON::Any.new(nil),
          end_date: JSON::Any.new(nil),
          public:  JSON::Any.new(false),
        }
      end
    end

    # Find a note by ID
    def self.find_note(board_name : String, note_id : String, user_id : String)
      begin
        board = ToCry.board_manager.get(board_name, user_id)
        return nil unless board

        found_note_and_lane = board.note(note_id)
        return nil unless found_note_and_lane

        found_note_and_lane[0] # Return the note
      rescue ex
        ToCry::Log.error(exception: ex) { "Error finding note '#{note_id}' in board '#{board_name}': #{ex.message}" }
        nil
      end
    end
  end
end
