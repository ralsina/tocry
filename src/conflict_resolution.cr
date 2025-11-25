require "sepia"
require "./board_manager"

module ToCry
  # Simplified multi-instance coordination using Sepia's native generation system

  # MultiInstance coordinator that handles file system changes and cache invalidation
  # without redundant version tracking, relying on Sepia's built-in generation system.
  #
  # Key features:
  # - Cache invalidation on file system changes
  # - WebSocket broadcasting of external changes
  # - Event debouncing to prevent echo loops
  # - Uses Sepia's native object generations automatically
  #
  class MultiInstanceCoordinator
    Log = ::Log.for(self)

    # Track the last time we processed events to prevent loops
    @@recent_events = Hash(String, Time).new
    @@event_mutex = Mutex.new
    DEBOUNCE_TIME = 0.1.seconds # 100ms debounce to prevent event loops

    # Initialize the multi-instance coordinator
    def self.initialize(watcher_enabled : Bool = true)
      return unless watcher_enabled

      Log.info { "Initializing multi-instance coordinator with Sepia file watching" }

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

      Log.info { "File system watcher callbacks configured for multi-instance coordination" }
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
      when "Note", "Lane"
        handle_object_change(event)
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
        # Invalidate cache entry for this board - Sepia handles versions automatically
        invalidate_board_cache(board_uuid)

        # Broadcast to WebSocket clients that board was updated
        broadcast_board_change(board_uuid, "board_updated")

      when .deleted?
        # Remove from cache and broadcast deletion
        invalidate_board_cache(board_uuid)
        broadcast_board_change(board_uuid, "board_deleted")
      end
    end

    # Handle Note and Lane object changes
    private def self.handle_object_change(event : Sepia::Event)
      # Broadcast object changes to relevant boards
      # For simplicity, broadcast globally since determining board ownership
      # would require complex path resolution
      Log.debug { "#{event.object_class} change detected: #{event.object_id} - broadcasting globally" }
      broadcast_global_change("#{event.object_class.downcase}_updated")
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
      # For global changes, just log them for now
      # WebSocket clients can listen for global events if needed in the future
      Log.info { "Global change detected: #{change_type}" }
    end

    # Save an object with multi-instance coordination
    #
    # This method wraps Sepia's save operations with event marking
    # to prevent echo loops in multi-instance deployments.
    #
    # ### Parameters
    #
    # - *object* : The Sepia object to save
    #
    # ### Returns
    #
    # The saved object (Sepia handles versioning automatically)
    #
    # ### Example
    #
    # ```
    # board = Board.load("board-123")
    # MultiInstanceCoordinator.save_with_coordination(board)
    # ```
    def self.save_with_coordination(object : Sepia::Serializable | Sepia::Container)
      object_class = object.class.name
      object_id = object.sepia_id

      # Mark this as an internal operation to prevent echo loops
      mark_internal_operation("#{object_class}:#{object_id}:save")

      # Save the object - Sepia handles versioning automatically
      object.save

      Log.debug { "Saved #{object_class}:#{object_id} with Sepia native versioning" }
      object
    end

    # Delete an object with multi-instance coordination
    #
    # ### Parameters
    #
    # - *object* : The Sepia object to delete
    def self.delete_with_coordination(object : Sepia::Serializable | Sepia::Container)
      object_class = object.class.name
      object_id = object.sepia_id

      # Mark as internal operation
      mark_internal_operation("#{object_class}:#{object_id}:delete")

      # Delete the object - Sepia handles versioning automatically
      object.delete

      Log.debug { "Deleted #{object_class}:#{object_id}" }
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

    # Get coordination statistics
    def self.stats : Hash(String, Int32)
      # This could track coordination statistics over time
      # For now, return placeholder data
      {
        "file_events_processed" => 0,
        "cache_invalidations"   => 0,
        "websocket_broadcasts"  => 0
      }
    end
  end
end
