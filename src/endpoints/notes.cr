# /home/ralsina/code/tocry/src/endpoints/notes.cr
require "kemal"
require "../tocry"
require "./helpers"
require "uuid"
require "file_utils"

module ToCry::Endpoints::Notes
  # API Endpoint to add a new note to a lane
  # Expects a JSON body like:
  # {
  #   "note": {
  #     "title": "My new task",
  #     "tags": ["todo", "urgent"],
  #     "content": "Details of the task"
  #   },
  #   "lane_name": "Todo"
  # }
  post "/boards/:board_name/note" do |env|
    board = ToCry::Endpoints::Helpers.get_board_from_context(env)
    json_body = ToCry::Endpoints::Helpers.get_json_body(env)
    payload = ToCry::Endpoints::Helpers::NewNotePayload.from_json(json_body)

    target_lane_name = payload.lane_name
    note_data = payload.note

    # Find the target lane
    target_lane = board.lane(target_lane_name)

    unless target_lane
      next ToCry::Endpoints::Helpers.not_found_response(env, "Lane with name '#{target_lane_name}' not found.")
    end

    # Create a new Note instance and add it to the lane. The Note.initialize will generate a new ID.
    new_note = target_lane.note_add(title: note_data.title, tags: note_data.tags, content: note_data.content, public: note_data.public)

    # Save the board to persist the new note (this will save the note file and create symlink for this board)
    board.save

    ToCry::Endpoints::Helpers.created_response(env, new_note)
  end

  # API Endpoint to update a note's content and/or move it.
  # Expects the note ID in the URL path, e.g.:
  # PUT /note/some-uuid-123
  # Expects a JSON body like:
  # {
  #   "note": { "title": "Updated Title", "tags": ["new"], "content": "Updated content." },
  #   "lane_name": "In Progress", // Optional: to move the note
  #   "position": 0             // Optional: new position in lane
  # }
  put "/boards/:board_name/note/:id" do |env|
    note_id = env.params.url["id"].as(String)
    board = ToCry::Endpoints::Helpers.get_board_from_context(env)
    json_body = ToCry::Endpoints::Helpers.get_json_body(env)
    payload = ToCry::Endpoints::Helpers::UpdateNotePayload.from_json(json_body)
    new_note_data = payload.note

    # Find the note and its current lane on the board
    find_result = board.note(note_id)
    unless find_result
      next ToCry::Endpoints::Helpers.not_found_response(env, "Note with ID '#{note_id}' not found on the board.")
    end
    existing_note, current_lane = find_result

    # Update note content if it has changed
    note_data_changed = (existing_note.title != new_note_data.title) ||
                        (existing_note.tags != new_note_data.tags) ||
                        (existing_note.content != new_note_data.content) ||
                        (existing_note.expanded != new_note_data.expanded) ||
                        (existing_note.public != new_note_data.public)

    if note_data_changed
      existing_note.title = new_note_data.title
      existing_note.tags = new_note_data.tags
      existing_note.content = new_note_data.content
      existing_note.expanded = new_note_data.expanded
      existing_note.public = new_note_data.public
      existing_note.save
      ToCry::Log.info { "Note '#{existing_note.title}' (ID: #{note_id}) data updated for board '#{board.name}'." }
    end

    # Handle moving the note if lane_name or position is provided
    structure_changed = false
    target_lane_name = payload.lane_name
    new_position = payload.position

    # Case 1: Moving to a different lane
    if target_lane_name && target_lane_name != current_lane.name
      target_lane = board.lane(target_lane_name)
      unless target_lane
        next ToCry::Endpoints::Helpers.not_found_response(env, "Target lane '#{target_lane_name}' not found.")
      end

      current_lane.notes.delete(existing_note)
      insert_pos = (new_position || 0).to_i.clamp(0, target_lane.notes.size)
      target_lane.notes.insert(insert_pos, existing_note)
      structure_changed = true
      ToCry::Log.info { "Note '#{existing_note.title}' moved from '#{current_lane.name}' to '#{target_lane.name}' at position #{insert_pos}." }

      # Case 2: Re-ordering within the same lane
    elsif new_position
      current_position = current_lane.notes.index(existing_note)
      if current_position && current_position != new_position
        current_lane.notes.delete(existing_note)
        insert_pos = new_position.to_i.clamp(0, current_lane.notes.size)
        current_lane.notes.insert(insert_pos, existing_note)
        structure_changed = true
        ToCry::Log.info { "Note '#{existing_note.title}' moved within lane '#{current_lane.name}' to position #{insert_pos}." }
      end
    end

    # Save the entire board if the structure was modified
    board.save if structure_changed

    ToCry::Endpoints::Helpers.success_response(env, existing_note)
  end

  # API Endpoint to delete a note by its ID
  # Expects the note ID in the URL path, e.g.:
  # DELETE /note/some-uuid-123
  delete "/boards/:board_name/note/:id" do |env|
    note_id = env.params.url["id"].as(String)
    board = ToCry::Endpoints::Helpers.get_board_from_context(env)

    # Find the note on the board to get a handle on the object
    find_result = board.note(note_id)

    if find_result
      note_to_delete, _ = find_result
      note_to_delete.delete(board) # Pass the board object to the note's delete method
    end

    ToCry::Endpoints::Helpers.success_response(env, {success: "Note '#{note_id}' deleted (or did not exist)."})
  end

  get "/n/:id" do |env|
    note_id = env.params.url["id"].as(String)
    note = ToCry::Note.load(note_id)

    if note.public
      render "templates/note.ecr"
    else
      env.response.status_code = 404
      ""
    end
  end

  post "/n/:note_id/attach" do |env|
    note_id = env.params.url["note_id"].as(String)
    user = ToCry.get_current_user_id(env)

    # Find the note and its containing board, only among those accessible to the user
    found_result = ToCry::Endpoints::Helpers.find_note_for_user(note_id, user)

    unless found_result
      next ToCry::Endpoints::Helpers.not_found_response(env, "Note with ID '#{note_id}' not found or not accessible.")
    end
    existing_note, _, containing_board = found_result

    # At this point, containing_board is guaranteed to be non-nil and accessible to the user
    # No further access check is needed here as it was done by BoardManager.list(user)

    uploaded_file = env.params.files.values.first?

    if uploaded_file.nil?
      next ToCry::Endpoints::Helpers.error_response(env, "No file uploaded.")
    end

    # Create a directory for attachments specific to this note
    attachments_dir = File.join(ToCry.data_directory, "uploads", "attachments", note_id)
    FileUtils.mkdir_p(attachments_dir)

    # Generate a unique filename for the uploaded file
    original_filename = uploaded_file.filename.as(String)
    base_filename = File.basename(original_filename, File.extname(original_filename))
    extension = File.extname(original_filename)
    sanitized_base_filename = ToCry::Endpoints::Helpers.sanitize_filename(base_filename)
    unique_filename = "#{UUID.random}_#{sanitized_base_filename}#{extension}"
    save_path = File.join(attachments_dir, unique_filename)

    # Save the file
    File.open(save_path, "w") do |outf|
      IO.copy(uploaded_file.tempfile, outf)
    end

    # Update the note's attachments field
    existing_note.add_attachment(unique_filename)
    existing_note.save

    ToCry::Endpoints::Helpers.success_response(env, {success: "File '#{original_filename}' attached to note '#{note_id}'.", filename: unique_filename})
  end

  delete "/n/:note_uuid/:attachment_uuid" do |env|
    note_uuid = env.params.url["note_uuid"].as(String)
    attachment_uuid = env.params.url["attachment_uuid"].as(String)
    user = ToCry.get_current_user_id(env)

    # Find the note and its containing board, only among those accessible to the user
    found_result = ToCry::Endpoints::Helpers.find_note_for_user(note_uuid, user)

    unless found_result
      next ToCry::Endpoints::Helpers.not_found_response(env, "Note with ID '#{note_uuid}' not found or not accessible.")
    end
    existing_note, _, containing_board = found_result

    # At this point, containing_board is guaranteed to be non-nil and accessible to the user
    # No further access check is needed here as it was done by BoardManager.list(user)

    # Remove the attachment from the note's attachments list
    existing_note.remove_attachment(attachment_uuid)

    # Delete the actual attachment file from the filesystem
    attachment_file_path = File.join(ToCry.data_directory, "uploads", "attachments", note_uuid, attachment_uuid)
    if File.exists?(attachment_file_path)
      FileUtils.rm(attachment_file_path)
      ToCry::Log.info { "Deleted attachment file: '#{attachment_file_path}'" }
    else
      ToCry::Log.warn { "Attachment file not found on disk: '#{attachment_file_path}'. Removing from note's attachments list anyway." }
    end

    # Save the updated note
    existing_note.save

    ToCry::Endpoints::Helpers.success_response(env, {success: "Attachment '#{attachment_uuid}' removed from note '#{note_uuid}'."})
  end
end
