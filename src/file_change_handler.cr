require "sepia"
require "./board_manager"
require "./websocket_handler"

module ToCry
  # Handles file system change events for multi-instance synchronization
  #
  # This module integrates with Sepia's file watching system to provide:
  # - Cache invalidation across instances
  # - Real-time WebSocket broadcasting of external changes
  # - Conflict detection and resolution
  #
  class FileChangeHandler
    Log = ::Log.for(self)

    # Track the last time we processed events to prevent loops
    @@recent_events = Hash(String, Time).new
    @@event_mutex = Mutex.new
    DEBOUNCE_TIME = 0.1.seconds # 100ms debounce to prevent event loops

    # Initialize the file change handler
    def self.initialize(watcher_enabled : Bool = true)
      return unless watcher_enabled

      Log.info { "Initializing file change handler for multi-instance synchronization" }

      # Get the current storage backend from Sepia
      storage = Sepia::Storage.backend
      if storage.is_a?(Sepia::FileStorage) && storage.watcher_enabled?
        setup_file_watcher(storage)
      else
        Log.warn { "File system watcher not enabled or not available - multi-instance sync disabled" }
      end
    end

    # Set up file system watcher callbacks
    private def self.setup_file_watcher(storage : Sepia::FileStorage)
      storage.on_watcher_change do |event|
        handle_file_change_event(event)
      end

      Log.info { "File system watcher callbacks configured" }
    end

    # Handle file change events from Sepia
    private def self.handle_file_change_event(event : Sepia::Event)
      # Debounce events to prevent loops
      event_key = "#{event.object_class}:#{event.object_id}:#{event.type}"

      @@event_mutex.synchronize do
        # Check if we recently processed this same event
        if recent_time = @@recent_events[event_key]?
          if Time.local - recent_time < DEBOUNCE_TIME
            Log.debug { "Debouncing duplicate event: #{event_key}" }
            return
          end
        end

        @@recent_events[event_key] = Time.local

        # Clean up old events (keep only last 100 to prevent memory growth)
        if @@recent_events.size > 100
          @@recent_events.reject! { |_, time| Time.local - time > 1.minute }
        end
      end

      Log.info { "Processing file change event: #{event.type} #{event.object_class}:#{event.object_id}" }

      # Handle different object types
      case event.object_class
      when "Board"
        handle_board_change(event)
      when "Note"
        handle_note_change(event)
      when "Lane"
        handle_lane_change(event)
      when "BoardReference", "BoardIndex"
        handle_board_metadata_change(event)
      else
        Log.debug { "Ignoring change for unsupported object type: #{event.object_class}" }
      end
    end

    # Handle Board object changes
    private def self.handle_board_change(event : Sepia::Event)
      board_uuid = event.object_id

      case event.type
      when .created?, .modified?
        # Invalidate cache entry for this board
        invalidate_board_cache(board_uuid)

        # Get all users who have access to this board and broadcast to them
        broadcast_board_change(board_uuid, "board_updated")

      when .deleted?
        # Remove from cache
        invalidate_board_cache(board_uuid)

        # Broadcast deletion to all users
        broadcast_board_change(board_uuid, "board_deleted")
      end
    end

    # Handle Note object changes
    private def self.handle_note_change(event : Sepia::Event)
      # For now, broadcast to all boards since we can't easily determine
      # which board a note belongs to without complex path resolution
      Log.debug { "Note change detected: #{event.object_id} - broadcasting to all boards" }
      broadcast_global_change("note_updated")
    end

    # Handle Lane object changes
    private def self.handle_lane_change(event : Sepia::Event)
      # For now, broadcast to all boards since we can't easily determine
      # which board a lane belongs to without complex path resolution
      Log.debug { "Lane change detected: #{event.object_id} - broadcasting to all boards" }
      broadcast_global_change("lane_updated")
    end

    # Handle BoardReference and BoardIndex changes
    private def self.handle_board_metadata_change(event : Sepia::Event)
      # These changes affect board lists and accessibility
      # Broadcast to all connected clients to refresh their board lists
      broadcast_global_change("board_list_updated")
    end

    # Invalidate a specific board from the BoardManager cache
    private def self.invalidate_board_cache(board_uuid : String)
      if board_manager = ToCry.board_manager
        board_manager.invalidate_cache(board_uuid)
        Log.debug { "Invalidated cache for board: #{board_uuid}" }
      end
    end

    # Broadcast a change to all users of a specific board
    private def self.broadcast_board_change(board_uuid : String, change_type : String, extra_data = nil)
      begin
        # Find all board references for this board to get user names
        references = ToCry::BoardReference.find_by_board(board_uuid)

        references.each do |ref|
          board_name = ref.board_name
          data = extra_data ? JSON::Any.new(extra_data) : nil

          # Broadcast to WebSocket clients
          WebSocketHandler.broadcast_to_board(
            board_name,
            WebSocketHandler::MessageType.parse(change_type.upcase),
            data,
            nil # Don't exclude any client - this is an external change
          )

          Log.debug { "Broadcasted #{change_type} to board '#{board_name}' (#{board_uuid})" }
        end

      rescue ex
        Log.error(exception: ex) { "Failed to broadcast board change for #{board_uuid}: #{ex.message}" }
      end
    end

    # Broadcast a global change to all connected clients
    private def self.broadcast_global_change(change_type : String)
      # This would require WebSocket clients to listen for global events
      # For now, just log it
      Log.info { "Global change detected: #{change_type}" }
    end

    # Mark an operation as internal to prevent echo loops
    def self.mark_internal_operation(operation_key : String)
      @@event_mutex.synchronize do
        @@recent_events[operation_key] = Time.local
      end
    end

    # Check if an operation was recently marked as internal
    def self.internal_operation?(operation_key : String) : Bool
      @@event_mutex.synchronize do
        if time = @@recent_events[operation_key]?
          Time.local - time < DEBOUNCE_TIME
        else
          false
        end
      end
    end
  end
end
