require "../tocry"
require "../websocket_handler"

module ToCry::Services
  # Centralized WebSocket notification service
  # Handles broadcasting changes to WebSocket clients with proper board name mapping
  class WebSocketNotifier
    # Broadcast a note-related change to WebSocket clients
    def self.broadcast_note_change(
      event_type : WebSocketHandler::MessageType,
      board_name : String,
      note_data : Hash(String, JSON::Any),
      user_id : String? = nil,
      exclude_client_id : String? = nil
    )
      # Get the user-specific board name for WebSocket clients
      if user_id
        user_board_refs = ToCry::BoardReference.accessible_to_user(user_id)
        board_ref = user_board_refs.find { |ref| ref.board_uuid == board_manager.get(board_name, user_id).try(&.sepia_id) }
        user_board_name = board_ref ? board_ref.board_name : board_name
      else
        user_board_name = board_name
      end

      # Convert note data to JSON::Any if needed
      json_data = JSON::Any.new(note_data)

      # Broadcast to WebSocket clients
      ToCry::WebSocketHandler.broadcast_to_board(user_board_name, event_type, json_data, exclude_client_id)
    end

    # Broadcast a board-related change to WebSocket clients
    def self.broadcast_board_change(
      event_type : WebSocketHandler::MessageType,
      board_name : String,
      board_data : Hash(String, JSON::Any),
      user_id : String? = nil,
      exclude_client_id : String? = nil
    )
      # Get the user-specific board name for WebSocket clients
      if user_id
        user_board_refs = ToCry::BoardReference.accessible_to_user(user_id)
        board_ref = user_board_refs.find { |ref| ref.board_uuid == board_manager.get(board_name, user_id).try(&.sepia_id) }
        user_board_name = board_ref ? board_ref.board_name : board_name
      else
        user_board_name = board_name
      end

      # Convert board data to JSON::Any if needed
      json_data = JSON::Any.new(board_data)

      # Broadcast to WebSocket clients
      ToCry::WebSocketHandler.broadcast_to_board(user_board_name, event_type, json_data, exclude_client_id)
    end

      private def self.board_manager
      ToCry.board_manager
    end
  end
end
