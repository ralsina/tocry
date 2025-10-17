require "../tocry"
require "../websocket_handler"
require "./websocket_notifier"

module ToCry::Services
  # Service layer for board operations
  # Centralizes board CRUD logic, validation, and WebSocket notifications
  class BoardService
    # Create a new board
    def self.create_board(
      board_name : String,
      user_id : String,
      public : Bool? = false,
      color_scheme : String? = nil,
      exclude_client_id : String? = "mcp-client"
    )
      begin
        # Create the board
        board = ToCry.board_manager.create(board_name, user_id)
        unless board
          return {
            success:      false,
            error:        "Failed to create board '#{board_name}'",
            id:           "",
            name:         board_name,
            public:       false,
            color_scheme: JSON::Any.new(nil),
            lane_count:   0,
            total_notes:  0,
          }
        end

        # Set additional properties
        board.public = public if public
        board.color_scheme = color_scheme if color_scheme

        # Save the board
        board.save

        # Prepare board data for WebSocket broadcast
        board_data = {
          "id"           => JSON::Any.new(board.sepia_id),
          "name"         => JSON::Any.new(board_name),
          "public"       => JSON::Any.new(board.public),
          "color_scheme" => JSON::Any.new(board.color_scheme),
          "lane_count"   => JSON::Any.new(board.lanes.size),
          "total_notes"  => JSON::Any.new(board.lanes.sum(&.notes.size)),
        }

        # Broadcast WebSocket notification
        WebSocketNotifier.broadcast_board_change(
          WebSocketHandler::MessageType::BOARD_CREATED,
          board_name,
          board_data,
          user_id,
          exclude_client_id
        )

        ToCry::Log.info { "Board '#{board_name}' created by user '#{user_id}' with WebSocket broadcast" }

        {
          success:      true,
          id:           board.sepia_id,
          name:         board_name,
          public:       board.public,
          color_scheme: board.color_scheme ? JSON::Any.new(board.color_scheme) : JSON::Any.new(nil),
          lane_count:   board.lanes.size,
          total_notes:  board.lanes.sum(&.notes.size),
          error:        "",
        }
      rescue ex
        {
          success:      false,
          error:        "Failed to create board: #{ex.message}",
          id:           "",
          name:         "",
          public:       false,
          color_scheme: JSON::Any.new(nil),
          lane_count:   0,
          total_notes:  0,
        }
      end
    end

    # Update a board
    def self.update_board(
      board_name : String,
      user_id : String,
      new_board_name : String? = nil,
      public : Bool? = nil,
      color_scheme : String? = nil,
      lanes : Array(Hash(String, JSON::Any))? = nil,
      exclude_client_id : String? = "mcp-client"
    )
      begin
        board = ToCry.board_manager.get(board_name, user_id)
        unless board
          return {
            success:        false,
            error:          "Board '#{board_name}' not found for user '#{user_id}'",
            id:             "",
            old_name:       board_name,
            new_name:       "",
            public:         false,
            color_scheme:   JSON::Any.new(nil),
            lane_count:     0,
            total_notes:    0,
          }
        end

        old_board_name = board_name
        final_board_name = board_name
        has_changes = false

        # Handle board rename
        if new_board_name && new_board_name != old_board_name
          # Check if new name already exists
          existing_board = ToCry.board_manager.get(new_board_name, user_id)
          if existing_board
            return {
              success:        false,
              error:          "Board with name '#{new_board_name}' already exists",
              id:             "",
              old_name:       old_board_name,
              new_name:       new_board_name,
              public:         false,
              color_scheme:   JSON::Any.new(nil),
              lane_count:     0,
              total_notes:    0,
            }
          end

          # Rename the board
          ToCry.board_manager.rename(old_board_name, new_board_name, user_id)
          final_board_name = new_board_name
          has_changes = true
        end

        # Update board properties
        if public != nil
          board.public = public.not_nil!
          has_changes = true
        end

        if color_scheme
          board.color_scheme = color_scheme
          has_changes = true
        end

        # Handle lanes update (basic implementation)
        if lanes
          new_lanes = [] of ToCry::Lane

          lanes.each do |lane_data|
            lane_name = lane_data["name"]?.try(&.as_s)
            if lane_name
              # Find existing lane or create new one
              existing_lane = board.lanes.find { |lane| lane.name == lane_name }
              if existing_lane
                new_lanes << existing_lane
              else
                new_lanes << ToCry::Lane.new(lane_name)
              end
            end
          end

          board.lanes = new_lanes
          has_changes = true
        end

        # Save if there were changes
        if has_changes
          board.save
        end

        # Prepare board data for WebSocket broadcast
        board_data = {
          "id"           => JSON::Any.new(board.sepia_id),
          "name"         => JSON::Any.new(final_board_name),
          "public"       => JSON::Any.new(board.public),
          "color_scheme" => JSON::Any.new(board.color_scheme),
          "lane_count"   => JSON::Any.new(board.lanes.size),
          "total_notes"  => JSON::Any.new(board.lanes.sum(&.notes.size)),
        }

        # Determine message type based on whether board was renamed
        message_type = old_board_name != final_board_name ?
                        WebSocketHandler::MessageType::BOARD_UPDATED :
                        WebSocketHandler::MessageType::LANE_UPDATED

        # Broadcast WebSocket notification
        WebSocketNotifier.broadcast_board_change(
          message_type,
          final_board_name,
          board_data,
          user_id,
          exclude_client_id
        )

        ToCry::Log.info { "Board '#{old_board_name}' updated to '#{final_board_name}' by user '#{user_id}' with WebSocket broadcast" }

        {
          success:        true,
          id:             board.sepia_id,
          old_name:       old_board_name,
          new_name:       final_board_name,
          public:         board.public,
          color_scheme:   board.color_scheme ? JSON::Any.new(board.color_scheme) : JSON::Any.new(nil),
          lane_count:     board.lanes.size,
          total_notes:    board.lanes.sum(&.notes.size),
          error:          "",
        }
      rescue ex
        {
          success:        false,
          error:          "Failed to update board: #{ex.message}",
          id:             "",
          old_name:       board_name,
          new_name:       "",
          public:         false,
          color_scheme:   JSON::Any.new(nil),
          lane_count:     0,
          total_notes:    0,
        }
      end
    end

    # Delete a board
    def self.delete_board(
      board_name : String,
      user_id : String,
      exclude_client_id : String? = "mcp-client"
    )
      begin
        # Check if board exists and user has access
        board = ToCry.board_manager.get(board_name, user_id)
        unless board
          return {
            success: false,
            error:   "Board '#{board_name}' not found for user '#{user_id}'",
            message: JSON::Any.new(""),
            id:      JSON::Any.new(""),
            name:    JSON::Any.new(board_name),
          }
        end

        board_id = board.sepia_id

        # Delete the board
        ToCry.board_manager.delete(board_name, user_id)

        # Prepare board data for WebSocket broadcast
        board_data = {
          "id"   => JSON::Any.new(board_id),
          "name" => JSON::Any.new(board_name),
        }

        # Broadcast WebSocket notification
        WebSocketNotifier.broadcast_board_change(
          WebSocketHandler::MessageType::BOARD_DELETED,
          board_name,
          board_data,
          user_id,
          exclude_client_id
        )

        ToCry::Log.info { "Board '#{board_name}' deleted by user '#{user_id}' with WebSocket broadcast" }

        {
          success: true,
          message: JSON::Any.new("Board '#{board_name}' deleted successfully"),
          id:      JSON::Any.new(board_id),
          name:    JSON::Any.new(board_name),
          error:   "",
        }
      rescue ex
        {
          success: false,
          error:   "Failed to delete board: #{ex.message}",
          message: JSON::Any.new(""),
          id:      JSON::Any.new(""),
          name:    JSON::Any.new(board_name),
        }
      end
    end

    # Get a board by name
    def self.get_board(board_name : String, user_id : String)
      begin
        board = ToCry.board_manager.get(board_name, user_id)
        return nil unless board

        # Convert to hash format similar to what MCP tools return
        {
          id:           board.sepia_id,
          name:         board_name,
          lanes:        board.lanes.map { |lane| lane.to_hash },
          public:       board.public,
          color_scheme: board.color_scheme,
          lane_count:   board.lanes.size,
          total_notes:  board.lanes.sum(&.notes.size),
        }
      rescue ex
        ToCry::Log.error(exception: ex) { "Error getting board '#{board_name}': #{ex.message}" }
        nil
      end
    end

    # List boards accessible to a user
    def self.list_boards(user_id : String)
      begin
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
          boards: boards_data.map { |board_data| JSON::Any.new(board_data) },
          count:  boards_data.size,
        }
      rescue ex
        ToCry::Log.error(exception: ex) { "Error listing boards for user '#{user_id}': #{ex.message}" }
        {
          boards: JSON::Any.new([] of JSON::Any),
          count:  JSON::Any.new(0),
        }
      end
    end
  end
end
