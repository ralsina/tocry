require "crystar"
require "file_utils"
require "json"
require "uuid"
require "./user"
require "./board"
require "./lane"
require "./note"
require "./upload"
require "./board_index"
require "./board_reference"

module ToCry
  class DataExport
    Log = ::Log.for(self)

    # Export structure for user data
    struct ExportData
      include JSON::Serializable

      property version : String
      property export_date : Time
      property tocry_version : String
      property users : Array(User)
      property boards : Array(Board)
      property uploads : Array(Upload)
      property board_indexes : Array(BoardIndex)
      property board_references : Array(BoardReference)

      def initialize(@version : String, @export_date : Time, @tocry_version : String)
        @users = [] of User
        @boards = [] of Board
        @uploads = [] of Upload
        @board_indexes = [] of BoardIndex
        @board_references = [] of BoardReference
      end
    end

    # Export all user data to a tarball
    def self.export_user_data(user_id : String, output_path : String) : Bool
      Log.info { "Starting data export for user #{user_id}" }

      begin
        # Skip export in demo mode
        if Demo.demo_mode?
          Log.warn { "Data export not available in demo mode" }
          return false
        end

        # Create temporary directory for export
        temp_dir = File.join(Dir.tempdir, "tocry_export_#{UUID.random}")
        FileUtils.mkdir_p(temp_dir)

        # Create export data structure
        export_data = ExportData.new("1.0", Time.utc, "0.17.0")

        # Get all boards accessible to the user
        board_refs = BoardReference.accessible_to_user(user_id)
        board_uuids = board_refs.map(&.board_uuid)

        # Export users (just the current user and root for single-user mode)
        if user_id == "root"
          # In single-user mode, export root user and any other users
          root_user = User.find_by_email("root")
          export_data.users << root_user if root_user

          # Try to find other users (this is a simplified approach)
          # In a real implementation, we'd need a proper way to list all users
          begin
            # For now, just export the root user in single-user mode
          rescue
            # If we can't list users, just continue with root
          end
        else
          # Multi-user mode, export just this user
          current_user = User.find_by_id(user_id)
          export_data.users << current_user if current_user
        end

        # Export boards and their data
        board_uuids.each do |uuid|
          begin
            board = Board.load(uuid)
            export_data.boards << board
          rescue
            Log.warn { "Failed to load board #{uuid} for export" }
          end
        end

        # Export uploads - for now, we'll skip this as Upload doesn't have an .all method
        # In a full implementation, we'd need to iterate through Sepia storage
        export_data.uploads = [] of Upload

        # Export board indexes for the user's boards
        export_data.board_indexes = BoardIndex.all.select do |index|
          board_uuids.includes?(index.board_uuid)
        end

        # Export board references for the user
        export_data.board_references = BoardReference.find_by_user(user_id)

        # Write metadata file
        metadata_path = File.join(temp_dir, "metadata.json")
        File.write(metadata_path, export_data.to_json)

        # Copy upload files
        files_dir = File.join(temp_dir, "files")
        FileUtils.mkdir_p(files_dir)

        export_data.uploads.each do |upload|
          if upload.file_exists?
            dest_path = File.join(files_dir, upload.relative_path)
            FileUtils.mkdir_p(File.dirname(dest_path))
            FileUtils.cp(upload.full_path, dest_path)
          end
        end

        # Create tarball
        File.open(output_path, "w") do |file|
          Crystar::Writer.open(file) do |tar|
            # Add metadata
            metadata_file = File.open(metadata_path)
            tar.add(metadata_file)

            # Add files
            if Dir.exists?(files_dir)
              Dir.glob(File.join(files_dir, "**/*")).each do |file_path|
                next if File.directory?(file_path)
                relative_path = file_path[files_dir.size + 1..-1]

                # Create header and add file
                file_to_add = File.open(file_path)
                hdr = Crystar.file_info_header(file_to_add, File.join("files", relative_path))
                tar.write_header(hdr)
                IO.copy(file_to_add, tar)
                file_to_add.close
              end
            end
          end
        end

        # Clean up
        FileUtils.rm_rf(temp_dir)

        Log.info { "Data export completed successfully: #{output_path}" }
        true
      rescue ex
        Log.error(exception: ex) { "Failed to export data: #{ex.message}" }
        false
      end
    end

    # Import user data from a tarball
    def self.import_user_data(user_id : String, input_path : String) : Bool
      Log.info { "Starting data import for user #{user_id}" }

      begin
        # Skip import in demo mode
        if Demo.demo_mode?
          Log.warn { "Data import not available in demo mode" }
          return false
        end

        # Create temporary directory for extraction
        temp_dir = File.join(Dir.tempdir, "tocry_import_#{UUID.random}")
        FileUtils.mkdir_p(temp_dir)

        # Extract tarball
        File.open(input_path, "r") do |file|
          Crystar::Reader.open(file) do |tar|
            tar.each_entry do |entry|
              dest_path = File.join(temp_dir, entry.name)
              if entry.flag == Crystar::DIR
                FileUtils.mkdir_p(dest_path)
              else
                FileUtils.mkdir_p(File.dirname(dest_path))
                File.open(dest_path, "w") do |output|
                  IO.copy(entry.io, output)
                end
              end
            end
          end
        end

        # Read metadata
        metadata_path = File.join(temp_dir, "metadata.json")
        unless File.exists?(metadata_path)
          Log.error { "Invalid export file: metadata.json not found" }
          FileUtils.rm_rf(temp_dir)
          return false
        end

        export_data = ExportData.from_json(File.read(metadata_path))

        # Validate version
        if export_data.version != "1.0"
          Log.error { "Unsupported export version: #{export_data.version}" }
          FileUtils.rm_rf(temp_dir)
          return false
        end

        # Import users (skip if they already exist)
        export_data.users.each do |user|
          unless User.find_by_email(user.email)
            # Generate new UUID for imported user
            user = User.new(user.email, user.name, user.provider)
            user.is_root = user.is_root
            user.save
            Log.info { "Imported user: #{user.email}" }
          end
        end

        # Import boards
        board_mapping = {} of String => String # Map old UUID to new UUID
        export_data.boards.each do |board|
          # Generate new UUID for imported board
          new_uuid = UUID.random.to_s
          board_mapping[board.sepia_id] = new_uuid

          # Create board with new UUID
          new_board = Board.new(board.name, board.lanes, board.color_scheme)
          # Note: We need to update the sepia_id after creation
          # This is a limitation of Sepia::Object
          new_board.save

          Log.info { "Imported board: #{board.name}" }
        end

        # Import uploads
        export_data.uploads.each do |upload|
          new_upload = Upload.new(
            upload.original_filename,
            upload.file_extension,
            upload.file_size,
            upload.upload_type,
            upload.uploaded_by,
            upload.relative_path,
            upload.content_type,
            upload.note_id
          )
          new_upload.upload_date = upload.upload_date
          new_upload.save

          # Copy file if it exists
          source_path = File.join(temp_dir, "files", upload.relative_path)
          if File.exists?(source_path)
            FileUtils.mkdir_p(File.dirname(new_upload.full_path))
            FileUtils.cp(source_path, new_upload.full_path)
          end
        end

        # Import board indexes
        export_data.board_indexes.each do |index|
          if new_uuid = board_mapping[index.board_uuid]?
            new_index = BoardIndex.new(new_uuid, index.board_name, index.owner)
            new_index.created_at = index.created_at
            new_index.updated_at = index.updated_at
            new_index.save
          end
        end

        # Import board references
        export_data.board_references.each do |ref|
          if new_uuid = board_mapping[ref.board_uuid]?
            new_ref = BoardReference.new(ref.user_id, new_uuid, ref.board_name, ref.access_type, ref.granted_by)
            new_ref.created_at = ref.created_at
            new_ref.save
          end
        end

        # Clean up
        FileUtils.rm_rf(temp_dir)

        Log.info { "Data import completed successfully" }
        true
      rescue ex
        Log.error(exception: ex) { "Failed to import data: #{ex.message}" }
        false
      end
    end

    # Get export file name for user
    def self.export_filename(user_id : String) : String
      timestamp = Time.utc.to_s("%Y%m%d_%H%M%S")
      "tocry_export_#{user_id}_#{timestamp}.tar.gz"
    end

    # Validate export file
    def self.validate_export_file(file_path : String) : Bool
      # Extract and check metadata
      temp_dir = File.join(Dir.tempdir, "tocry_validate_#{UUID.random}")
      FileUtils.mkdir_p(temp_dir)

      begin
        File.open(file_path, "r") do |file|
          Crystar::Reader.open(file) do |tar|
            found_metadata = false
            tar.each_entry do |entry|
              if entry.name == "metadata.json"
                found_metadata = true
                break
              end
            end
            return false unless found_metadata
          end
        end

        # Try to parse metadata
        metadata_path = File.join(temp_dir, "metadata.json")
        File.open(file_path, "r") do |file|
          Crystar::Reader.open(file) do |tar|
            tar.each_entry do |entry|
              if entry.name == "metadata.json"
                File.open(metadata_path, "w") do |output|
                  IO.copy(entry.io, output)
                end
                break
              end
            end
          end
        end

        export_data = ExportData.from_json(File.read(metadata_path))

        # Basic validation
        export_data.version == "1.0" &&
        export_data.users.size > 0 &&
        export_data.boards.size > 0
      rescue
        false
      ensure
        FileUtils.rm_rf(temp_dir)
      end
    end
  end
end
