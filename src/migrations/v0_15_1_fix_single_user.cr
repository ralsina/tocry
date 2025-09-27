require "../board_index"
require "../board_reference"

module ToCry::Migration
  # Migration for v0.15.1: Fix Single-User Mode Board Visibility
  #
  # This migration addresses an issue where boards created in versions prior to 0.15.0
  # are not visible to the root user in single-user mode after the v0.15.0 migration.
  #
  # The problem occurs because:
  # 1. Old data (pre-0.15.0) has boards in the filesystem but no BoardIndex/BoardReference entries
  # 2. The v0.15.0 migration creates these entries but only for boards it finds in data/boards/
  # 3. In some cases, boards exist in data/ToCry::Board/ but have no corresponding entries in data/boards/
  #
  # This migration ensures all boards are properly indexed and accessible to the root user.
  private def self.migrate_fix_single_user_board_visibility
    data_dir = ToCry.data_directory
    old_boards_dir = File.join(data_dir, "ToCry::Board")
    boards_dir = File.join(data_dir, "boards")

    Log.info { "Starting single-user mode board visibility fix..." }

    # Step 1: Ensure all old boards have corresponding entries in the new boards directory
    migrate_old_boards_to_new_structure(old_boards_dir, boards_dir)

    # Step 2: Ensure all boards have BoardIndex entries
    ensure_all_boards_have_index_entries(boards_dir)

    # Step 3: Ensure root user has references to all boards
    ensure_root_user_has_all_board_references

    Log.info { "Single-user mode board visibility fix completed successfully" }
  end

  # Migrate boards from old structure (data/ToCry::Board/{UUID}) to new structure (data/boards/{UUID}.{name})
  private def self.migrate_old_boards_to_new_structure(old_boards_dir : String, boards_dir : String)
    return unless Dir.exists?(old_boards_dir)

    Log.info { "Checking for boards in old structure that need migration..." }

    FileUtils.mkdir_p(boards_dir) unless Dir.exists?(boards_dir)

    migrated_count = 0
    Dir.children(old_boards_dir).each do |board_uuid|
      board_path = File.join(old_boards_dir, board_uuid)
      next unless File.directory?(board_path)

      # Skip if this board already exists in the new structure
      existing_entries = Dir.children(boards_dir).select(&.starts_with?(board_uuid))
      next unless existing_entries.empty?

      begin
        # Try to load the board to get its name
        board = ToCry::Board.load(board_uuid, board_path)
        board_name = board.name

        # Create symlink in new structure
        new_board_path = File.join(boards_dir, "#{board_uuid}.#{board_name}")

        # Create relative symlink from new location to old location
        relative_target = File.join("..", "ToCry::Board", board_uuid)
        File.symlink(relative_target, new_board_path)

        migrated_count += 1
        Log.info { "Migrated board '#{board_name}' (#{board_uuid}) to new structure" }
      rescue ex
        Log.warn { "Failed to migrate board '#{board_uuid}' to new structure: #{ex.message}" }
      end
    end

    Log.info { "Old to new board structure migration completed. Migrated #{migrated_count} boards." } if migrated_count > 0
  end

  # Ensure all boards in the boards directory have corresponding BoardIndex entries
  private def self.ensure_all_boards_have_index_entries(boards_dir : String)
    return unless Dir.exists?(boards_dir)

    Log.info { "Ensuring all boards have BoardIndex entries..." }

    indexed_count = 0
    Dir.children(boards_dir).each do |entry|
      # Expected format: {UUID}.{name}
      if match = entry.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(.+)$/)
        uuid, canonical_name = match[1], match[2]

        # Skip if this board already has a BoardIndex entry
        next if ToCry::BoardIndex.find_by_uuid(uuid)

        begin
          # Create BoardIndex entry
          board_index = ToCry::BoardIndex.new(
            board_uuid: uuid,
            board_name: canonical_name,
            owner: "root"
          )

          # Try to get creation time from directory stats if possible
          board_path = File.join(boards_dir, entry)
          if dir_stats = File.info?(board_path)
            board_index.created_at = dir_stats.modification_time
            board_index.updated_at = dir_stats.modification_time
          end

          board_index.save
          indexed_count += 1

          Log.info { "Created BoardIndex for: #{canonical_name} (#{uuid})" }
        rescue ex
          Log.warn { "Failed to create BoardIndex for '#{entry}': #{ex.message}" }
        end
      end
    end

    Log.info { "BoardIndex creation completed. Created #{indexed_count} entries." } if indexed_count > 0
  end

  # Ensure root user has BoardReference entries for all boards
  private def self.ensure_root_user_has_all_board_references
    Log.info { "Ensuring root user has references to all boards..." }

    # Get all board UUIDs from BoardIndex
    all_board_uuids = ToCry::BoardIndex.all.map(&.board_uuid)

    # Get all board UUIDs that root user already has references to
    root_references = ToCry::BoardReference.accessible_to_user("root")
    root_board_uuids = root_references.map(&.board_uuid)

    # Find boards that root user doesn't have references to
    missing_boards = all_board_uuids - root_board_uuids

    if missing_boards.empty?
      Log.info { "Root user already has references to all boards" }
      return
    end

    reference_count = 0
    missing_boards.each do |board_uuid|
      begin
        # Get the board name from BoardIndex
        board_index = ToCry::BoardIndex.find_by_uuid(board_uuid)
        next unless board_index

        # Create BoardReference for root user
        board_reference = ToCry::BoardReference.new(
          user_id: "root",
          board_uuid: board_uuid,
          board_name: board_index.board_name,
          access_type: "owner"
        )

        board_reference.save
        reference_count += 1

        Log.info { "Created BoardReference for root user: #{board_index.board_name} (#{board_uuid})" }
      rescue ex
        Log.warn { "Failed to create BoardReference for root user, board '#{board_uuid}': #{ex.message}" }
      end
    end

    Log.info { "Root user BoardReference creation completed. Created #{reference_count} references." }
  end
end
