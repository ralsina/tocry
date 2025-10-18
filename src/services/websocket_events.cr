require "../tocry"
require "../websocket_handler"

module ToCry::Services
  # Abstract base class for all WebSocket events
  # Provides a consistent interface for event creation and broadcasting
  abstract class WebSocketEvent
    # Get the message type for this event
    abstract def type : WebSocketHandler::MessageType

    # Get the board name this event relates to
    abstract def board_name : String

    # Get the user ID who triggered this event
    abstract def user_id : String?

    # Get the client ID to exclude from broadcasting (nil = no exclusion)
    abstract def exclude_client_id : String?

    # Convert event to hash format for WebSocket transmission
    abstract def to_hash : Hash(String, JSON::Any)

    # Convenience method to broadcast this event
    def broadcast
      WebSocketNotifier.broadcast(self)
    end
  end

  # Note-related events
  abstract class NoteEvent < WebSocketEvent
    property note_id : String
    property board_name : String
    property user_id : String?
    property exclude_client_id : String?

    def initialize(@note_id : String, @board_name : String, @user_id : String? = nil, @exclude_client_id : String? = nil)
    end
  end

  class NoteCreatedEvent < NoteEvent
    def type : WebSocketHandler::MessageType
      WebSocketHandler::MessageType::NOTE_CREATED
    end

    property note : ToCry::Note
    property lane_name : String

    def initialize(@note : ToCry::Note, @board_name : String, @lane_name : String, @user_id : String? = nil, @exclude_client_id : String? = nil)
      @note_id = @note.sepia_id
    end

    def to_hash : Hash(String, JSON::Any)
      {
        "id"          => JSON::Any.new(@note.sepia_id),
        "title"       => JSON::Any.new(@note.title),
        "content"     => JSON::Any.new(@note.content),
        "lane_name"   => JSON::Any.new(@lane_name),
        "tags"        => JSON::Any.new(@note.tags.map { |tag| JSON::Any.new(tag) }),
        "priority"    => JSON::Any.new(@note.priority.to_s),
        "start_date"  => JSON::Any.new(@note.start_date),
        "end_date"    => JSON::Any.new(@note.end_date),
        "public"      => JSON::Any.new(@note.public),
        "expanded"    => JSON::Any.new(@note.expanded),
        "attachments" => JSON::Any.new(@note.attachments.map { |attachment| JSON::Any.new(attachment) }),
      }
    end
  end

  class NoteUpdatedEvent < NoteEvent
    def type : WebSocketHandler::MessageType
      WebSocketHandler::MessageType::NOTE_UPDATED
    end

    def initialize(@note : ToCry::Note, @board_name : String, @lane_name : String, @user_id : String? = nil, @exclude_client_id : String? = nil)
      @note_id = @note.sepia_id
    end

    def to_hash : Hash(String, JSON::Any)
      {
        "id"         => JSON::Any.new(@note.sepia_id),
        "title"      => JSON::Any.new(@note.title),
        "content"    => JSON::Any.new(@note.content),
        "lane_name"  => JSON::Any.new(@lane_name),
        "tags"       => JSON::Any.new(@note.tags.map { |tag| JSON::Any.new(tag) }),
        "priority"   => JSON::Any.new(@note.priority.to_s),
        "start_date" => JSON::Any.new(@note.start_date),
        "end_date"   => JSON::Any.new(@note.end_date),
        "public"     => JSON::Any.new(@note.public),
        "expanded"   => JSON::Any.new(@note.expanded),
      }
    end
  end

  class NoteDeletedEvent < NoteEvent
    def type : WebSocketHandler::MessageType
      WebSocketHandler::MessageType::NOTE_DELETED
    end

    property note_title : String
    property lane_name : String

    def initialize(@note_id : String, @note_title : String, @lane_name : String, @board_name : String, @user_id : String? = nil, @exclude_client_id : String? = nil)
    end

    def to_hash : Hash(String, JSON::Any)
      {
        "id"        => JSON::Any.new(@note_id),
        "title"     => JSON::Any.new(@note_title),
        "lane_name" => JSON::Any.new(@lane_name),
      }
    end
  end

  # Board-related events
  abstract class BoardEvent < WebSocketEvent
    property board_name : String
    property user_id : String?
    property exclude_client_id : String?

    def initialize(@board_name : String, @user_id : String? = nil, @exclude_client_id : String? = nil)
    end
  end

  class BoardCreatedEvent < BoardEvent
    def type : WebSocketHandler::MessageType
      WebSocketHandler::MessageType::BOARD_CREATED
    end

    property board : ToCry::Board

    def initialize(@board : ToCry::Board, @user_id : String? = nil, @exclude_client_id : String? = nil)
      @board_name = @board.name
    end

    def to_hash : Hash(String, JSON::Any)
      {
        "id"           => JSON::Any.new(@board.sepia_id),
        "name"         => JSON::Any.new(@board_name),
        "public"       => JSON::Any.new(@board.public),
        "color_scheme" => JSON::Any.new(@board.color_scheme),
        "lane_count"   => JSON::Any.new(@board.lanes.size),
        "total_notes"  => JSON::Any.new(@board.lanes.sum(&.notes.size)),
      }
    end
  end

  class BoardUpdatedEvent < BoardEvent
    def type : WebSocketHandler::MessageType
      WebSocketHandler::MessageType::BOARD_UPDATED
    end

    property board : ToCry::Board

    def initialize(@board : ToCry::Board, @user_id : String? = nil, @exclude_client_id : String? = nil)
      @board_name = @board.name
    end

    def to_hash : Hash(String, JSON::Any)
      {
        "id"           => JSON::Any.new(@board.sepia_id),
        "name"         => JSON::Any.new(@board_name),
        "public"       => JSON::Any.new(@board.public),
        "color_scheme" => JSON::Any.new(@board.color_scheme),
        "lane_count"   => JSON::Any.new(@board.lanes.size),
        "total_notes"  => JSON::Any.new(@board.lanes.sum(&.notes.size)),
      }
    end
  end

  class BoardDeletedEvent < BoardEvent
    def type : WebSocketHandler::MessageType
      WebSocketHandler::MessageType::BOARD_DELETED
    end

    def initialize(@board_id : String, @board_name : String, @user_id : String? = nil, @exclude_client_id : String? = nil)
    end

    def to_hash : Hash(String, JSON::Any)
      {
        "id"   => JSON::Any.new(@board_id),
        "name" => JSON::Any.new(@board_name),
      }
    end
  end

  # Lane update event (used when board structure changes but board itself isn't created/updated/deleted)
  class LaneUpdatedEvent < BoardEvent
    def type : WebSocketHandler::MessageType
      WebSocketHandler::MessageType::LANE_UPDATED
    end

    property board : ToCry::Board

    def initialize(@board : ToCry::Board, @user_id : String? = nil, @exclude_client_id : String? = nil)
      @board_name = @board.name
    end

    def to_hash : Hash(String, JSON::Any)
      {
        "id"           => JSON::Any.new(@board.sepia_id),
        "name"         => JSON::Any.new(@board_name),
        "public"       => JSON::Any.new(@board.public),
        "color_scheme" => JSON::Any.new(@board.color_scheme),
        "lane_count"   => JSON::Any.new(@board.lanes.size),
        "total_notes"  => JSON::Any.new(@board.lanes.sum(&.notes.size)),
      }
    end
  end
end
