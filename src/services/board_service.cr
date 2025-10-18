require "../tocry"
require "../websocket_handler"
require "./websocket_notifier"
require "./websocket_events"
require "./response_helpers"

module ToCry::Services
  # Service layer for board operations
  # Centralizes board CRUD logic, validation, and WebSocket notifications
  class BoardService
    # Response struct for all board operations
    # Provides a consistent return type with all possible fields
    struct BoardResponse
      # ameba:disable Naming/QueryBoolMethods
      property success : Bool = false
      property message : String = ""
      property board : ToCry::Board? = nil
      property old_name : String = ""
      property new_name : String = ""

      def initialize(@success : Bool = false, @message : String = "", @board : ToCry::Board? = nil, @old_name : String = "", @new_name : String = "")
      end
    end

    private def self.broadcast_deletion(board_id : String, board_name : String, user_id : String, exclude_client_id : String?)
      # Broadcast WebSocket notification using event pattern
      event = BoardDeletedEvent.new(board_id, board_name, user_id, exclude_client_id)
      WebSocketNotifier.broadcast(event)

      ToCry::Log.info { "Board '#{board_name}' deleted by user '#{user_id}' with WebSocket broadcast" }
    end

    # Create a new board
    def self.create_board(
      board_name : String,
      user_id : String,
      public : Bool? = false,
      color_scheme : String? = nil,
      exclude_client_id : String? = "mcp-client",
    )
      # Create the board
      board = ToCry.board_manager.create(board_name, user_id)
      unless board
        return BoardResponse.new(
          success: false,
          message: "Failed to create board '#{board_name}'"
        )
      end

      # Set additional properties
      board.public = public if public
      board.color_scheme = color_scheme if color_scheme

      # Save the board
      board.save

      # Broadcast WebSocket notification using event pattern
      event = BoardCreatedEvent.new(board, user_id, exclude_client_id)
      WebSocketNotifier.broadcast(event)

      ToCry::Log.info { "Board '#{board_name}' created by user '#{user_id}' with WebSocket broadcast" }

      BoardResponse.new(
        success: true,
        message: "Board created successfully",
        board: board
      )
    rescue ex
      BoardResponse.new(
        success: false,
        message: "Failed to create board: #{ex.message}"
      )
    end

    # Update a board
    # ameba:disable Metrics/CyclomaticComplexity
    def self.update_board(
      board_name : String,
      user_id : String,
      new_board_name : String? = nil,
      public : Bool? = nil,
      color_scheme : String? = nil,
      lanes : Array(Hash(String, JSON::Any))? = nil,
      exclude_client_id : String? = "mcp-client",
    )
      begin
        board = ToCry.board_manager.get(board_name, user_id)
        unless board
          return BoardResponse.new(
            success: false,
            message: "Board '#{board_name}' not found for user '#{user_id}'",
            old_name: board_name
          )
        end

        old_board_name = board_name
        final_board_name = board_name
        has_changes = false

        # Handle board rename
        if new_board_name && new_board_name != old_board_name
          # Check if new name already exists
          existing_board = ToCry.board_manager.get(new_board_name, user_id)
          if existing_board
            return BoardResponse.new(
              success: false,
              message: "Board with name '#{new_board_name}' already exists",
              old_name: old_board_name,
              new_name: new_board_name
            )
          end

          # Rename the board
          ToCry.board_manager.rename(old_board_name, new_board_name, user_id)
          final_board_name = new_board_name
          has_changes = true
        end

        # Update board properties
        unless public.nil?
          board.public = public
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

        # Broadcast WebSocket notification using event pattern
        # Determine message type based on whether board was renamed
        if old_board_name != final_board_name
          event = BoardUpdatedEvent.new(board, user_id, exclude_client_id)
        else
          event = LaneUpdatedEvent.new(board, user_id, exclude_client_id)
        end
        WebSocketNotifier.broadcast(event)

        ToCry::Log.info { "Board '#{old_board_name}' updated to '#{final_board_name}' by user '#{user_id}' with WebSocket broadcast" }

        BoardResponse.new(
          success: true,
          message: "Board updated successfully",
          board: board,
          old_name: old_board_name,
          new_name: final_board_name
        )
      rescue ex
        BoardResponse.new(
          success: false,
          message: "Failed to update board: #{ex.message}",
          old_name: board_name
        )
      end
    end

    # Delete a board
    def self.delete_board(
      board_name : String,
      user_id : String,
      exclude_client_id : String? = "mcp-client",
    )
      board = ToCry.board_manager.get(board_name, user_id)
      unless board
        # Idempotent: return success if board doesn't exist (matches MCP tool behavior)
        ToCry::Log.info { "Board '#{board_name}' deletion skipped - board doesn't exist for user '#{user_id}'" }
        return BoardResponse.new(success: true, message: "Board deleted successfully")
      end

      board_id = board.sepia_id

      # Delete the board
      ToCry.board_manager.delete(board_name, user_id)

      # Broadcast WebSocket notification
      broadcast_deletion(board_id, board_name, user_id, exclude_client_id)

      BoardResponse.new(success: true, message: "Board deleted successfully")
    rescue ex
      BoardResponse.new(success: false, message: "Failed to delete board: #{ex.message}")
    end

    # Get a board by name
    def self.get_board(board_name : String, user_id : String)
      board = ToCry.board_manager.get(board_name, user_id)
      return nil unless board

      # Convert to hash format similar to what MCP tools return
      {
        id:           board.sepia_id,
        name:         board_name,
        lanes:        board.lanes.map(&.to_hash),
        public:       board.public,
        color_scheme: board.color_scheme,
        lane_count:   board.lanes.size,
        total_notes:  board.lanes.sum(&.notes.size),
      }
    rescue ex
      ToCry::Log.error(exception: ex) { "Error getting board '#{board_name}': #{ex.message}" }
      nil
    end

    # List boards accessible to a user
    def self.list_boards(user_id : String)
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
