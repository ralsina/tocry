module ToCry::Migration
  private def self.migrate_color_schemes_to_sepia
    data_dir = ToCry.data_directory
    boards_dir = File.join(data_dir, "ToCry::Board")

    return unless Dir.exists?(boards_dir)

    Dir.glob(File.join(boards_dir, "*")).each do |board_path|
      next unless File.directory?(board_path)

      board_uuid = File.basename(board_path)
      color_scheme_file = File.join(board_path, "color_scheme.json")

      # Skip if no color scheme file exists
      next unless File.exists?(color_scheme_file)

      begin
        # Load the board
        board = ToCry::Board.load(board_uuid, board_path)

        # Read the color scheme from the legacy file
        color_data = JSON.parse(File.read(color_scheme_file))
        color_scheme = color_data["color_scheme"].as_s

        # Set the color scheme in the board object
        board.color_scheme = color_scheme
        board.save

        # Remove the legacy file
        File.delete(color_scheme_file)

        Log.info { "Migrated color scheme '#{color_scheme}' for board '#{board.name}' (#{board_uuid})" }

      rescue ex
        Log.warn { "Failed to migrate color scheme for board #{board_uuid}: #{ex.message}" }
        # Continue with other boards even if one fails
      end
    end

    Log.info { "Color scheme migration to Sepia completed" }
  end
end
