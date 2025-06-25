# /home/ralsina/code/tocry/src/endpoints/helpers.cr
require "kemal"
require "../tocry" # To access ToCry::BOARD and other definitions
require "json"     # For JSON::ParseException

module ToCry::Endpoints::Helpers
  # Custom error for when a request body is expected but not provided.
  class MissingBodyError < Exception; end

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
  # Rejects empty strings, '.', '..', strings containing path separators, or strings starting with '.'.
  def self.validate_path_component(name : String)
    if name.empty?
      raise MissingBodyError.new("Name cannot be empty.")
    end
    if name == "." || name == ".."
      raise MissingBodyError.new("Invalid name: '.' and '..' are not allowed.")
    end
    if name.includes?('/') || name.includes?('\\') || name.starts_with?('.')
      raise MissingBodyError.new("Invalid name: It cannot contain path separators or start with a dot.")
    end
  end

  # Helper function to safely get the JSON request body.
  # If the body is missing, it raises a MissingBodyError.
  def self.get_json_body(env : HTTP::Server::Context) : String
    body = env.request.body
    raise MissingBodyError.new("Request body is missing.") if body.nil?
    body.gets_to_end
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
  end

  struct UpdateNotePayload
    include JSON::Serializable
    property note : ToCry::Note
    property lane_name : String?
    property position : UInt64?
  end

  struct NewNotePayload
    include JSON::Serializable
    property note : ToCry::Note # The note data (id will be ignored/overwritten as a new one is generated)
    property lane_name : String
  end
end
