require "../board_index"
require "../board_reference"

module ToCry::Migration
  # Consolidated Migration for v0.15.0: Complete Sepia Integration
  #
  # This migration combines all the individual Sepia migrations that were developed
  # in the more-sepia branch but never released as separate versions:
  # - Board color schemes from JSON files to Board properties
  # - User class from in-memory storage to Sepia persistence
  # - Upload management with Sepia metadata tracking
  # - BoardManager with BoardIndex and BoardReference system
  #
  # Changes:
  # - Board color_scheme property now persisted with Board objects in Sepia
  # - User class extends Sepia::Object for persistent storage across restarts
  # - Upload class tracks file metadata with Sepia persistence
  # - BoardManager uses BoardIndex and BoardReference for efficient board discovery
  # - Eliminates filesystem scanning and symlink management in favor of Sepia queries
  # - All major data structures now use Sepia for persistence
  private def self.migrate_complete_sepia_integration
    data_dir = ToCry.data_directory

    Log.info { "Starting complete Sepia integration migration..." }

    # Step 1: Migrate color schemes from separate JSON files to Board objects
    migrate_color_schemes_from_json_files(data_dir)

    # Step 2: Initialize root user for no-auth and basic-auth modes
    initialize_sepia_users

    # Step 3: Create Upload records for existing uploaded files
    migrate_existing_uploads_to_sepia(data_dir)

    # Step 4: Migrate board management from filesystem scanning to Sepia indexing
    migrate_board_management_to_sepia(data_dir)

    Log.info { "Complete Sepia integration migration completed successfully" }
  end

  # Migrate color schemes from separate JSON files to Board object properties
  private def self.migrate_color_schemes_from_json_files(data_dir : String)
    boards_dir = File.join(data_dir, "ToCry::Board")

    return unless Dir.exists?(boards_dir)

    Log.info { "Migrating board color schemes from JSON files to Sepia..." }

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

        Log.info { "Migrated color scheme '#{color_scheme}' for board '#{board.name}'" }
      rescue ex
        Log.warn { "Failed to migrate color scheme for board '#{board_uuid}': #{ex.message}" }
        # Continue with other boards
      end
    end

    Log.info { "Color scheme migration completed" }
  end

  # Initialize Sepia-based user storage with root user
  private def self.initialize_sepia_users
    Log.info { "Initializing Sepia user storage..." }

    # Create root user for no-auth and basic-auth modes if it doesn't exist
    unless ToCry::User.find_by_email("root")
      root_user = ToCry::User.new(
        email: "root",
        name: "Root User",
        provider: "noauth", # Will be updated based on actual auth mode at runtime
        is_root: true
      )
      root_user.save
      Log.info { "Created root user in Sepia storage" }
    else
      Log.info { "Root user already exists in Sepia storage" }
    end

    Log.info { "User storage initialization completed" }
  end

  # Create Upload records for existing uploaded files
  private def self.migrate_existing_uploads_to_sepia(data_dir : String)
    Log.info { "Migrating existing uploads to Sepia metadata tracking..." }

    # Migrate existing user-images
    migrate_existing_user_images(data_dir)

    # Migrate existing note attachments
    migrate_existing_note_attachments(data_dir)

    Log.info { "Upload management migration to Sepia completed" }
  end

  private def self.migrate_existing_user_images(data_dir : String)
    images_dir = File.join(data_dir, "uploads", "user-images")

    return unless Dir.exists?(images_dir)

    Log.info { "Migrating existing user images..." }

    Dir.glob(File.join(images_dir, "*")).each do |image_path|
      next unless File.file?(image_path)

      filename = File.basename(image_path)
      next if filename.starts_with?(".") # Skip hidden files

      begin
        file_stats = File.info(image_path)
        extension = File.extname(filename)
        relative_path = File.join("uploads", "user-images", filename)

        # Create Upload record for existing image
        upload = ToCry::Upload.new(
          original_filename: filename,
          file_extension: extension,
          file_size: file_stats.size.to_i64,
          upload_type: "image",
          uploaded_by: "root", # Default to root user for existing files
          relative_path: relative_path,
          content_type: guess_content_type_from_extension(extension)
        )

        # Override the upload date with file modification time if possible
        upload.upload_date = file_stats.modification_time
        upload.save

        Log.info { "Migrated image upload: #{filename}" }

      rescue ex
        Log.warn { "Failed to migrate image upload '#{filename}': #{ex.message}" }
        # Continue with other files
      end
    end
  end

  private def self.migrate_existing_note_attachments(data_dir : String)
    attachments_dir = File.join(data_dir, "uploads", "attachments")

    return unless Dir.exists?(attachments_dir)

    Log.info { "Migrating existing note attachments..." }

    # Iterate through note directories
    Dir.glob(File.join(attachments_dir, "*")).each do |note_dir|
      next unless File.directory?(note_dir)

      note_id = File.basename(note_dir)

      # Iterate through attachment files in this note directory
      Dir.glob(File.join(note_dir, "*")).each do |attachment_path|
        next unless File.file?(attachment_path)

        filename = File.basename(attachment_path)
        next if filename.starts_with?(".") # Skip hidden files

        begin
          file_stats = File.info(attachment_path)
          extension = File.extname(filename)
          relative_path = File.join("uploads", "attachments", note_id, filename)

          # Try to extract original filename from UUID prefix pattern
          original_filename = if filename.includes?("_")
                               filename.split("_", 2)[1]? || filename
                             else
                               filename
                             end

          # Create Upload record for existing attachment
          upload = ToCry::Upload.new(
            original_filename: original_filename,
            file_extension: extension,
            file_size: file_stats.size.to_i64,
            upload_type: "attachment",
            uploaded_by: "root", # Default to root user for existing files
            relative_path: relative_path,
            content_type: guess_content_type_from_extension(extension),
            note_id: note_id
          )

          # Override the upload date with file modification time if possible
          upload.upload_date = file_stats.modification_time
          upload.save

          Log.info { "Migrated attachment: #{filename} for note #{note_id}" }

        rescue ex
          Log.warn { "Failed to migrate attachment '#{filename}' for note '#{note_id}': #{ex.message}" }
          # Continue with other files
        end
      end
    end
  end

  # Migrate board management from filesystem scanning to Sepia indexing
  private def self.migrate_board_management_to_sepia(data_dir : String)
    boards_dir = File.join(data_dir, "boards")
    users_dir = File.join(data_dir, "users")

    Log.info { "Starting BoardManager Sepia migration..." }

    # Migrate board index from filesystem scanning
    migrate_board_index_from_filesystem(boards_dir)

    # Migrate user-board relationships from symlinks
    migrate_user_board_references_from_symlinks(users_dir, boards_dir)

    Log.info { "BoardManager Sepia migration completed successfully" }
  end

  # Migrate board index by scanning the boards directory
  private def self.migrate_board_index_from_filesystem(boards_dir : String)
    return unless Dir.exists?(boards_dir)

    Log.info { "Migrating board index from '#{boards_dir}'..." }

    board_count = 0
    Dir.children(boards_dir).each do |entry|
      # Expected format: {UUID}.{name}
      if match = entry.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(.+)$/)
        uuid, canonical_name = match[1], match[2]
        board_path = File.join(boards_dir, entry)

        next unless File.directory?(board_path)

        begin
          # Load the board to get owner information and creation time
          board = ToCry::Board.load(uuid, board_path)

          # Determine owner - for now, default to root since we don't have historical ownership data
          owner = "root"

          # Create BoardIndex entry
          board_index = ToCry::BoardIndex.new(
            board_uuid: uuid,
            board_name: canonical_name,
            owner: owner
          )

          # Try to get creation time from directory stats if possible
          if dir_stats = File.info?(board_path)
            board_index.created_at = dir_stats.modification_time
            board_index.updated_at = dir_stats.modification_time
          end

          board_index.save
          board_count += 1

          Log.info { "Indexed board: #{canonical_name} (#{uuid})" }

        rescue ex
          Log.warn { "Failed to index board '#{entry}': #{ex.message}" }
          # Continue with other boards
        end
      else
        Log.warn { "Skipping invalid board directory name: #{entry}" }
      end
    end

    Log.info { "Board index migration completed. Indexed #{board_count} boards." }
  end

  # Migrate user-board relationships from symlink structure
  private def self.migrate_user_board_references_from_symlinks(users_dir : String, boards_dir : String)
    return unless Dir.exists?(users_dir) && Dir.exists?(boards_dir)

    Log.info { "Migrating user-board references from '#{users_dir}'..." }

    reference_count = 0
    Dir.children(users_dir).each do |user_id|
      user_path = File.join(users_dir, user_id)
      user_boards_path = File.join(user_path, "boards")

      next unless File.directory?(user_boards_path)

      # Scan user's board directory for symlinks
      Dir.children(user_boards_path).each do |board_link|
        board_link_path = File.join(user_boards_path, board_link)

        next unless File.symlink?(board_link_path)

        begin
          # Resolve the symlink to find the target board
          target_path = File.readlink(board_link_path)

          # Extract UUID from the target path
          # Expected pattern: ../../../boards/{UUID}.{name}
          if match = target_path.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(.+)$/)
            board_uuid = match[1]

            # Use the symlink name as the user's personal board name
            personal_board_name = board_link

            # Create BoardReference
            board_reference = ToCry::BoardReference.new(
              user_id: user_id,
              board_uuid: board_uuid,
              board_name: personal_board_name,
              access_type: "owner" # Default to owner for existing references
            )

            board_reference.save
            reference_count += 1

            Log.info { "Created board reference: #{user_id} -> #{personal_board_name} (#{board_uuid})" }

          else
            Log.warn { "Could not extract board UUID from symlink target: #{target_path}" }
          end

        rescue ex
          Log.warn { "Failed to migrate board reference '#{board_link}' for user '#{user_id}': #{ex.message}" }
          # Continue with other references
        end
      end
    end

    Log.info { "User-board reference migration completed. Created #{reference_count} references." }
  end

  # Helper method to guess content type from file extension
  private def self.guess_content_type_from_extension(extension : String) : String
    case extension.downcase
    when ".jpg", ".jpeg" then "image/jpeg"
    when ".png" then "image/png"
    when ".gif" then "image/gif"
    when ".webp" then "image/webp"
    when ".pdf" then "application/pdf"
    when ".txt" then "text/plain"
    when ".md" then "text/markdown"
    when ".doc" then "application/msword"
    when ".docx" then "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    else "application/octet-stream"
    end
  end
end
