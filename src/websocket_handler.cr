require "kemal"
require "json"
require "./tocry"
require "./auth_helpers"

# WebSocket connection manager for real-time board synchronization
module ToCry::WebSocketHandler
  # Connection pool to track active WebSocket connections
  @@connections = Hash(String, Array(HTTP::WebSocket)).new
  # Track which socket belongs to which client ID
  @@socket_client_ids = Hash(HTTP::WebSocket, String).new
  @@connection_mutex = Mutex.new

  # WebSocket message types
  enum MessageType
    BOARD_UPDATED
    BOARD_CREATED
    BOARD_DELETED
    NOTE_CREATED
    NOTE_UPDATED
    NOTE_DELETED
    LANE_UPDATED
  end

  # Message structure for WebSocket communications
  struct WSMessage
    property type : String
    property board_name : String
    property data : JSON::Any?

    def initialize(@type : String, @board_name : String, @data : JSON::Any? = nil)
    end

    def to_json : String
      {
        type:      @type,
        boardName: @board_name,
        data:      @data,
      }.to_json
    end
  end

  # Broadcast a message to all clients viewing a specific board, optionally excluding a specific client
  def self.broadcast_to_board(board_name : String, message_type : MessageType, data : JSON::Any? = nil, exclude_client_id : String? = nil)
    message = WSMessage.new(
      message_type.to_s.downcase,
      board_name,
      data
    ).to_json

    ToCry::Log.info { "Broadcasting #{message_type} to board '#{board_name}', excluding client: #{exclude_client_id || "none"}" }

    @@connection_mutex.synchronize do
      if connections = @@connections[board_name]?
        ToCry::Log.info { "Found #{connections.size} WebSocket connections for board '#{board_name}'" }
        connections.each do |socket|
          socket_client_id = @@socket_client_ids[socket]?
          ToCry::Log.debug { "Checking socket for client ID: #{socket_client_id || "none"} (exclude: #{exclude_client_id || "none"})" }

          # Skip this socket if it belongs to the excluded client
          if exclude_client_id && socket_client_id == exclude_client_id
            ToCry::Log.info { "🚫 Skipping broadcast to originating client: #{exclude_client_id}" }
            next
          end

          begin
            socket.send(message)
            ToCry::Log.debug { "✅ Sent message to client: #{socket_client_id || "unknown"}" }
          rescue ex
            ToCry::Log.error(exception: ex) { "Failed to send WebSocket message to client: #{ex.message}" }
            # Remove dead connection
            connections.delete(socket)
            @@socket_client_ids.delete(socket)
          end
        end
      else
        ToCry::Log.warn { "No WebSocket connections found for board '#{board_name}'" }
      end
    end
  end

  # Add a connection to the board's connection pool
  def self.add_connection(board_name : String, socket : HTTP::WebSocket, client_id : String? = nil)
    @@connection_mutex.synchronize do
      @@connections[board_name] ||= [] of HTTP::WebSocket
      @@connections[board_name] << socket

      # Track which client ID this socket belongs to
      if client_id
        @@socket_client_ids[socket] = client_id
        ToCry::Log.info { "WebSocket client (#{client_id}) added to board '#{board_name}'. Total connections: #{@@connections[board_name].size}" }
      else
        ToCry::Log.info { "WebSocket client added to board '#{board_name}'. Total connections: #{@@connections[board_name].size}" }
      end
    end
  end

  # Remove a connection from the board's connection pool
  def self.remove_connection(board_name : String, socket : HTTP::WebSocket)
    @@connection_mutex.synchronize do
      if connections = @@connections[board_name]?
        connections.delete(socket)
        client_id = @@socket_client_ids.delete(socket)

        if client_id
          ToCry::Log.info { "WebSocket client (#{client_id}) removed from board '#{board_name}'. Total connections: #{connections.size}" }
        else
          ToCry::Log.info { "WebSocket client removed from board '#{board_name}'. Total connections: #{connections.size}" }
        end

        # Clean up empty connection arrays
        if connections.empty?
          @@connections.delete(board_name)
          ToCry::Log.info { "No more connections for board '#{board_name}', removed from pool" }
        end
      end
    end
  end

  # Get statistics about current connections
  def self.connection_stats
    @@connection_mutex.synchronize do
      total_connections = @@connections.values.sum(&.size)
      {
        total_boards:      @@connections.size,
        total_connections: total_connections,
        boards:            @@connections.map { |board, connections| {board: board, connections: connections.size} },
      }
    end
  end

  # Extract client ID from HTTP request headers for echo prevention
  def self.extract_client_id(env : HTTP::Server::Context) : String?
    client_id = env.request.headers["X-ToCry-Client-ID"]?
    if client_id
      ToCry::Log.info { "🔍 Extracted client ID from headers: #{client_id}" }
    else
      ToCry::Log.debug { "⚠️ No client ID found in headers" }
    end
    client_id
  end

  # Extract user information from WebSocket request context
  private def self.get_user_from_context(env : HTTP::Server::Context) : String
    user_id = ToCry.get_current_user_id(env)
    ToCry::Log.info { "WebSocket connection attempt for user: #{user_id}" }
    user_id
  end

  # Validate that user has access to the requested board
  private def self.validate_board_access(env : HTTP::Server::Context, board_name : String) : Bool
    user = get_user_from_context(env)
    board = ToCry.board_manager.get(board_name, user)

    if board.nil?
      ToCry::Log.warn { "WebSocket access denied - user '#{user}' does not have access to board '#{board_name}'" }
      return false
    end

    ToCry::Log.info { "WebSocket access granted - user '#{user}' has access to board '#{board_name}'" }
    true
  end

  # Main WebSocket handler
  def self.handle_websocket(socket : HTTP::WebSocket, env : HTTP::Server::Context)
    # Extract board name from query parameters
    board_name = env.params.query["board"]?
    unless board_name
      ToCry::Log.warn { "WebSocket connection rejected: missing board parameter" }
      socket.close(1008, "Board parameter required")
      return
    end

    # Extract client ID from query parameters
    client_id = env.params.query["clientId"]?
    if client_id
      ToCry::Log.info { "WebSocket connection with client ID: #{client_id}" }
    else
      ToCry::Log.debug { "WebSocket connection without client ID" }
    end

    # Validate user has access to this board
    unless validate_board_access(env, board_name)
      socket.close(1003, "Access denied")
      return
    end

    # Add connection to the board's pool with client ID
    add_connection(board_name, socket, client_id)

    # Send initial connection confirmation
    welcome_msg = WSMessage.new(
      "connected",
      board_name,
      JSON::Any.new({"message" => JSON::Any.new("Connected to #{board_name}")})
    ).to_json
    socket.send(welcome_msg)

    # Handle incoming messages (for now just keep alive)
    socket.on_message do |message|
      begin
        # Parse message to ensure it's valid JSON
        parsed = JSON.parse(message)
        ToCry::Log.debug { "Received WebSocket message: #{parsed}" }

        # For now, we don't need to handle client messages
        # But we could implement ping/pong or other client-initiated actions here
      rescue ex : JSON::ParseException
        ToCry::Log.warn { "Received invalid JSON from WebSocket client: #{message}" }
      end
    end

    # Handle connection close
    socket.on_close do |code, reason|
      ToCry::Log.info { "WebSocket connection closed for board '#{board_name}' with code #{code}: #{reason}" }
      remove_connection(board_name, socket)
    end

    ToCry::Log.info { "WebSocket connection established for board '#{board_name}'" }
  rescue ex
    ToCry::Log.error(exception: ex) { "Error in WebSocket handler: #{ex.message}" }
    socket.close(1011, "Internal server error")
  end
end
