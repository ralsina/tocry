# /home/ralsina/code/tocry/src/endpoints/helpers.cr
require "kemal"
require "../tocry" # To access ToCry::BOARD and other definitions
require "json"     # For JSON::ParseException

module ToCry::Endpoints::Helpers
  # Custom error for when a request body is expected but not provided.
  class MissingBodyError < Exception; end

  # Helper functions for standardized API responses
  def self.json_response(env : HTTP::Server::Context, status_code : Int32, data)
    env.response.status_code = status_code
    env.response.content_type = "application/json"
    case data
    when String
      data
    else
      data.to_json
    end
  end

  def self.success_response(env : HTTP::Server::Context, data, status_code : Int32 = 200)
    json_response(env, status_code, data)
  end

  def self.error_response(env : HTTP::Server::Context, message : String, status_code : Int32 = 400)
    json_response(env, status_code, {error: message})
  end

  def self.not_found_response(env : HTTP::Server::Context, message : String = "Resource not found")
    error_response(env, message, 404)
  end

  def self.created_response(env : HTTP::Server::Context, data)
    success_response(env, data, 201)
  end

  # Helper function to retrieve the Board instance from the request context.
  def self.get_board_from_context(env : HTTP::Server::Context) : ToCry::Board
    board_name = env.get("board_name").as(String)
    board = ToCry.board_manager.get(board_name, user: ToCry.get_current_user_id(env))

    unless board
      # This path should not be reachable due to the before_all filter,
      # but this check provides robustness and a clearer error message.
      raise "Failed to retrieve board '#{board_name}' from context."
    end
    board
  end

  # Helper function to validate a string as a safe path component.
  # Rejects empty strings, '.', '..', strings containing path separators.
  # Optionally allows names starting with a dot (e.g., for hidden files/directories).
  def self.validate_path_component(name : String, allow_dots : Bool = false)
    if name.empty?
      raise MissingBodyError.new("Name cannot be empty.")
    end
    if name == "." || name == ".."
      raise MissingBodyError.new("Name cannot be '.' or '..'.")
    end
    if name.includes?('/') || name.includes?('\\')
      raise MissingBodyError.new("Name cannot contain path separators ('/' or '\\').")
    end
    unless allow_dots
      if name.starts_with?('.')
        raise MissingBodyError.new("Name cannot start with a dot ('.').")
      end
    end
  end

  # Helper function to safely get the JSON request body.
  # If the body is missing, it raises a MissingBodyError.
  def self.get_json_body(env : HTTP::Server::Context) : String
    body = env.request.body
    raise MissingBodyError.new("Request body is missing.") if body.nil?
    body.gets_to_end
  end

  # Helper function to sanitize a string for use as a filename component.
  # Replaces invalid characters with underscores and removes leading/trailing underscores.
  def self.sanitize_filename(filename : String) : String
    # Replace any character that is not alphanumeric, a hyphen, an underscore, or a dot with an underscore
    sanitized = filename.gsub(/[^a-zA-Z0-9\-_.]/, "_")
    # Remove leading/trailing underscores or hyphens
    sanitized = sanitized.gsub(/^[_-]+|[_-]+$/, "")
    # Replace multiple consecutive underscores/hyphens with a single underscore
    sanitized = sanitized.gsub(/[_-]{2,}/, "_")
    sanitized.empty? ? "untitled" : sanitized # Fallback for empty string after sanitization
  end

  # Payload Structs (moved here for shared access)
  struct NewLanePayload
    include JSON::Serializable
    property name : String
  end

  struct UpdateLanePayload
    include JSON::Serializable
    property lane : ToCry::Lane # The updated lane data (including potentially new name)
    property position : UInt64  # The desired 0-based index in the board's lanes array
  end

  struct RenameBoardPayload
    include JSON::Serializable
    property new_name : String
  end

  struct NewBoardPayload
    include JSON::Serializable
    property name : String
    property color_scheme : String?
  end

  struct UpdateNotePayload
    include JSON::Serializable
    property note : NoteData
    property lane_name : String?
    property position : UInt64?
  end

  struct NewNotePayload
    include JSON::Serializable
    property note : NoteData # The note data (id will be ignored/overwritten as a new one is generated)
    property lane_name : String
  end

  struct NoteData
    include JSON::Serializable
    property title : String
    property tags : Array(String) = [] of String
    property content : String = ""
    # ameba:disable Naming/QueryBoolMethods
    property expanded : Bool = false
    # ameba:disable Naming/QueryBoolMethods
    property public : Bool = false
    property attachments : Array(String) = [] of String
    property start_date : String? = nil
    property end_date : String? = nil
    property priority : String? = nil
  end

  struct ShareBoardPayload
    include JSON::Serializable
    property to_user_email : String
  end

  struct ColorSchemePayload
    include JSON::Serializable
    property color_scheme : String
  end

  # Helper function to find a note across all user-accessible boards
  # Returns a tuple of (note, lane, board) if found, nil otherwise
  def self.find_note_for_user(note_id : String, user : String)
    ToCry.board_manager.list(user).each do |board_uuid|
      board = ToCry.board_manager.get_by_uuid(board_uuid)
      if board
        found_note_and_lane = board.note(note_id)
        if found_note_and_lane
          note, lane = found_note_and_lane
          return {note, lane, board}
        end
      end
    end
    nil
  end
end
