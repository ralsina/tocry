require "file_utils"
require "json"
require "spec"
require "http/server"
require "../../src/lane"
require "../../src/board"
require "../../src/board_manager"
require "../../src/initialization"
require "../../src/tocry"
require "../../src/note"

# Stub out HTTP::Server::Context session method for MCP tests
class HTTP::Server::Context
  def session
    FakeSession.new
  end
end

class FakeSession
  def string?(key)
    nil
  end

  def string(key, value)
    # No-op in tests
  end

  def destroy
    # No-op in tests
  end
end

# Stub out WebSocket notifications for tests
module ToCry
  module WebSocketNotifier
    def self.broadcast_board_change(message_type, board_name, board_data, user_id, exclude_client_id)
      # No-op in tests
    end

    def self.broadcast(event)
      # No-op in tests
    end
  end
end

# Simple struct for deserializing board summaries from ListBoardsTool
struct BoardSummary
  include JSON::Serializable

  property id : String
  property name : String
  property lane_count : Int32
  # ameba:disable Naming/QueryBoolMethods
  property public : Bool
  property color_scheme : String?
end

# MCP Test Helpers
module MCPTestHelpers
  extend self

  TEST_USER_ID  = "test_mcp_user"
  TEST_DATA_DIR = "/tmp/tocry-mcp-spec-test"

  def setup_test_environment
    # Clean up and create test data directory
    FileUtils.rm_rf(TEST_DATA_DIR) if Dir.exists?(TEST_DATA_DIR)
    FileUtils.mkdir_p(TEST_DATA_DIR)

    # Set up data environment the same way as unit tests
    ToCry.data_directory = TEST_DATA_DIR
    Sepia::Storage::INSTANCE.path = TEST_DATA_DIR

    # Initialize BoardManager using Initialization module like the unit tests
    board_manager = ToCry::Initialization.setup_data_environment(TEST_DATA_DIR, true, false)
    ToCry.board_manager = board_manager

    # Store the board manager reference for tools to use
    @@board_manager = board_manager
  end

  def cleanup_test_environment
    # Clean up test data directory
    FileUtils.rm_rf(TEST_DATA_DIR) if Dir.exists?(TEST_DATA_DIR)
  end

  @@board_manager : ToCry::BoardManager?

  def self.board_manager
    @@board_manager.not_nil!
  end

  def create_test_board(name : String, color_scheme : String? = nil, public : Bool = false)
    # Use the board manager that was set up in setup_test_environment
    board = board_manager.create(name, MCPTestHelpers::TEST_USER_ID)

    # Set additional properties if provided
    if color_scheme
      board.color_scheme = color_scheme
    end

    if public
      board.public = public
    end

    board
  end

  def create_test_board_with_lanes(name : String, lane_names : Array(String))
    board = create_test_board(name)

    lane_names.each do |lane_name|
      lane = ToCry::Lane.new(lane_name)
      board.lanes << lane
    end

    board
  end

  def create_test_note(board : ToCry::Board, lane_name : String, title : String, content : String? = nil, **options)
    lane = board.lanes.find { |found_lane| found_lane.name == lane_name }
    raise "Lane '#{lane_name}' not found in board '#{board.name}'" unless lane

    note = ToCry::Note.new(title)
    note.content = content if content
    note.tags = options[:tags]? || [] of String
    note.priority = case options[:priority]?
                    when "high"   then ToCry::Priority::High
                    when "medium" then ToCry::Priority::Medium
                    when "low"    then ToCry::Priority::Low
                    else               ToCry::Priority::Medium
                    end
    note.start_date = options[:start_date]?.try(&.to_s)
    note.end_date = options[:end_date]?.try(&.to_s)
    note.public = options[:public]? || false
    note.expanded = options[:expanded]? || false

    lane.notes << note
    note
  end

  # Helper to assert MCP response structure
  def assert_success_response(response : String)
    parsed = JSON.parse(response)
    parsed["success"].as_bool.should be_true
    if keys = parsed.as_h?.try(&.keys)
      keys.should_not contain("error")
    end
  end

  def assert_error_response(response : String)
    parsed = JSON.parse(response)
    parsed["success"].as_bool.should be_false
    if keys = parsed.as_h?.try(&.keys)
      keys.should contain("error")
    end
    parsed["error"].as_s.should_not be_empty
  end

  # Helper to parse JSON string response to Hash for test assertions
  def parse_mcp_response(response : String) : JSON::Any
    JSON.parse(response)
  end

  # Helper to create parameter hashes for MCP tools
  def board_params(board_name : String, **options)
    params = {
      "board_name" => JSON::Any.new(board_name),
    } of String => JSON::Any

    options.each do |key, value|
      case value
      when Bool
        params[key.to_s] = JSON::Any.new(value)
      when String
        params[key.to_s] = JSON::Any.new(value)
      when Array(String)
        params[key.to_s] = JSON::Any.new(value.map { |item| JSON::Any.new(item) })
      when Nil
        # Skip nil values
      else
        raise "Unsupported parameter type: #{value.class}"
      end
    end

    params
  end

  def note_params(board_name : String, lane_name : String, title : String, **options)
    params = {
      "board_name" => JSON::Any.new(board_name),
      "lane_name"  => JSON::Any.new(lane_name),
      "title"      => JSON::Any.new(title),
    } of String => JSON::Any

    options.each do |key, value|
      case value
      when String
        params[key.to_s] = JSON::Any.new(value)
      when Array(String)
        params[key.to_s] = JSON::Any.new(value.map { |item| JSON::Any.new(item) })
      when Bool
        params[key.to_s] = JSON::Any.new(value)
      when Nil
        # Skip nil values
      else
        raise "Unsupported parameter type: #{value.class}"
      end
    end

    params
  end

  def search_params(query : String, **options)
    params = {
      "query" => JSON::Any.new(query),
    } of String => JSON::Any

    options.each do |key, value|
      case value
      when String
        params[key.to_s] = JSON::Any.new(value)
      when Int32
        params[key.to_s] = JSON::Any.new(value)
      when Nil
        # Skip nil values
      else
        raise "Unsupported parameter type: #{value.class}"
      end
    end

    params
  end
end
