require "../tocry"
require "../websocket_handler"
require "./websocket_notifier"
require "./websocket_events"
require "./response_helpers"

module ToCry::Services
  # Service layer for note operations
  # Centralizes note CRUD logic, validation, and WebSocket notifications
  class NoteService
    # Response struct for all note operations
    # Provides a consistent return type with all possible fields
    struct NoteResponse
      # ameba:disable Naming/QueryBoolMethods
      property success : Bool = false
      property message : String = ""
      property note : ToCry::Note? = nil
      property lane_name : String = ""
      property board_name : String = ""

      def initialize(@success : Bool = false, @message : String = "", @note : ToCry::Note? = nil, @lane_name : String = "", @board_name : String = "")
      end
    end

    private def self.broadcast_deletion(note_id : String, note_title : String, lane_name : String, board_name : String, user_id : String, exclude_client_id : String?)
      # Broadcast WebSocket notification using event pattern
      event = NoteDeletedEvent.new(note_id, note_title, lane_name, board_name, user_id, exclude_client_id)
      WebSocketNotifier.broadcast(event)

      ToCry::Log.info { "Note '#{note_title}' deleted from board '#{board_name}' by user '#{user_id}' with WebSocket broadcast" }
    end

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
      exclude_client_id : String? = "mcp-client",
    )
      begin
        board = ToCry.board_manager.get(board_name, user_id)
        unless board
          return NoteResponse.new(
            success: false,
            message: "Board '#{board_name}' not found for user '#{user_id}'",
            board_name: board_name
          )
        end

        # Find the target lane
        target_lane = board.lanes.find { |lane| lane.name == lane_name }
        unless target_lane
          return NoteResponse.new(
            success: false,
            message: "Lane '#{lane_name}' not found in board '#{board_name}'",
            lane_name: lane_name,
            board_name: board_name
          )
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

        # Broadcast WebSocket notification using event pattern
        event = NoteCreatedEvent.new(new_note, board_name, lane_name, user_id, exclude_client_id)
        WebSocketNotifier.broadcast(event)

        ToCry::Log.info { "Note '#{title}' created in lane '#{lane_name}' on board '#{board_name}' by user '#{user_id}' with WebSocket broadcast" }

        NoteResponse.new(
          success: true,
          message: "Note created successfully",
          note: new_note,
          lane_name: lane_name,
          board_name: board_name
        )
      rescue ex
        NoteResponse.new(
          success: false,
          message: "Failed to create note: #{ex.message}",
          lane_name: lane_name,
          board_name: board_name
        )
      end
    end

    # Update an existing note
    # ameba:disable Metrics/CyclomaticComplexity
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
      position : Int32? = nil,
      exclude_client_id : String? = "mcp-client",
    )
      begin
        board = ToCry.board_manager.get(board_name, user_id)
        unless board
          return NoteResponse.new(
            success: false,
            message: "Board '#{board_name}' not found for user '#{user_id}'",
            board_name: board_name
          )
        end

        # Find the note
        found_note_and_lane = board.note(note_id)
        unless found_note_and_lane
          return NoteResponse.new(
            success: false,
            message: "Note '#{note_id}' not found in board '#{board_name}'",
            board_name: board_name
          )
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

        unless public.nil?
          current_note.public = public
        end

        unless expanded.nil?
          current_note.expanded = expanded
        end

        # Handle lane change if specified
        final_lane_name = current_lane.name
        if new_lane_name && new_lane_name != current_lane.name
          # Find the target lane
          target_lane = board.lanes.find { |lane| lane.name == new_lane_name }
          unless target_lane
            return NoteResponse.new(
              success: false,
              message: "Target lane '#{new_lane_name}' not found in board '#{board_name}'",
              lane_name: new_lane_name,
              board_name: board_name
            )
          end

          # Remove note from current lane
          current_lane.notes.delete(current_note)

          # Add note to target lane (at the end)
          target_lane.notes << current_note
          final_lane_name = new_lane_name
        end

        # Handle position changes if specified
        if position
          # Find which lane the note is currently in after any lane change
          current_lane = board.lanes.find(&.notes.includes?(current_note))
          if current_lane
            # Remove from current position
            current_lane.notes.delete(current_note)
            # Insert at new position
            if position >= current_lane.notes.size
              current_lane.notes << current_note
            else
              current_lane.notes.insert(position, current_note)
            end
          end
        end

        # Save the board
        board.save

        # Broadcast WebSocket notification using event pattern
        event = NoteUpdatedEvent.new(current_note, board_name, final_lane_name, user_id, exclude_client_id)
        WebSocketNotifier.broadcast(event)

        ToCry::Log.info { "Note '#{current_note.title}' updated in board '#{board_name}' by user '#{user_id}' with WebSocket broadcast" }

        NoteResponse.new(
          success: true,
          message: "Note updated successfully",
          note: current_note,
          lane_name: final_lane_name,
          board_name: board_name
        )
      rescue ex
        NoteResponse.new(
          success: false,
          message: "Failed to update note: #{ex.message}",
          board_name: board_name
        )
      end
    end

    # Delete a note
    def self.delete_note(
      board_name : String,
      note_id : String,
      user_id : String,
      exclude_client_id : String? = "mcp-client",
    )
      board = ToCry.board_manager.get(board_name, user_id)
      unless board
        # Idempotent: return success if board doesn't exist (matches REST endpoint behavior)
        ToCry::Log.info { "Note '#{note_id}' deletion skipped - board '#{board_name}' doesn't exist for user '#{user_id}'" }
        return NoteResponse.new(success: true, message: "Note deleted successfully", board_name: board_name)
      end

      # Find the note
      found_note_and_lane = board.note(note_id)
      unless found_note_and_lane
        # Idempotent: return success if note doesn't exist (matches REST endpoint behavior)
        ToCry::Log.info { "Note '#{note_id}' already deleted or never existed in board '#{board_name}' by user '#{user_id}'" }
        return NoteResponse.new(success: true, message: "Note deleted successfully", board_name: board_name)
      end

      note_to_delete, lane = found_note_and_lane
      note_title = note_to_delete.title

      # Remove note from lane
      lane.notes.delete(note_to_delete)
      board.save

      # Broadcast WebSocket notification
      broadcast_deletion(note_id, note_title, lane.name, board_name, user_id, exclude_client_id)

      NoteResponse.new(success: true, message: "Note deleted successfully", board_name: board_name)
    rescue ex
      NoteResponse.new(success: false, message: "Failed to delete note: #{ex.message}", board_name: board_name)
    end

    # Find a note by ID
    def self.find_note(board_name : String, note_id : String, user_id : String)
      board = ToCry.board_manager.get(board_name, user_id)
      return nil unless board

      found_note_and_lane = board.note(note_id)
      return nil unless found_note_and_lane

      found_note_and_lane[0] # Return the note


    rescue ex
      ToCry::Log.error(exception: ex) { "Error finding note '#{note_id}' in board '#{board_name}': #{ex.message}" }
      nil
    end

    # Get complete board details with all lanes and notes
    def self.get_board_with_details(board_name : String, user_id : String)
      board = ToCry.board_manager.get(board_name, user_id)
      unless board
        return {
          success: false,
          error:   "Board '#{board_name}' not found for user '#{user_id}'",
          board:   {} of String => JSON::Any,
        }
      end

      # Build complete board representation with lanes and notes
      lanes_data = board.lanes.map do |lane|
        {
          lane_id: lane.sepia_id,
          name:    lane.name,
          notes:   lane.notes.map do |note|
            {
              sepia_id:    note.sepia_id,
              title:       note.title,
              content:     note.content,
              tags:        note.tags,
              expanded:    note.expanded,
              public:      note.public,
              attachments: note.attachments,
              start_date:  note.start_date,
              end_date:    note.end_date,
              priority:    note.priority.try(&.to_s),
            }
          end,
        }
      end

      board_details = {
        id:                 board.sepia_id,
        name:               board.name,
        color_scheme:       ToCry::ColorScheme.validate(board.color_scheme),
        first_visible_lane: board.first_visible_lane,
        public:             board.public,
        lanes:              lanes_data,
      }

      {
        success: true,
        error:   "",
        board:   board_details,
      }
    rescue ex
      {
        success: false,
        error:   "Failed to get board details: #{ex.message}",
        board:   {} of String => JSON::Any,
      }
    end

    # List all boards accessible to user
    def self.list_all_boards(user_id : String)
      user_board_refs = ToCry::BoardReference.accessible_to_user(user_id)

      boards_data = user_board_refs.compact_map do |reference|
        board = ToCry.board_manager.get_by_uuid(reference.board_uuid)
        next unless board

        {
          id:           board.sepia_id,
          name:         reference.board_name,
          lane_count:   board.lanes.size,
          public:       board.public,
          color_scheme: board.color_scheme,
        }
      end

      {
        success: true,
        error:   "",
        boards:  boards_data,
        count:   boards_data.size,
      }
    rescue ex
      {
        success: false,
        error:   "Failed to list boards: #{ex.message}",
        boards:  [] of Hash(String, JSON::Any),
        count:   0,
      }
    end
  end
end
