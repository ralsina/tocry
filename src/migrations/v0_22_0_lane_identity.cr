require "uuid"

module ToCry::Migration
  # Migration for v0.22.0: Fix Lane Identity and Storage
  #
  # This migration fixes a critical bug where lane renaming caused data loss.
  # The problem was that Lane objects were overriding their sepia_id (UUID)
  # with the lane name, causing storage to be name-based instead of UUID-based.
  #
  # This migration:
  # 1. Generates proper UUIDs for all lanes that are using name-based storage
  # 2. Migrates lane directories from name-based paths to UUID-based paths
  # 3. Updates all board references to use the new lane UUIDs
  # 4. Ensures lane identity is preserved during renames
  #
  # Before migration: data/ToCry::Lane/DOING/data.json
  # After migration:  data/ToCry::Lane/abc123-def456-.../data.json
  private def self.migrate_fix_lane_identity_and_storage
    data_dir = ToCry.data_directory
    lanes_dir = File.join(data_dir, "ToCry::Lane")

    Log.info { "Starting lane identity and storage migration..." }

    return unless Dir.exists?(lanes_dir)

    Log.info { "Migrating lanes from name-based storage to UUID-based storage..." }

    migrated_count = 0
    error_count = 0

    Dir.children(lanes_dir).each do |lane_name|
      lane_path = File.join(lanes_dir, lane_name)
      next unless File.directory?(lane_path)

      # Skip if this directory already looks like a UUID
      if lane_name.matches?(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
        Log.debug { "Lane '#{lane_name}' already has UUID-based storage, skipping" }
        next
      end

      begin
        migrate_lane_to_uuid_storage(lane_name, lane_path, lanes_dir)
        migrated_count += 1
        Log.info { "Migrated lane '#{lane_name}' to UUID-based storage" }
      rescue ex
        error_count += 1
        Log.error(exception: ex) { "Failed to migrate lane '#{lane_name}': #{ex.message}" }
      end
    end

    Log.info { "Lane migration completed. Migrated: #{migrated_count}, Errors: #{error_count}" }
  end

  # Migrate a single lane from name-based to UUID-based storage
  private def self.migrate_lane_to_uuid_storage(lane_name : String, old_lane_path : String, lanes_dir : String)
    # Generate a new UUID for this lane
    new_lane_uuid = UUID.random.to_s

    new_lane_path = File.join(lanes_dir, new_lane_uuid)

    # Load the lane data to update it
    data_file = File.join(old_lane_path, "data.json")
    unless File.exists?(data_file)
      raise "Lane data file not found: #{data_file}"
    end

    # Parse and update the lane data
    lane_data = JSON.parse(File.read(data_file)).as_h

    # Update the sepia_id in the lane data to be the new UUID
    lane_data["sepia_id"] = JSON::Any.new(new_lane_uuid)

    # Ensure the name is preserved as a separate property
    lane_data["name"] = JSON::Any.new(lane_name)

    # Create the new directory
    FileUtils.mkdir_p(new_lane_path)

    # Write the updated lane data to the new location
    new_data_file = File.join(new_lane_path, "data.json")
    File.write(new_data_file, lane_data.to_json)

    # Update all boards that reference this lane to use the new UUID
    update_boards_with_new_lane_uuid(lane_name, new_lane_uuid)

    # Remove the old directory after successful migration
    FileUtils.rm_rf(old_lane_path)

    Log.info { "Successfully migrated lane '#{lane_name}' to UUID '#{new_lane_uuid}'" }
  end

  # Update all boards that reference the old lane name to use the new UUID
  private def self.update_boards_with_new_lane_uuid(old_lane_name : String, new_lane_uuid : String)
    data_dir = ToCry.data_directory
    boards_dir = File.join(data_dir, "boards")

    return unless Dir.exists?(boards_dir)

    updated_boards = 0

    Dir.children(boards_dir).each do |board_entry|
      board_path = File.join(boards_dir, board_entry)
      next unless File.directory?(board_path) || File.symlink?(board_path)

      # Try to load the board and check if it contains the lane
      begin
        # Extract UUID from board entry name
        board_uuid = board_entry.split('.')[0]?
        next unless board_uuid

        board = ToCry::Board.load(board_uuid)
        next unless board

        # Check if this board has the lane we're migrating
        lane_found = false

        updated_lanes = [] of ToCry::Lane
        board.lanes.each do |lane|
          if lane.sepia_id == old_lane_name || lane.name == old_lane_name
            # Create a new lane with the updated UUID to replace the old one
            updated_lane = ToCry::Lane.new(new_lane_uuid, lane.name, lane.notes)
            updated_lanes << updated_lane
            lane_found = true
            Log.info { "Updated lane '#{old_lane_name}' in board '#{board.name}' to use UUID '#{new_lane_uuid}'" }
          else
            # Keep the lane as-is
            updated_lanes << lane
          end
        end

        # Replace the board's lanes with the updated list
        board.lanes = updated_lanes

        if lane_found
          board.save
          updated_boards += 1
        end
      rescue ex
        Log.warn { "Failed to update board '#{board_entry}' for lane migration: #{ex.message}" }
      end
    end

    Log.info { "Updated #{updated_boards} boards to use new lane UUID '#{new_lane_uuid}'" } if updated_boards > 0
  end
end
