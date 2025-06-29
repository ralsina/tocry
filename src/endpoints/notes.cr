# /home/ralsina/code/tocry/src/endpoints/notes.cr
require "kemal"
require "../tocry"
require "./helpers"

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
      env.response.status_code = 404 # Not Found
      env.response.content_type = "application/json"
      next {error: "Lane with name '#{target_lane_name}' not found."}.to_json
    end

    # Create a new Note instance and add it to the lane. The Note.initialize will generate a new ID.
    new_note = target_lane.note_add(title: note_data.title, tags: note_data.tags, content: note_data.content)

    # Save the board to persist the new note (this will save the note file and create symlink for this board)
    board.save

    env.response.status_code = 201 # Created
    env.response.content_type = "application/json"
    new_note.to_json # Return the newly created note with its generated ID
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
      env.response.status_code = 404
      env.response.content_type = "application/json"
      next {error: "Note with ID '#{note_id}' not found on the board."}.to_json
    end
    existing_note, current_lane = find_result

    # Update note content if it has changed
    note_data_changed = (existing_note.title != new_note_data.title) ||
                        (existing_note.tags != new_note_data.tags) ||
                        (existing_note.content != new_note_data.content) ||
                        (existing_note.expanded != new_note_data.expanded)

    if note_data_changed
      existing_note.title = new_note_data.title
      existing_note.tags = new_note_data.tags
      existing_note.content = new_note_data.content
      existing_note.expanded = new_note_data.expanded
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
        env.response.status_code = 404
        env.response.content_type = "application/json"
        next {error: "Target lane '#{target_lane_name}' not found."}.to_json
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

    env.response.status_code = 200
    env.response.content_type = "application/json"
    existing_note.to_json
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

    env.response.status_code = 200
    env.response.content_type = "application/json"
    {success: "Note '#{note_id}' deleted (or did not exist)."}.to_json
  end
end
