# /home/ralsina/code/tocry/src/endpoints/notes.cr
require "kemal"
require "../tocry"
require "../websocket_handler"
require "./helpers"
require "../services/note_service"
require "../services/websocket_events"
require "uuid"       # For generating unique filenames
require "file_utils" # For creating directories

module ToCry::Endpoints::Notes
  MAX_ATTACHMENT_SIZE = 5_242_880 # 5MB

  # Path-scoped before filter to validate the board name and store it in the context.
  # This filter is specific to note-related paths.
  # Skips existence check for DELETE requests to support idempotent deletion.
  before_all "/api/v1/boards/:board_name/note/*" do |env|
    ToCry::Endpoints::Helpers.validate_board_access(env)
  end

  # API Endpoint to create a new note in a specific lane
  # Expects the board name and lane name in the URL/path, e.g.:
  # POST /boards/My%20Board/note
  # Expects a JSON body like:
  # { "note": { "title": "New Task", "content": "Task description", "tags": ["urgent"] }, "lane_name": "Todo" }
  post "/api/v1/boards/:board_name/note" do |env|
    begin
      board_name = env.params.url["board_name"].as(String)
      json_body = ToCry::Endpoints::Helpers.get_json_body(env)
      payload = ToCry::Endpoints::Helpers::NewNotePayload.from_json(json_body)

      user = ToCry.get_current_user_id(env)

      # Validate lane name
      lane_name = payload.lane_name.strip
      if lane_name.empty?
        next ToCry::Endpoints::Helpers.error_response(env, "Lane name cannot be empty.", 400)
      end

      # Validate note title
      note_title = payload.note.title.strip
      if note_title.empty?
        next ToCry::Endpoints::Helpers.error_response(env, "Note title cannot be empty.", 400)
      end

      # Convert priority to string for service
      priority_str = payload.note.priority.try(&.to_s)

      # Use NoteService to create the note
      result = ToCry::Services::NoteService.create_note(
        board_name: board_name,
        lane_name: lane_name,
        title: payload.note.title,
        user_id: user,
        content: payload.note.content,
        tags: payload.note.tags,
        priority: priority_str,
        start_date: payload.note.start_date,
        end_date: payload.note.end_date,
        public: payload.note.public,
        expanded: payload.note.expanded,
        exclude_client_id: ToCry::WebSocketHandler.extract_client_id(env)
      )

      if result.success
        note = result.note
        unless note
          next ToCry::Endpoints::Helpers.error_response(env, "Note operation failed - no note data returned", 500)
        end

        note_response = {
          sepia_id:    note.sepia_id,
          title:       note.title,
          content:     note.content,
          tags:        note.tags,
          expanded:    note.expanded,
          public:      note.public,
          attachments: note.attachments,
          start_date:  note.start_date,
          end_date:    note.end_date,
          priority:    note.priority.to_s,
          generation:  result.generation,
        }

        ToCry::Endpoints::Helpers.created_response(env, {
          success: "Note created successfully.",
          note:    note_response,
        })
      else
        ToCry::Endpoints::Helpers.error_response(env, result.message, 400)
      end
    rescue ex
      ToCry::Log.error(exception: ex) { "Error creating note in board '#{env.params.url["board_name"]}'" }
      ToCry::Endpoints::Helpers.error_response(env, "Failed to create note", 500)
    end
  end

  # API Endpoint to update an existing note
  # Expects the board name and note ID in the URL/path, e.g.:
  # PUT /boards/My%20Board/note/note-uuid
  # Expects a JSON body like:
  # { "note": { "title": "Updated Task", "content": "Updated description" }, "lane_name": "In Progress", "position": 0 }
  put "/api/v1/boards/:board_name/note/:note_id" do |env|
    begin
      board_name = env.params.url["board_name"].as(String)
      note_id = env.params.url["note_id"].as(String)
      json_body = ToCry::Endpoints::Helpers.get_json_body(env)
      payload = ToCry::Endpoints::Helpers::UpdateNotePayload.from_json(json_body)

      user = ToCry.get_current_user_id(env)

      # Validate note title if provided
      if payload.note.title
        note_title = payload.note.title.strip
        if note_title.empty?
          next ToCry::Endpoints::Helpers.error_response(env, "Note title cannot be empty.", 400)
        end
      end

      # Handle lane name validation if specified
      new_lane_name = payload.lane_name
      if new_lane_name
        new_lane_name = new_lane_name.strip
        if new_lane_name.empty?
          next ToCry::Endpoints::Helpers.error_response(env, "Lane name cannot be empty.", 400)
        end
      end

      # Convert priority to string for service
      priority_str = payload.note.priority.try(&.to_s)

      # Use NoteService to update the note
      result = ToCry::Services::NoteService.update_note(
        board_name: board_name,
        note_id: note_id,
        user_id: user,
        title: payload.note.title,
        content: payload.note.content,
        tags: payload.note.tags,
        priority: priority_str,
        start_date: payload.note.start_date,
        end_date: payload.note.end_date,
        public: payload.note.public,
        expanded: payload.note.expanded,
        new_lane_name: new_lane_name,
        position: payload.position.try(&.to_i32),
        exclude_client_id: ToCry::WebSocketHandler.extract_client_id(env)
      )

      if result.success
        note = result.note
        unless note
          next ToCry::Endpoints::Helpers.error_response(env, "Note operation failed - no note data returned", 500)
        end

        note_response = {
          sepia_id:    note.sepia_id,
          title:       note.title,
          content:     note.content,
          tags:        note.tags,
          expanded:    payload.note.expanded, # Use the value from request
          public:      note.public,
          attachments: note.attachments,
          start_date:  note.start_date,
          end_date:    note.end_date,
          priority:    note.priority.to_s,
          generation:  result.generation,
        }

        ToCry::Endpoints::Helpers.success_response(env, {
          success: "Note updated successfully.",
          note:    note_response,
        })
      else
        ToCry::Endpoints::Helpers.error_response(env, result.message, 400)
      end
    rescue ex
      ToCry::Log.error(exception: ex) { "Error updating note '#{note_id}' in board '#{board_name}'" }
      ToCry::Endpoints::Helpers.error_response(env, "Failed to update note", 500)
    end
  end

  # API Endpoint to delete a note (idempotent)
  # Expects the board name and note ID in the URL/path, e.g.:
  # DELETE /boards/My%20Board/note/note-uuid
  # Note: This endpoint is idempotent - deleting an already deleted note will succeed
  delete "/api/v1/boards/:board_name/note/:note_id" do |env|
    begin
      board_name = env.params.url["board_name"].as(String)
      note_id = env.params.url["note_id"].as(String)
      user = ToCry.get_current_user_id(env)

      # Use NoteService to delete the note (now handles all validation and idempotence)
      result = ToCry::Services::NoteService.delete_note(
        board_name: board_name,
        note_id: note_id,
        user_id: user,
        exclude_client_id: ToCry::WebSocketHandler.extract_client_id(env)
      )

      if result.success
        ToCry::Endpoints::Helpers.success_response(env, {
          success: result.message,
        })
      else
        ToCry::Endpoints::Helpers.error_response(env, result.message, 400)
      end
    rescue ex
      ToCry::Log.error(exception: ex) { "Error deleting note '#{note_id}' from board '#{board_name}'" }
      ToCry::Endpoints::Helpers.error_response(env, "Failed to delete note", 500)
    end
  end

  # API Endpoint to add an attachment to a note within a board context
  # Expects the board name and note ID in the URL path, e.g.:
  # POST /boards/My%20Board/note/note-uuid/attach
  # Expects a multipart/form-data request with a file part
  # Requires board access authorization via before_all filter
  post "/api/v1/boards/:board_name/note/:note_id/attach" do |env|
    begin
      board_name = env.params.url["board_name"].as(String)
      note_id = env.params.url["note_id"].as(String)

      # Validate UUID format to prevent injection attacks
      unless ToCry::Endpoints::Helpers.valid_uuid?(note_id)
        next ToCry::Endpoints::Helpers.error_response(env, "Invalid note ID format", 400)
      end

      # Get board from context (validated by before_all filter)
      board = ToCry::Endpoints::Helpers.get_board_from_context(env)

      # Find the note in this board
      found_note_and_lane = board.note(note_id)
      unless found_note_and_lane
        next ToCry::Endpoints::Helpers.not_found_response(env, "Note not found in this board")
      end

      note = found_note_and_lane[0]
      user = ToCry.get_current_user_id(env)

      # Get the first uploaded file from the request
      uploaded_file = env.params.files.values.first?
      if uploaded_file.nil?
        next ToCry::Endpoints::Helpers.error_response(env, "No file uploaded.", 400)
      end

      # Extract file information
      original_filename = uploaded_file.filename.as(String)
      extension = File.extname(original_filename)
      content_type = uploaded_file.headers["Content-Type"]?
      file_size = uploaded_file.tempfile.size.to_i64

      # File size validation (5MB limit for attachments)
      if file_size > MAX_ATTACHMENT_SIZE
        next ToCry::Endpoints::Helpers.error_response(env, "Attachment size exceeds the 5MB limit.", 413)
      end

      # Generate a unique filename with UUID prefix to prevent overwrites
      unique_filename = "#{UUID.random}_#{original_filename}"

      # Ensure the attachments directory exists for this note
      upload_dir = File.join(ToCry.data_directory, "uploads", "attachments", note_id)
      FileUtils.mkdir_p(upload_dir)

      save_path = File.join(upload_dir, unique_filename)
      relative_path = File.join("uploads", "attachments", note_id, unique_filename)

      # Save the file by copying the tempfile to our target location
      File.open(save_path, "w") do |outf|
        IO.copy(uploaded_file.tempfile, outf)
      end

      # Create Upload record for tracking
      upload = ToCry::Upload.new(
        original_filename: original_filename,
        file_extension: extension,
        file_size: file_size,
        upload_type: "attachment",
        uploaded_by: user,
        relative_path: relative_path,
        content_type: content_type,
        note_id: note_id
      )
      upload.save

      # Add filename to note's attachments array if not already there
      unless note.attachments.includes?(unique_filename)
        note.attachments << unique_filename
        note.save
      end

      ToCry::Log.info { "Attachment '#{original_filename}' uploaded to note '#{note_id}' in board '#{board_name}' by user '#{user}'" }

      # Return success response with attachment info
      ToCry::Endpoints::Helpers.created_response(env, {
        success:           true,
        filename:          unique_filename,
        original_filename: original_filename,
        file_size:         file_size,
        note_id:           note_id,
        board_name:        board_name,
        url:               "/attachments/#{note_id}/#{unique_filename}",
      })
    rescue ex
      ToCry::Log.error(exception: ex) { "Error uploading attachment to note '#{note_id}' in board '#{board_name}': #{ex.message}" }
      ToCry::Endpoints::Helpers.error_response(env, "Failed to upload attachment", 500)
    end
  end

  # API Endpoint to delete an attachment from a note within a board context (idempotent)
  # Expects the board name, note ID, and attachment filename in the URL path, e.g.:
  # DELETE /boards/My%20Board/note/note-uuid/attachment-filename
  # Note: This endpoint is idempotent - deleting an already deleted attachment will succeed
  delete "/api/v1/boards/:board_name/note/:note_id/:attachment" do |env|
    begin
      board_name = env.params.url["board_name"].as(String)
      note_id = env.params.url["note_id"].as(String)
      attachment_filename = env.params.url["attachment"].as(String)

      # Validate UUID format to prevent injection attacks
      unless ToCry::Endpoints::Helpers.valid_uuid?(note_id)
        next ToCry::Endpoints::Helpers.error_response(env, "Invalid note ID format", 400)
      end

      # Sanitize attachment filename to prevent directory traversal
      if attachment_filename.includes?("/") || attachment_filename.includes?("..") || attachment_filename.starts_with?(".")
        next ToCry::Endpoints::Helpers.error_response(env, "Invalid attachment filename", 400)
      end

      # Get board from context (validated by before_all filter)
      board = ToCry::Endpoints::Helpers.get_board_from_context(env)

      # If board doesn't exist, attachment is already deleted
      unless board
        ToCry::Log.info { "Attachment '#{attachment_filename}' deletion skipped - board '#{board_name}' doesn't exist" }
        ToCry::Endpoints::Helpers.success_response(env, {success: true, message: "Attachment deleted successfully"})
        next
      end

      # Find the note in this board
      found_note_and_lane = board.note(note_id)
      unless found_note_and_lane
        # Note doesn't exist - attachment already deleted
        ToCry::Log.info { "Attachment '#{attachment_filename}' deletion skipped - note '#{note_id}' doesn't exist in board '#{board_name}'" }
        ToCry::Endpoints::Helpers.success_response(env, {success: true, message: "Attachment deleted successfully"})
        next
      end

      note = found_note_and_lane[0]
      user = ToCry.get_current_user_id(env)

      # Check if the attachment exists in the note's attachments array
      unless note.attachments.includes?(attachment_filename)
        # Attachment doesn't exist - already deleted
        ToCry::Log.info { "Attachment '#{attachment_filename}' already deleted or never existed for note '#{note_id}' in board '#{board_name}'" }
        ToCry::Endpoints::Helpers.success_response(env, {success: true, message: "Attachment deleted successfully"})
        next
      end

      # Remove attachment from note's attachments array
      note.attachments.delete(attachment_filename)
      note.save

      # Delete the physical file from disk
      attachment_path = File.join(ToCry.data_directory, "uploads", "attachments", note_id, attachment_filename)
      if File.exists?(attachment_path)
        File.delete(attachment_path)
        ToCry::Log.info { "Deleted attachment file: '#{attachment_path}'" }
      else
        ToCry::Log.warn { "Attachment file not found for deletion: '#{attachment_path}'" }
      end

      ToCry::Log.info { "Attachment '#{attachment_filename}' deleted from note '#{note_id}' in board '#{board_name}' by user '#{user}'" }

      ToCry::Endpoints::Helpers.success_response(env, {
        success: true,
        message: "Attachment deleted successfully",
      })
    rescue ex
      ToCry::Log.error(exception: ex) { "Error deleting attachment '#{attachment_filename}' from note '#{note_id}' in board '#{board_name}': #{ex.message}" }
      ToCry::Endpoints::Helpers.error_response(env, "Failed to delete attachment", 500)
    end
  end

  # API Endpoint to serve attachment files for authenticated users within board context
  # Expects the board name, note ID, and attachment filename in the URL path, e.g.:
  # GET /boards/My%20Board/note/note-uuid/attachment-filename
  # Requires board access authorization via before_all filter
  get "/api/v1/boards/:board_name/note/:note_id/:attachment" do |env|
    begin
      board_name = env.params.url["board_name"].as(String)
      note_id = env.params.url["note_id"].as(String)
      filename = env.params.url["attachment"].as(String)

      # Validate UUID format to prevent injection attacks
      unless ToCry::Endpoints::Helpers.valid_uuid?(note_id)
        env.response.status_code = 404
        next
      end

      # Sanitize filename to prevent directory traversal
      if filename.includes?("/") || filename.includes?("..") || filename.starts_with?(".")
        env.response.status_code = 404
        next
      end

      # Get board from context (validated by before_all filter)
      board = ToCry::Endpoints::Helpers.get_board_from_context(env)

      # Find the note in this board
      found_note_and_lane = board.note(note_id)
      unless found_note_and_lane
        env.response.status_code = 404
        next
      end

      note = found_note_and_lane[0]

      # Check if the attachment exists in the note's attachments array
      unless note.attachments.includes?(filename)
        env.response.status_code = 404
        next
      end

      # Construct the file path
      attachment_path = File.join(ToCry.data_directory, "uploads", "attachments", note_id, filename)

      # Check if the file exists
      unless File.exists?(attachment_path)
        ToCry::Log.warn { "Attachment file not found: '#{attachment_path}'" }
        env.response.status_code = 404
        next
      end

      # Extract original filename from UUID-prefixed filename
      original_filename = filename
      if filename.includes?("_")
        parts = filename.split("_", 2)
        if parts.size == 2 && ToCry::Endpoints::Helpers.valid_uuid?(parts[0])
          original_filename = parts[1]
        end
      end

      # Set appropriate headers for file download
      env.response.content_type = "application/octet-stream"
      env.response.headers["Content-Disposition"] = "attachment; filename=\"#{original_filename}\""
      env.response.headers["Cache-Control"] = "private, max-age=3600"

      # Serve the file
      File.open(attachment_path, "r") do |file|
        IO.copy(file, env.response.output)
      end

      user = ToCry.get_current_user_id(env)
      ToCry::Log.info { "Attachment '#{filename}' served for note '#{note_id}' in board '#{board_name}' to user '#{user}'" }
    rescue ex
      ToCry::Log.error(exception: ex) { "Error serving attachment '#{filename}' for note '#{note_id}' in board '#{board_name}': #{ex.message}" }
      env.response.status_code = 500
    end
  end

  # Public attachment endpoint - only works for public notes
  # Expects the note ID and attachment filename in the URL path, e.g.:
  # GET /attachments/note-uuid/attachment-filename
  # This endpoint is public for notes that are marked as public ONLY
  get "/api/v1/attachments/:note_id/:filename" do |env|
    begin
      note_id = env.params.url["note_id"].as(String)
      filename = env.params.url["filename"].as(String)

      # Validate UUID format to prevent injection attacks
      unless ToCry::Endpoints::Helpers.valid_uuid?(note_id)
        env.response.status_code = 404
        next
      end

      # Sanitize filename to prevent directory traversal
      if filename.includes?("/") || filename.includes?("..") || filename.starts_with?(".")
        env.response.status_code = 404
        next
      end

      # Load the note to verify it exists and check public status
      note = ToCry::Note.load(note_id)
      unless note
        env.response.status_code = 404
        next
      end

      # IMPORTANT: Only allow access to PUBLIC notes
      unless note.public
        env.response.status_code = 404
        next
      end

      # Check if the attachment exists in the note's attachments array
      unless note.attachments.includes?(filename)
        env.response.status_code = 404
        next
      end

      # Construct the file path
      attachment_path = File.join(ToCry.data_directory, "uploads", "attachments", note_id, filename)

      # Check if the file exists
      unless File.exists?(attachment_path)
        ToCry::Log.warn { "Attachment file not found: '#{attachment_path}'" }
        env.response.status_code = 404
        next
      end

      # Extract original filename from UUID-prefixed filename
      original_filename = filename
      if filename.includes?("_")
        parts = filename.split("_", 2)
        if parts.size == 2 && ToCry::Endpoints::Helpers.valid_uuid?(parts[0])
          original_filename = parts[1]
        end
      end

      # Set appropriate headers for file download
      env.response.content_type = "application/octet-stream"
      env.response.headers["Content-Disposition"] = "attachment; filename=\"#{original_filename}\""
      env.response.headers["Cache-Control"] = "public, max-age=3600"

      # Serve the file
      File.open(attachment_path, "r") do |file|
        IO.copy(file, env.response.output)
      end

      ToCry::Log.info { "Public attachment '#{filename}' served for public note '#{note_id}'" }
    rescue ex
      ToCry::Log.error(exception: ex) { "Error serving public attachment '#{filename}' for note '#{note_id}': #{ex.message}" }
      env.response.status_code = 500
    end
  end

  # Public note sharing endpoint
  # Allows viewing of public notes without authentication
  # Expects the note ID in the URL path, e.g.:
  # GET /n/note-uuid
  get "/n/:note_id" do |env|
    note_id = env.params.url["note_id"].as(String)

    begin
      # Validate UUID format to prevent injection attacks
      unless ToCry::Endpoints::Helpers.valid_uuid?(note_id)
        env.response.status_code = 404
        next render "templates/404.ecr"
      end

      # Load the note directly by UUID
      note = ToCry::Note.load(note_id)

      unless note
        env.response.status_code = 404
        next render "templates/404.ecr"
      end

      # Only allow access to public notes
      unless note.public
        env.response.status_code = 404
        next render "templates/404.ecr"
      end

      # Render the existing note template
      render "templates/note.ecr"
    rescue ex
      ToCry::Log.error(exception: ex) { "Error loading public note '#{note_id}': #{ex.message}" }
      env.response.status_code = 500
      render "templates/404.ecr"
    end
  end

  # API Endpoint to get version history for a note
  # Expects the board name and note ID in the URL/path, e.g.:
  # GET /boards/My%20Board/note/note-uuid/versions
  get "/api/v1/boards/:board_name/note/:note_id/versions" do |env|
    begin
      board_name = env.params.url["board_name"].as(String)
      note_id = env.params.url["note_id"].as(String)
      user = ToCry.get_current_user_id(env)

      # Validate board access
      board = ToCry.board_manager.get(board_name, user)
      unless board
        next ToCry::Endpoints::Helpers.not_found_response(env, "Board not found")
      end

      # Find the note
      found_note_and_lane = board.note(note_id)
      unless found_note_and_lane
        next ToCry::Endpoints::Helpers.not_found_response(env, "Note not found")
      end

      current_note, _lane = found_note_and_lane

      # Get base ID for versions (strip generation if present)
      base_id = current_note.sepia_id.includes?(".") ? current_note.sepia_id.split(".", 2)[0] : current_note.sepia_id

      # Get all versions if generations are enabled
      if ToCry.generations_enabled?
        versions = ToCry::Note.versions(base_id)

        versions_data = versions.map do |version_note|
          {
            sepia_id:    version_note.sepia_id,
            generation:  version_note.generation,
            title:       version_note.title,
            content:     version_note.content,
            tags:        version_note.tags,
            expanded:    version_note.expanded,
            public:      version_note.public,
            attachments: version_note.attachments,
            start_date:  version_note.start_date,
            end_date:    version_note.end_date,
            priority:    version_note.priority.try(&.to_s),
          }
        end

        ToCry::Endpoints::Helpers.success_response(env, {
          success:  true,
          versions: versions_data,
          total:    versions_data.size,
          base_id:  base_id,
        })
      else
        ToCry::Endpoints::Helpers.error_response(env, "Generations feature not enabled", 503)
      end
    rescue ex
      ToCry::Log.error(exception: ex) { "Error getting version history for note '#{env.params.url["note_id"]}' in board '#{env.params.url["board_name"]}': #{ex.message}" }
      ToCry::Endpoints::Helpers.error_response(env, "Failed to get version history", 500)
    end
  end

  # API Endpoint to get a specific version of a note
  # Expects the board name, note ID, and generation in the URL/path, e.g.:
  # GET /boards/My%20Board/note/note-uuid/versions/3
  get "/api/v1/boards/:board_name/note/:note_id/versions/:generation" do |env|
    begin
      board_name = env.params.url["board_name"].as(String)
      note_id = env.params.url["note_id"].as(String)
      generation_str = env.params.url["generation"].as(String)
      user = ToCry.get_current_user_id(env)

      # Validate generation parameter
      unless generation_str.matches?(/^\d+$/)
        next ToCry::Endpoints::Helpers.error_response(env, "Invalid generation format", 400)
      end

      # Validate board access
      board = ToCry.board_manager.get(board_name, user)
      unless board
        next ToCry::Endpoints::Helpers.not_found_response(env, "Board not found")
      end

      # Find the current note to get base ID
      found_note_and_lane = board.note(note_id)
      unless found_note_and_lane
        next ToCry::Endpoints::Helpers.not_found_response(env, "Note not found")
      end

      current_note, _lane = found_note_and_lane
      base_id = current_note.sepia_id.includes?(".") ? current_note.sepia_id.split(".", 2)[0] : current_note.sepia_id

      # Get specific version if generations are enabled
      if ToCry.generations_enabled?
        version_id = "#{base_id}.#{generation_str}"

        begin
          version_note = ToCry::Note.load(version_id)
        rescue
          next ToCry::Endpoints::Helpers.not_found_response(env, "Version not found")
        end

        version_data = {
          sepia_id:    version_note.sepia_id,
          generation:  version_note.generation,
          title:       version_note.title,
          content:     version_note.content,
          tags:        version_note.tags,
          expanded:    version_note.expanded,
          public:      version_note.public,
          attachments: version_note.attachments,
          start_date:  version_note.start_date,
          end_date:    version_note.end_date,
          priority:    version_note.priority.try(&.to_s),
        }

        ToCry::Endpoints::Helpers.success_response(env, {
          success: true,
          version: version_data,
        })
      else
        ToCry::Endpoints::Helpers.error_response(env, "Generations feature not enabled", 503)
      end
    rescue ex
      ToCry::Log.error(exception: ex) { "Error getting version '#{env.params.url["generation"]}' for note '#{env.params.url["note_id"]}' in board '#{env.params.url["board_name"]}': #{ex.message}" }
      ToCry::Endpoints::Helpers.error_response(env, "Failed to get version", 500)
    end
  end

  # API Endpoint to revert a note to a specific version
  # Expects the board name, note ID, and generation in the URL/path, e.g.:
  # POST /boards/My%20Board/note/note-uuid/revert/3
  post "/api/v1/boards/:board_name/note/:note_id/revert/:generation" do |env|
    begin
      board_name = env.params.url["board_name"].as(String)
      note_id = env.params.url["note_id"].as(String)
      generation_str = env.params.url["generation"].as(String)
      user = ToCry.get_current_user_id(env)

      # Validate generation parameter
      unless generation_str.matches?(/^\d+$/)
        next ToCry::Endpoints::Helpers.error_response(env, "Invalid generation format", 400)
      end

      # Validate board access
      board = ToCry.board_manager.get(board_name, user)
      unless board
        next ToCry::Endpoints::Helpers.not_found_response(env, "Board not found")
      end

      # Find the current note
      found_note_and_lane = board.note(note_id)
      unless found_note_and_lane
        next ToCry::Endpoints::Helpers.not_found_response(env, "Note not found")
      end

      current_note, _lane = found_note_and_lane
      base_id = current_note.sepia_id.includes?(".") ? current_note.sepia_id.split(".", 2)[0] : current_note.sepia_id

      # Get the target version if generations are enabled
      if ToCry.generations_enabled?
        version_id = "#{base_id}.#{generation_str}"

        begin
          version_note = ToCry::Note.load(version_id)
        rescue
          next ToCry::Endpoints::Helpers.not_found_response(env, "Version not found")
        end

        # Create a new version with the old content (revert)
        current_note.title = version_note.title
        current_note.content = version_note.content
        current_note.tags = version_note.tags
        current_note.expanded = version_note.expanded
        current_note.public = version_note.public
        current_note.attachments = version_note.attachments
        current_note.start_date = version_note.start_date
        current_note.end_date = version_note.end_date
        current_note.priority = version_note.priority

        # Save as new generation
        reverted_note = current_note.save_with_generation

        if reverted_note
          # Broadcast WebSocket notification
          event = ToCry::Services::NoteUpdatedEvent.new(current_note, board_name, _lane.name, user, ToCry::WebSocketHandler.extract_client_id(env))
          ToCry::Services::WebSocketNotifier.broadcast(event)

          ToCry::Log.info { "Note '#{current_note.title}' reverted to generation #{generation_str} (now generation #{reverted_note.generation}) in board '#{board_name}' by user '#{user}'" }

          response_data = {
            sepia_id:    current_note.sepia_id,
            title:       current_note.title,
            content:     current_note.content,
            tags:        current_note.tags,
            expanded:    current_note.expanded,
            public:      current_note.public,
            attachments: current_note.attachments,
            start_date:  current_note.start_date,
            end_date:    current_note.end_date,
            priority:    current_note.priority.try(&.to_s),
            generation:  reverted_note.generation,
          }

          ToCry::Endpoints::Helpers.success_response(env, {
            success: "Note reverted successfully",
            note:    response_data,
          })
        else
          ToCry::Endpoints::Helpers.error_response(env, "Failed to create reverted version", 500)
        end
      else
        ToCry::Endpoints::Helpers.error_response(env, "Generations feature not enabled", 503)
      end
    rescue ex
      ToCry::Log.error(exception: ex) { "Error reverting note '#{env.params.url["note_id"]}' to generation '#{env.params.url["generation"]}' in board '#{env.params.url["board_name"]}': #{ex.message}" }
      ToCry::Endpoints::Helpers.error_response(env, "Failed to revert note", 500)
    end
  end
end
