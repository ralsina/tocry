require "kemal"
require "./tocry"    # To access ToCry::BOARD and other definitions
require "uuid"       # For generating unique filenames
require "file_utils" # For creating directories

# API Endpoint to get all lanes
get "/lanes" do |env|
  env.response.content_type = "application/json"
  ToCry::BOARD.lanes.to_json
end

# Helper struct for parsing the POST /lane request payload
struct NewLanePayload
  include JSON::Serializable
  property name : String
end

# Helper struct for parsing the PUT /lane/:name request payload
struct UpdateLanePayload
  include JSON::Serializable
  property lane : ToCry::Lane # The updated lane data (including potentially new name)
  property position : UInt64  # The desired 0-based index in the board's lanes array
end

# Helper struct for parsing the PUT /note/:id request payload
struct UpdateNotePayload
  include JSON::Serializable
  property note : ToCry::Note
  property lane_name : String?
  property position : UInt64?
end

# Helper struct for parsing the POST /note request payload
struct NewNotePayload
  include JSON::Serializable
  property note : ToCry::Note # The note data (id will be ignored/overwritten as a new one is generated)
  property lane_name : String
end

# API Endpoint to add a new lane
# Expects a JSON body with a lane name, e.g.:
# { "name": "New Lane Name" }
post "/lane" do |env|
  begin
    body = env.request.body
    if body.nil?
      env.response.status_code = 400
      env.response.content_type = "application/json"
      next {error: "Request body is missing."}.to_json
    end
    json_body = body.gets_to_end
    payload = NewLanePayload.from_json(json_body)

    requested_name = payload.name
    final_name = requested_name
    counter = 1

    # Deduplicate name if a lane with the same name already exists
    while ToCry::BOARD.lanes.any? { |lane| lane.name == final_name }
      final_name = "#{requested_name} (#{counter})"
      counter += 1
    end

    new_lane = ToCry::Lane.new(name: final_name) # Creates a lane with no notes, using the (potentially) deduplicated name
    ToCry::BOARD.lanes << new_lane
    if final_name != requested_name
      ToCry::Log.info { "Lane '#{requested_name}' requested, added as '#{final_name}' to board via POST /lane due to name collision." }
    else
      ToCry::Log.info { "Lane '#{new_lane.name}' added to board via POST /lane." }
    end
    ToCry::BOARD.save

    env.response.status_code = 201 # Created
    env.response.content_type = "application/json"
    new_lane.to_json
  rescue ex : JSON::ParseException
    env.response.status_code = 400 # Bad Request
    env.response.content_type = "application/json"
    {error: "Invalid JSON format: #{ex.message}"}.to_json
  rescue ex
    env.response.status_code = 500 # Internal Server Error
    ToCry::Log.error(exception: ex) { "Error processing POST /lane: #{ex.message}" }
    env.response.content_type = "application/json"
    {error: "An unexpected error occurred."}.to_json
  end
end

# API Endpoint to update a lane's name and/or position
# Expects the current lane name in the URL path, e.g.:
# PUT /lane/Old%20Lane%20Name
# Expects a JSON body like:
# { "lane": { "name": "New Lane Name", "notes": [...] }, "position": 1 }
# Note: This implementation primarily uses the 'name' and 'position' from the payload.
# Updating notes via this endpoint is not implemented here.
put "/lane/:name" do |env|
  begin
    current_lane_name = env.params.url["name"].as(String)
    body = env.request.body
    if body.nil?
      env.response.status_code = 400
      env.response.content_type = "application/json"
      next {error: "Request body is missing."}.to_json
    end
    json_body = body.gets_to_end

    payload = UpdateLanePayload.from_json(json_body)
    new_lane_data = payload.lane
    new_position = payload.position

    # Find the existing lane by its current name
    existing_lane = ToCry::BOARD.lane(current_lane_name)

    unless existing_lane
      env.response.status_code = 404 # Not Found
      env.response.content_type = "application/json"
      next {error: "Lane with name '#{current_lane_name}' not found."}.to_json
    end

    # Update the lane's name if it has changed
    existing_lane.name = new_lane_data.name

    # Move the lane to the new position
    # Ensure the new position is within valid bounds
    actual_new_position = new_position.clamp(0, ToCry::BOARD.lanes.size - 1)
    ToCry::BOARD.lanes.delete(existing_lane)
    ToCry::BOARD.lanes.insert(actual_new_position, existing_lane)

    ToCry::BOARD.save # Save the board to persist changes (renaming and reordering directories)

    env.response.status_code = 200 # OK
    env.response.content_type = "application/json"
    existing_lane.to_json # Return the updated lane data
  rescue ex : JSON::ParseException
    env.response.status_code = 400 # Bad Request
    env.response.content_type = "application/json"
    {error: "Invalid JSON format: #{ex.message}"}.to_json
  rescue ex
    env.response.status_code = 500 # Internal Server Error
    ToCry::Log.error(exception: ex) { "Error processing PUT /lane/:name for lane '#{env.params.url["name"]}'" }
    env.response.content_type = "application/json"
    {error: "An unexpected error occurred."}.to_json
  end
end

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
post "/note" do |env|
  begin
    body = env.request.body
    if body.nil?
      env.response.status_code = 400
      env.response.content_type = "application/json"
      next {error: "Request body is missing."}.to_json
    end
    json_body = body.gets_to_end
    payload = NewNotePayload.from_json(json_body)

    target_lane_name = payload.lane_name
    note_data = payload.note

    # Find the target lane
    target_lane = ToCry::BOARD.lane(target_lane_name)

    unless target_lane
      env.response.status_code = 404 # Not Found
      env.response.content_type = "application/json"
      next {error: "Lane with name '#{target_lane_name}' not found."}.to_json
    end

    # Create a new Note instance and add it to the lane. The Note.initialize will generate a new ID.
    new_note = target_lane.note_add(title: note_data.title, tags: note_data.tags, content: note_data.content)

    # Save the board to persist the new note (this will save the note file and create symlink)
    ToCry::BOARD.save

    env.response.status_code = 201 # Created
    env.response.content_type = "application/json"
    new_note.to_json # Return the newly created note with its generated ID
  rescue ex : JSON::ParseException
    env.response.status_code = 400 # Bad Request
    env.response.content_type = "application/json"
    {error: "Invalid JSON format: #{ex.message}"}.to_json
  rescue ex
    env.response.status_code = 500 # Internal Server Error
    ToCry::Log.error(exception: ex) { "Error processing POST /note: #{ex.message}" }
    env.response.content_type = "application/json"
    {error: "An unexpected error occurred."}.to_json
  end
end

MAX_IMAGE_SIZE = 1_048_576 # 1MB

# API Endpoint to handle image uploads
# Expects a multipart/form-data request with a file part.

post "/upload/image" do |env|
  begin
    # Ensure the user-images subdirectory exists within the uploads directory
    upload_dir = File.join("uploads", "user-images")
    FileUtils.mkdir_p(upload_dir)

    # Get the first uploaded file from the request.
    uploaded_file = env.params.files.values.first?

    if uploaded_file.nil?
      env.response.status_code = 400
      env.response.content_type = "application/json"
      next {error: "No file uploaded."}.to_json
    end

    # Check if the file size exceeds the limit
    if uploaded_file.tempfile.size > MAX_IMAGE_SIZE
      env.response.status_code = 413 # Payload Too Large
      env.response.content_type = "application/json"
      next {error: "Image size exceeds the 1MB limit."}.to_json
    end

    # Generate a unique filename to prevent overwrites, while keeping the original extension
    extension = File.extname(uploaded_file.filename.as(String))
    unique_filename = "#{UUID.random.to_s}#{extension}"
    save_path = File.join(upload_dir, unique_filename)

    # Save the file by copying the tempfile to our target location
    File.open(save_path, "w") do |f|
      IO.copy(uploaded_file.tempfile, f)
    end

    # The public URL for the saved image
    public_url = "/user-images/#{unique_filename}"
    ToCry::Log.info { "Image uploaded successfully: #{public_url}" }

    # Respond with the URL so the frontend can use it
    env.response.status_code = 201 # Created
    env.response.content_type = "application/json"
    {url: public_url}.to_json
  rescue ex
    env.response.status_code = 500 # Internal Server Error
    ToCry::Log.error(exception: ex) { "Error processing POST /upload/image: #{ex.message}" }
    env.response.content_type = "application/json"
    {error: "An unexpected error occurred during image upload."}.to_json
  end
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
put "/note/:id" do |env|
  begin
    note_id = env.params.url["id"].as(String)
    body = env.request.body
    if body.nil?
      env.response.status_code = 400
      env.response.content_type = "application/json"
      next {error: "Request body is missing."}.to_json
    end
    json_body = body.gets_to_end
    payload = UpdateNotePayload.from_json(json_body)
    new_note_data = payload.note

    # Find the note and its current lane on the board
    find_result = ToCry::BOARD.note(note_id)
    unless find_result
      env.response.status_code = 404
      env.response.content_type = "application/json"
      next {error: "Note with ID '#{note_id}' not found on the board."}.to_json
    end
    existing_note, current_lane = find_result

    # Update note content if it has changed
    content_changed = (existing_note.title != new_note_data.title) ||
                      (existing_note.tags != new_note_data.tags) ||
                      (existing_note.content != new_note_data.content)

    if content_changed
      existing_note.title = new_note_data.title
      existing_note.tags = new_note_data.tags
      existing_note.content = new_note_data.content
      existing_note.save
      ToCry::Log.info { "Note '#{existing_note.title}' (ID: #{note_id}) content updated." }
    end

    # Handle moving the note if lane_name or position is provided
    structure_changed = false
    target_lane_name = payload.lane_name
    new_position = payload.position

    # Case 1: Moving to a different lane
    if target_lane_name && target_lane_name != current_lane.name
      target_lane = ToCry::BOARD.lane(target_lane_name)
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
    ToCry::BOARD.save if structure_changed

    env.response.status_code = 200
    env.response.content_type = "application/json"
    existing_note.to_json
  rescue ex : JSON::ParseException
    env.response.status_code = 400 # Bad Request
    env.response.content_type = "application/json"
    {error: "Invalid JSON format: #{ex.message}"}.to_json
  rescue ex
    env.response.status_code = 500 # Internal Server Error
    ToCry::Log.error(exception: ex) { "Error processing PUT /note/:id for ID '#{env.params.url["id"]?}'" }
    env.response.content_type = "application/json"
    {error: "An unexpected error occurred."}.to_json
  end
end

# API Endpoint to delete a lane by name
# Expects the lane name in the URL path, e.g.:
# DELETE /lane/My%20Lane%20Name
delete "/lane/:name" do |env|
  begin
    lane_name = env.params.url["name"].as(String)
    ToCry::BOARD.lane_del(lane_name)
    env.response.status_code = 200
    env.response.content_type = "application/json"
    {success: "Lane '#{lane_name}' deleted."}.to_json
    # Or for 204 No Content:
    # env.response.status_code = 204 # No Content
  rescue ex
    env.response.status_code = 500 # Internal Server Error
    ToCry::Log.error(exception: ex) { "Error processing DELETE /lane/:name for lane '#{env.params.url["name"]}'" }
    env.response.content_type = "application/json"
    {error: "An unexpected error occurred."}.to_json
  end
end

# API Endpoint to delete a note by its ID
# Expects the note ID in the URL path, e.g.:
# DELETE /note/some-uuid-123
delete "/note/:id" do |env|
  begin
    note_id = env.params.url["id"].as(String)

    # Find the note on the board to get a handle on the object
    find_result = ToCry::BOARD.note(note_id)

    if find_result
      note_to_delete, _ = find_result
      note_to_delete.delete # This method handles file deletion and board saving

      env.response.status_code = 200
      env.response.content_type = "application/json"
      note_to_delete.to_json # Return the deleted note's data
    else
      # Idempotency: If the note doesn't exist, the desired state is achieved.
      env.response.status_code = 200
      env.response.content_type = "application/json"
      {success: "Note with ID '#{note_id}' not found, desired state achieved."}.to_json
    end
  rescue ex
    env.response.status_code = 500 # Internal Server Error
    ToCry::Log.error(exception: ex) { "Error processing DELETE /note/:id for ID '#{env.params.url["id"]?}'" }
    env.response.content_type = "application/json"
    {error: "An unexpected error occurred."}.to_json
  end
end
