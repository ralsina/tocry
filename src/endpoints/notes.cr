# /home/ralsina/code/tocry/src/endpoints/notes.cr
require "kemal"
require "../tocry"
require "../websocket_handler"
require "./helpers"
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
      board = ToCry.board_manager.get(board_name, user)

      unless board
        next ToCry::Endpoints::Helpers.error_response(env, "Board not found", 404)
      end

      # Validate lane name
      lane_name = payload.lane_name.strip
      if lane_name.empty?
        next ToCry::Endpoints::Helpers.error_response(env, "Lane name cannot be empty.", 400)
      end

      # Find the lane
      target_lane = board.lanes.find { |lane| lane.name == lane_name }
      unless target_lane
        next ToCry::Endpoints::Helpers.error_response(env, "Lane '#{lane_name}' not found.", 404)
      end

      # Validate note title
      note_title = payload.note.title.strip
      if note_title.empty?
        next ToCry::Endpoints::Helpers.error_response(env, "Note title cannot be empty.", 400)
      end

      # Create new note with the provided data
      new_note = ToCry::Note.new(
        payload.note.title,
        payload.note.tags,
        payload.note.content,
        payload.note.expanded,
        payload.note.public,
        payload.note.attachments,
        payload.note.start_date,
        payload.note.end_date,
        payload.note.priority
      )

      # Add note to the lane (at the end by default)
      target_lane.notes << new_note
      board.save

      ToCry::Log.info { "Note '#{new_note.title}' created in lane '#{lane_name}' on board '#{board_name}' by user '#{user}'" }

      # Broadcast note creation to WebSocket clients
      note_data = JSON::Any.new({
        "sepia_id"    => JSON::Any.new(new_note.sepia_id),
        "title"       => JSON::Any.new(new_note.title),
        "content"     => JSON::Any.new(new_note.content),
        "lane_name"   => JSON::Any.new(lane_name),
        "tags"        => JSON::Any.new(new_note.tags.map { |tag| JSON::Any.new(tag) }),
        "expanded"    => JSON::Any.new(new_note.expanded),
        "public"      => JSON::Any.new(new_note.public),
        "attachments" => JSON::Any.new(new_note.attachments.map { |att| JSON::Any.new(att) }),
        "start_date"  => JSON::Any.new(new_note.start_date || ""),
        "end_date"    => JSON::Any.new(new_note.end_date || ""),
        "priority"    => JSON::Any.new(new_note.priority.to_s),
      })

      # Extract client ID for echo prevention
      client_id = ToCry::WebSocketHandler.extract_client_id(env)
      ToCry::WebSocketHandler.broadcast_to_board(board_name, ToCry::WebSocketHandler::MessageType::NOTE_CREATED, note_data, client_id)

      # Return the created note with its generated ID
      note_response = {
        sepia_id:    new_note.sepia_id,
        title:       new_note.title,
        content:     new_note.content,
        tags:        new_note.tags,
        expanded:    new_note.expanded,
        public:      new_note.public,
        attachments: new_note.attachments,
        start_date:  new_note.start_date,
        end_date:    new_note.end_date,
        priority:    new_note.priority.to_s,
      }

      ToCry::Endpoints::Helpers.created_response(env, {
        success: "Note created successfully.",
        note:    note_response,
      })
    rescue ex
      ToCry::Log.error(exception: ex) { "Error creating note in board '#{board_name}'" }
      raise ex
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
      board = ToCry.board_manager.get(board_name, user)

      unless board
        next ToCry::Endpoints::Helpers.error_response(env, "Board not found", 404)
      end

      # Find the note across all lanes
      found_note_and_lane = board.note(note_id)
      unless found_note_and_lane
        next ToCry::Endpoints::Helpers.not_found_response(env, "Note not found")
      end

      current_note, current_lane = found_note_and_lane

      # Validate note title if provided
      if payload.note.title
        note_title = payload.note.title.strip
        if note_title.empty?
          next ToCry::Endpoints::Helpers.error_response(env, "Note title cannot be empty.", 400)
        end
      end

      # Update note properties
      current_note.title = payload.note.title
      current_note.tags = payload.note.tags
      current_note.content = payload.note.content
      current_note.expanded = payload.note.expanded
      current_note.public = payload.note.public
      current_note.attachments = payload.note.attachments
      current_note.start_date = payload.note.start_date
      current_note.end_date = payload.note.end_date
      current_note.priority = payload.note.priority

      # Handle lane change if specified
      if new_lane_name = payload.lane_name
        new_lane_name = new_lane_name.strip
        if new_lane_name.empty?
          next ToCry::Endpoints::Helpers.error_response(env, "Lane name cannot be empty.", 400)
        end

        # Only move if lane is different
        if new_lane_name != current_lane.name
          # Find the target lane
          target_lane = board.lanes.find { |lane| lane.name == new_lane_name }
          unless target_lane
            next ToCry::Endpoints::Helpers.error_response(env, "Target lane '#{new_lane_name}' not found.", 404)
          end

          # Remove note from current lane
          current_lane.notes.delete(current_note)

          # Add note to target lane
          if target_position = payload.position
            # Insert at specific position
            if target_position >= target_lane.notes.size
              target_lane.notes << current_note
            else
              target_lane.notes.insert(target_position, current_note)
            end
          else
            # Add to end by default
            target_lane.notes << current_note
          end
        else
          # Same lane, handle position change if specified
          if target_position = payload.position
            # Remove from current position
            current_lane.notes.delete(current_note)
            # Insert at new position
            if target_position >= current_lane.notes.size
              current_lane.notes << current_note
            else
              current_lane.notes.insert(target_position, current_note)
            end
          end
        end
      end

      board.save

      ToCry::Log.info { "Note '#{current_note.title}' updated in board '#{board_name}' by user '#{user}'" }

      # Broadcast note update to WebSocket clients
      note_data = JSON::Any.new({
        "sepia_id"    => JSON::Any.new(current_note.sepia_id),
        "title"       => JSON::Any.new(current_note.title),
        "content"     => JSON::Any.new(current_note.content),
        "lane_name"   => JSON::Any.new(payload.lane_name || current_lane.name),
        "tags"        => JSON::Any.new(current_note.tags.map { |tag| JSON::Any.new(tag) }),
        "expanded"    => JSON::Any.new(current_note.expanded),
        "public"      => JSON::Any.new(current_note.public),
        "attachments" => JSON::Any.new(current_note.attachments.map { |att| JSON::Any.new(att) }),
        "start_date"  => JSON::Any.new(current_note.start_date || ""),
        "end_date"    => JSON::Any.new(current_note.end_date || ""),
        "priority"    => JSON::Any.new(current_note.priority.to_s),
        "position"    => JSON::Any.new(payload.position || 0),
      })

      # Extract client ID for echo prevention
      client_id = ToCry::WebSocketHandler.extract_client_id(env)
      ToCry::WebSocketHandler.broadcast_to_board(board_name, ToCry::WebSocketHandler::MessageType::NOTE_UPDATED, note_data, client_id)

      # Return the updated note
      note_response = {
        sepia_id:    current_note.sepia_id,
        title:       current_note.title,
        content:     current_note.content,
        tags:        current_note.tags,
        expanded:    current_note.expanded,
        public:      current_note.public,
        attachments: current_note.attachments,
        start_date:  current_note.start_date,
        end_date:    current_note.end_date,
        priority:    current_note.priority.to_s,
      }

      ToCry::Endpoints::Helpers.success_response(env, {
        success: "Note updated successfully.",
        note:    note_response,
      })
    rescue ex
      ToCry::Log.error(exception: ex) { "Error updating note '#{note_id}' in board '#{board_name}'" }
      raise ex
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
      board = ToCry.board_manager.get(board_name, user)

      # If board doesn't exist, the note is already deleted
      unless board
        ToCry::Log.info { "Note '#{note_id}' deletion skipped - board '#{board_name}' doesn't exist for user '#{user}'" }
        ToCry::Endpoints::Helpers.success_response(env, {success: "Note deleted successfully."})
        next
      end

      # Find the note across all lanes
      found_note_and_lane = board.note(note_id)
      unless found_note_and_lane
        # Note doesn't exist - already deleted
        ToCry::Log.info { "Note '#{note_id}' already deleted or never existed in board '#{board_name}' by user '#{user}'" }
        ToCry::Endpoints::Helpers.success_response(env, {success: "Note deleted successfully."})
        next
      end

      note_to_delete, lane = found_note_and_lane

      # Remove the note from its lane
      lane.notes.delete(note_to_delete)
      board.save

      ToCry::Log.info { "Note '#{note_to_delete.title}' deleted from board '#{board_name}' by user '#{user}'" }

      # Broadcast note deletion to WebSocket clients
      note_data = JSON::Any.new({
        "sepia_id"  => JSON::Any.new(note_id),
        "lane_name" => JSON::Any.new(lane.name),
      })

      # Extract client ID for echo prevention
      client_id = ToCry::WebSocketHandler.extract_client_id(env)
      ToCry::WebSocketHandler.broadcast_to_board(board_name, ToCry::WebSocketHandler::MessageType::NOTE_DELETED, note_data, client_id)

      ToCry::Endpoints::Helpers.success_response(env, {
        success: "Note deleted successfully.",
      })
    rescue ex
      ToCry::Log.error(exception: ex) { "Error deleting note '#{note_id}' from board '#{board_name}'" }
      raise ex
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
end
