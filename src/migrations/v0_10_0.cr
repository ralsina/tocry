module ToCry::Migration
  private def self.migrate_to_centralized_notes
    data_dir = ToCry.data_directory
    old_boards_dir = File.join(data_dir, "boards")
    new_tocry_board_dir = File.join(data_dir, "ToCry::Board")
    new_tocry_note_dir = File.join(data_dir, "ToCry::Note")

    # Migration should only run if the old structure exists and the new one doesn't.
    return unless Dir.exists?(old_boards_dir)
    return if Dir.exists?(new_tocry_board_dir)

    Log.warn { "Old board data structure detected. Migrating to centralized note storage..." }

    FileUtils.mkdir_p(new_tocry_board_dir)
    FileUtils.mkdir_p(new_tocry_note_dir)

    # Create a temporary directory for the new boards structure.
    new_boards_dir_temp = old_boards_dir + "_new"
    FileUtils.mkdir_p(new_boards_dir_temp)

    # Iterate over each board in the old `boards` directory.
    Dir.glob(File.join(old_boards_dir, "*")).each do |old_board_path|
      next unless File.directory?(old_board_path)

      board_basename = File.basename(old_board_path)
      uuid_match = board_basename.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/)
      next unless uuid_match
      board_uuid = uuid_match[1]

      # Create the new board directory structure.
      new_board_dir = File.join(new_tocry_board_dir, board_uuid)
      new_lanes_dir = File.join(new_board_dir, "lanes")
      FileUtils.mkdir_p(new_lanes_dir)

      # Create the symbolic link in the new boards directory.
      link_target = File.join("..", "ToCry::Board", board_uuid)
      link_path = File.join(new_boards_dir_temp, board_basename)
      File.symlink(link_target, link_path)

      # Migrate each lane from the old board to the new board.
      Dir.glob(File.join(old_board_path, "*")).each do |old_lane_path|
        next unless File.directory?(old_lane_path)
        next if File.basename(old_lane_path).starts_with?(".") # Skip .notes etc.

        lane_basename = File.basename(old_lane_path)
        new_lane_path = File.join(new_lanes_dir, lane_basename)
        FileUtils.mkdir_p(new_lane_path) # Create lane dir instead of moving

        notes_dir_in_lane = File.join(new_lane_path, "notes")
        FileUtils.mkdir_p(notes_dir_in_lane)

        # Now, process the notes from the OLD lane directory.
        Dir.glob(File.join(old_lane_path, "*.md")).each do |note_path|
          note_basename = File.basename(note_path, ".md")
          order_match = note_basename.match(/^(\d+)_/)
          next unless order_match
          order = order_match[1]

          note_uuid = UUID.random.to_s
          note_content = File.read(note_path)

          # Create the note in the central store.
          File.write(File.join(new_tocry_note_dir, note_uuid), note_content)

          # Create the pointer file in the lane's 'notes' directory.
          pointer_path = File.join(notes_dir_in_lane, "#{order}_#{note_uuid}")
          note_canonical_path = File.join(new_tocry_note_dir, note_uuid)
          FileUtils.ln_s(Path[note_canonical_path].relative_to(Path[pointer_path].parent), pointer_path)
        end
      end
    end

    # Clean up the old `boards` directory and replace it with the new one.
    FileUtils.rm_rf(old_boards_dir)
    FileUtils.mv(new_boards_dir_temp, old_boards_dir)

    Log.info { "Successfully migrated boards to centralized note storage." }
  end
end
