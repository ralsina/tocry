require "../board_index"
require "../board_reference"

module ToCry::Migration
  # Migration for v0.18.0: BoardManager Sepia persistence with BoardReference
  #
  # This migration introduces Sepia-based board indexing and user board references
  # to replace the complex filesystem scanning and symlink management approach.
  # Uses BoardReference to allow users to have personal names for shared boards.
  #
  # Changes:
  # - BoardIndex class for tracking all boards with metadata
  # - BoardReference class for user-specific board names and access
  # - Eliminates need for filesystem scanning on startup
  # - Replaces symlink-based user-board relationships with Sepia persistence
  # - Preserves ability for users to have different names for the same board
  # - Maintains all existing functionality while improving performance and reliability
  # - Migration populates new classes from existing filesystem structure
  private def self.migrate_board_manager_to_sepia
    data_dir = ToCry.data_directory
    boards_dir = File.join(data_dir, "boards")
    users_dir = File.join(data_dir, "users")

    Log.info { "Starting BoardManager Sepia migration..." }

    # Migrate board index from filesystem scanning
    migrate_board_index(boards_dir)

    # Migrate user-board relationships from symlinks
    migrate_user_board_references(users_dir, boards_dir)

    Log.info { "BoardManager Sepia migration completed successfully" }
  end

  # Migrate board index by scanning the boards directory
  private def self.migrate_board_index(boards_dir : String)
    return unless Dir.exists?(boards_dir)

    Log.info { "Migrating board index from '#{boards_dir}'..." }

    board_count = 0
    Dir.children(boards_dir).each do |entry|
      # Expected format: {UUID}.{name}
      if match = entry.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(.+)$/)
        uuid = match[1]
        name = match[2]
        board_path = File.join(boards_dir, entry)

        # Skip if not a symlink (invalid board entry)
        next unless File.symlink?(board_path)

        begin
          # Load the actual board to get more information
          board = ToCry::Board.load(uuid, board_path)

          # Try to determine the owner from the board's canonical path or default to root
          # The canonical path should be in ToCry::Board/{uuid}/
          owner = determine_board_owner(board.canonical_path)

          # Create board index entry if it doesn't already exist
          unless ToCry::BoardIndex.exists?(uuid)
            board_index = ToCry::BoardIndex.new(uuid, name, owner)
            board_index.save
            board_count += 1
            Log.info { "Indexed board: '#{name}' (#{uuid}) owned by '#{owner}'" }
          end

        rescue ex
          Log.warn { "Failed to migrate board index for '#{entry}': #{ex.message}" }
        end
      else
        Log.warn { "Found invalid board directory name format: '#{entry}'" }
      end
    end

    Log.info { "Migrated #{board_count} boards to BoardIndex" }
  end

  # Migrate user-board references from symlinks
  private def self.migrate_user_board_references(users_dir : String, boards_dir : String)
    return unless Dir.exists?(users_dir)

    Log.info { "Migrating user-board references from '#{users_dir}'..." }

    reference_count = 0
    Dir.children(users_dir).each do |user_entry|
      user_id = user_entry
      user_boards_path = File.join(users_dir, user_id, "boards")

      next unless Dir.exists?(user_boards_path)

      Dir.children(user_boards_path).each do |board_entry|
        # Expected format: {UUID}.{name}
        if match = board_entry.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(.+)$/)
          board_uuid = match[1]
          board_name = match[2] # This is the user's personal name for this board
          user_board_path = File.join(user_boards_path, board_entry)

          # Skip if not a symlink
          next unless File.symlink?(user_board_path)

          begin
            # Determine if this is owned or shared access
            access_type = determine_access_type(user_id, board_uuid, boards_dir)

            # Create board reference entry if it doesn't already exist
            unless ToCry::BoardReference.has_reference?(user_id, board_uuid)
              reference = ToCry::BoardReference.new(user_id, board_uuid, board_name, access_type, user_id)
              reference.save
              reference_count += 1
              Log.info { "Created #{access_type} reference: user '#{user_id}' -> board '#{board_name}' (#{board_uuid})" }
            end

          rescue ex
            Log.warn { "Failed to migrate user-board reference for '#{user_id}' -> '#{board_entry}': #{ex.message}" }
          end
        else
          Log.warn { "Found invalid board entry format in user directory: '#{board_entry}'" }
        end
      end
    end

    Log.info { "Migrated #{reference_count} user-board references" }
  end

  # Determine board owner from canonical path
  private def self.determine_board_owner(canonical_path : String) : String
    # The canonical path should be something like: /data/ToCry::Board/{uuid}/
    # For now, we'll default to "root" since the original system didn't track owners explicitly
    # In a future version, we could try to infer ownership from filesystem permissions or other means
    "root"
  end

  # Determine access type (owner vs shared) for a user-board relationship
  private def self.determine_access_type(user_id : String, board_uuid : String, boards_dir : String) : String
    # For the initial migration, we'll treat:
    # - root user as owner of all boards they have access to
    # - other users as having shared access (since they got access via symlinks)
    # This is a simplification, but maintains functionality

    if user_id == "root"
      # Check if there's a canonical board entry for this board
      canonical_board_path = Dir.glob(File.join(boards_dir, "#{board_uuid}.*")).first?
      return "owner" if canonical_board_path && File.symlink?(canonical_board_path)
    end

    "shared"
  end
end
