require "../tocry"
require "../websocket_handler"
require "./websocket_events"

module ToCry::Services
  # Centralized WebSocket notification service
  # Handles broadcasting changes to WebSocket clients with proper board name mapping
  # Refactored to use event-driven architecture for consistency and maintainability
  class WebSocketNotifier
    # Main broadcast method using event pattern
    def self.broadcast(event : WebSocketEvent)
      user_board_name = resolve_user_board_name(event.board_name, event.user_id)
      json_data = JSON::Any.new(event.to_hash)

      ToCry::WebSocketHandler.broadcast_to_board(
        user_board_name,
        event.type,
        json_data,
        event.exclude_client_id
      )
    end

    # Legacy methods for backward compatibility (deprecated)
    # These will be removed once all services are migrated to the event pattern
    @[Deprecated("Use broadcast(NoteDeletedEvent.new(...)) instead")]
    def self.broadcast_note_change(
      event_type : WebSocketHandler::MessageType,
      board_name : String,
      note_data : Hash(String, JSON::Any),
      user_id : String? = nil,
      exclude_client_id : String? = nil,
    )
      user_board_name = resolve_user_board_name(board_name, user_id)
      json_data = JSON::Any.new(note_data)
      ToCry::WebSocketHandler.broadcast_to_board(user_board_name, event_type, json_data, exclude_client_id)
    end

    @[Deprecated("Use broadcast(BoardDeletedEvent.new(...)) instead")]
    def self.broadcast_board_change(
      event_type : WebSocketHandler::MessageType,
      board_name : String,
      board_data : Hash(String, JSON::Any),
      user_id : String? = nil,
      exclude_client_id : String? = nil,
    )
      user_board_name = resolve_user_board_name(board_name, user_id)
      json_data = JSON::Any.new(board_data)
      ToCry::WebSocketHandler.broadcast_to_board(user_board_name, event_type, json_data, exclude_client_id)
    end

    # Resolve the user-specific board name for WebSocket clients
    # This logic was duplicated across multiple methods, now centralized
    private def self.resolve_user_board_name(board_name : String, user_id : String?) : String
      return board_name unless user_id

      user_board_refs = ToCry::BoardReference.accessible_to_user(user_id)
      board = board_manager.get(board_name, user_id)
      return board_name unless board

      board_ref = user_board_refs.find { |ref| ref.board_uuid == board.sepia_id }
      board_ref ? board_ref.board_name : board_name
    end

    private def self.board_manager
      ToCry.board_manager
    end
  end
end
