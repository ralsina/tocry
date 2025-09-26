require "uuid"
require "sepia"
require "json"

module ToCry
  # Upload class with Sepia persistence for file upload management.
  # Tracks metadata about uploaded files while keeping the actual files on disk.
  class Upload < Sepia::Object
    include JSON::Serializable
    include Sepia::Container

    property upload_id : String # Store the UUID separately for easier access
    property original_filename : String
    property file_extension : String
    property file_size : Int64
    property upload_type : String # "image", "attachment"
    property uploaded_by : String # user ID
    property upload_date : Time
    property relative_path : String # path relative to data directory
    property content_type : String?
    property note_id : String? # for attachments, which note they belong to

    # Constructor for new uploads (generates UUID as sepia_id)
    def initialize(@original_filename : String, @file_extension : String, @file_size : Int64,
                   @upload_type : String, @uploaded_by : String, @relative_path : String,
                   @content_type : String? = nil, @note_id : String? = nil)
      @upload_date = Time.utc
      @upload_id = UUID.random.to_s
      # Set sepia_id directly (don't call super for Sepia::Object)
      @sepia_id = @upload_id
    end

    # Default constructor for deserialization (Sepia needs this)
    def initialize(@upload_id : String = UUID.random.to_s, @original_filename : String = "",
                   @file_extension : String = "", @file_size : Int64 = 0_i64, @upload_type : String = "",
                   @uploaded_by : String = "", @upload_date : Time = Time.utc,
                   @relative_path : String = "", @content_type : String? = nil,
                   @note_id : String? = nil)
      # Set sepia_id from upload_id for deserialization
      @sepia_id = @upload_id
    end

    # Get the full filesystem path to the uploaded file
    def full_path : String
      File.join(ToCry.data_directory, @relative_path)
    end

    # Get the public URL for this upload (for web access)
    def public_url : String
      case @upload_type
      when "image"
        "/user-images/#{File.basename(@relative_path)}"
      when "attachment"
        "/attachments/#{@note_id}/#{File.basename(@relative_path)}"
      else
        "/uploads/#{File.basename(@relative_path)}"
      end
    end

    # Check if the physical file exists on disk
    def file_exists? : Bool
      File.exists?(full_path)
    end

    # Delete the physical file from disk
    def delete_file : Bool
      if file_exists?
        begin
          File.delete(full_path)
          ToCry::Log.info { "Deleted file: '#{full_path}'" }
          true
        rescue ex
          ToCry::Log.error { "Failed to delete file '#{full_path}': #{ex.message}" }
          false
        end
      else
        ToCry::Log.warn { "File not found for deletion: '#{full_path}'" }
        false
      end
    end

    # Find uploads by note (for attachments) - simplified implementation
    def self.find_by_note(note_id : String) : Array(Upload)
      # For now, return empty array - this can be enhanced later
      # In a full implementation, we'd need to iterate through Sepia storage
      # or implement indexing
      [] of Upload
    end
  end
end
