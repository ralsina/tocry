require "../board"
require "../board_manager"

# Migration to add public field to existing boards
# This ensures backward compatibility when upgrading to v0.17.1

module ToCry::Migration
  # Migration for v0.17.1: Add Public Field to Boards
  #
  # This migration adds a 'public' field to all existing boards with a default value of false.
  # This ensures backward compatibility when upgrading to v0.17.1 where boards can be made public.
  #
  # The migration:
  # 1. Scans all board directories in data/boards/
  # 2. For each board.json file, checks if the public field exists
  # 3. If not present, adds the field with default value false
  # 4. Saves the updated board.json
  private def self.migrate_add_public_to_boards
    Log.info { "Running migration v0.17.1: Add public field to boards" }

    # Get all board directories
    boards_path = File.join(ToCry.data_directory, "boards")
    return unless Dir.exists?(boards_path)

    # Process each board directory
    Dir.each_child(boards_path) do |board_dir|
      board_full_path = File.join(boards_path, board_dir)
      next unless Dir.exists?(board_full_path)

      # Skip if already migrated (has public field)
      board_file = File.join(board_full_path, "board.json")
      next unless File.exists?(board_file)

      begin
        # Try to load the board
        board = Board.from_json(File.read(board_file))

        # Check if board already has public field (newer version)
        if board.responds_to?(:public)
          Log.debug { "Board #{board_dir} already has public field, skipping" }
          next
        end

        # Update the board JSON to include public field
        board_data = JSON.parse(File.read(board_file))
        board_data.as_h["public"] = JSON::Any.new(false) unless board_data.as_h.has_key?("public")

        # Write back updated JSON
        File.write(board_file, board_data.to_json)
        Log.info { "Added public field to board #{board_dir}" }
      rescue ex
        Log.error(exception: ex) { "Failed to migrate board #{board_dir}: #{ex.message}" }
      end
    end

    Log.info { "Migration v0.17.1 completed" }
  end
end
