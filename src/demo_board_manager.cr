# Demo board manager - only compiled with -Ddemo flag
require "file_utils"
require "uuid"

module ToCry
  # Demo BoardManager that serves sample data instead of using filesystem
  class DemoBoardManager < BoardManager
    Log = ::Log.for(self)
    @boards = {} of String => Board
    @board_base_dir : String
    @safe_mode_enabled : Bool

    def initialize(@safe_mode_enabled : Bool)
      # Use a dummy path for demo mode
      @board_base_dir = "/tmp/tocry-demo"
      Log.info { "Initializing Demo BoardManager" }

      # Call parent constructor
      super(@safe_mode_enabled)

      # Load sample data
      load_sample_data
    end

    private def load_sample_data
      @boards.clear

      # Create sample boards for the demo user
      user = "demo-user"
      boards = DemoData.create_sample_boards(user)

      boards.each do |board|
        @boards[board.name] = board
        Log.info { "Loaded demo board: #{board.name}" }
      end
    end

    def list(user : String) : Array(String)
      @boards.keys
    end

    def get(board_name : String, user : String) : Board?
      @boards[board_name]?
    end

    def create(board_name : String, user : String) : Board
      # In demo mode, don't actually create boards
      Log.warn { "Demo mode: ignoring board creation request for '#{board_name}'" }
      raise "Board creation is disabled in demo mode"
    end

    def rename(old_name : String, new_name : String, user : String) : Void
      Log.warn { "Demo mode: ignoring board rename request from '#{old_name}' to '#{new_name}'" }
      raise "Board renaming is disabled in demo mode"
    end

    def delete(board_name : String, user : String) : Void
      Log.warn { "Demo mode: ignoring board deletion request for '#{board_name}'" }
      raise "Board deletion is disabled in demo mode"
    end

    def share_board(board_name : String, from_user : String, to_user_email : String) : Void
      Log.warn { "Demo mode: ignoring board share request for '#{board_name}'" }
      raise "Board sharing is disabled in demo mode"
    end

    def get_board_path(board_name : String) : String
      # Return a dummy path for demo mode
      File.join(@board_base_dir, "demo-#{board_name}")
    end

    def get_shared_board_path(shared_board_name : String) : String
      File.join(@board_base_dir, "shared-demo-#{shared_board_name}")
    end

    def get_all_shared_boards(user : String) : Array(Hash(String, String))
      # Return empty array in demo mode
      [] of Hash(String, String)
    end

    def resolve_shared_board_link(shared_board_name : String) : {String, String}?
      # Return nil in demo mode
      nil
    end

    def create_shared_board_link(board_name : String, from_user : String) : String
      # Return a dummy link in demo mode
      "demo-shared-board"
    end

    def get_canonical_board_path(board_name : String) : String
      get_board_path(board_name)
    end

    def get_canonical_shared_board_path(shared_board_name : String) : String
      get_shared_board_path(shared_board_name)
    end

    def get_board_by_uuid(uuid : String) : {Board, String}?
      # Find board by name (since we don't use real UUIDs in demo)
      @boards.each do |name, board|
        if board.id == uuid
          return {board, name}
        end
      end
      nil
    end

    def get_board_uuid(board_name : String) : String
      @boards[board_name]?.try(&.id) || ""
    end

    def ensure_board_directory_exists(board_name : String) : String
      # Return dummy path in demo mode
      get_board_path(board_name)
    end

    def ensure_shared_board_directory_exists(shared_board_name : String) : String
      # Return dummy path in demo mode
      get_shared_board_path(shared_board_name)
    end

    def board_exists?(board_name : String) : Bool
      @boards.has_key?(board_name)
    end

    def shared_board_exists?(shared_board_name : String) : Bool
      false # No shared boards in demo mode
    end

    def is_board_shared?(board_name : String) : Bool
      false # No shared boards in demo mode
    end

    def get_shared_board_name(board_name : String) : String?
      nil # No shared boards in demo mode
    end

    def get_original_board_name(shared_board_name : String) : String?
      nil # No shared boards in demo mode
    end

    def get_all_boards : Hash(String, Board)
      @boards.dup
    end

    def reload_board(board_name : String) : Board?
      # In demo mode, reload from sample data
      load_sample_data
      @boards[board_name]?
    end

    def export_board(board_name : String) : String
      # Return a dummy export in demo mode
      %({
        "name": "#{board_name}",
        "demo": true,
        "message": "This is a demo board export"
      })
    end

    def import_board(json_data : String, user : String) : String
      Log.warn { "Demo mode: ignoring board import request" }
      raise "Board import is disabled in demo mode"
    end

    def cleanup_old_boards(max_age : Time::Span) : Int
      # Return 0 in demo mode
      0
    end

    def backup_board(board_name : String) : String
      # Return dummy backup path in demo mode
      File.join(@board_base_dir, "backup-#{board_name}.json")
    end

    def restore_board(backup_path : String) : String
      Log.warn { "Demo mode: ignoring board restore request" }
      raise "Board restore is disabled in demo mode"
    end

    def validate_board_name(board_name : String) : Bool
      # Basic validation in demo mode
      !board_name.empty? && board_name.size <= 100 && board_name.matches?(/^[\w\s\-]+$/)
    end

    def sanitize_board_name(board_name : String) : String
      # Basic sanitization in demo mode
      board_name.gsub(/[^\w\s\-]/, "").strip
    end

    def get_board_metadata(board_name : String) : Hash(String, String)?
      # Return basic metadata in demo mode
      board = @boards[board_name]?
      if board
        {
          "created_at" => Time.utc.to_unix.to_s,
          "modified_at" => Time.utc.to_unix.to_s,
          "version" => ToCry::VERSION,
          "demo" => "true"
        }
      else
        nil
      end
    end

    def update_board_metadata(board_name : String, metadata : Hash(String, String)) : Void
      Log.warn { "Demo mode: ignoring metadata update request for '#{board_name}'" }
      # Do nothing in demo mode
    end

    def get_board_statistics(board_name : String) : Hash(String, Int32)?
      # Return dummy statistics in demo mode
      board = @boards[board_name]?
      if board
        {
          "total_notes" => board.lanes.sum { |lane| lane.notes.size },
          "total_lanes" => board.lanes.size,
          "total_tags" => board.lanes.flat_map { |lane| lane.notes.flat_map(&.tags) }.uniq.size,
          "notes_with_priority" => board.lanes.flat_map { |lane| lane.notes.count { |note| !note.priority.nil? } },
          "notes_with_dates" => board.lanes.flat_map { |lane| lane.notes.count { |note| !note.start_date.nil? || !note.end_date.nil? } }
        }
      else
        nil
      end
    end
  end
end