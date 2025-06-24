require "kemal"
require "./tocry"    # To access ToCry::BOARD and other definitions
require "uuid"       # For generating unique filenames
require "file_utils" # For creating directories
require "uri"        # For parsing URL paths

# Custom error for when a request body is expected but not provided.
class MissingBodyError < Exception; end

# Helper function to retrieve the Board instance from the request context.
private def get_board_from_context(env : HTTP::Server::Context) : ToCry::Board
  board_name = env.get("board_name").as(String)
  board = ToCry.board_manager.get(board_name)

  unless board
    # This path should not be reachable due to the before_all filter,
    # but this check provides robustness and a clearer error message.
    raise "Failed to retrieve board '#{board_name}' from context."
  end
  board
end

# Helper function to validate a string as a safe path component.
# Rejects empty strings, '.', '..', strings containing path separators, or strings starting with '.'.
private def validate_path_component(name : String)
  if name.empty?
    raise MissingBodyError.new("Name cannot be empty.")
  end
  if name == "." || name == ".."
    raise MissingBodyError.new("Invalid name: '.' and '..' are not allowed.")
  end
  if name.includes?('/') || name.includes?('\\') || name.starts_with?('.')
    raise MissingBodyError.new("Invalid name: It cannot contain path separators or start with a dot.")
  end
end

# Helper function to safely get the JSON request body.
# If the body is missing, it raises a MissingBodyError.
private def get_json_body(env : HTTP::Server::Context) : String
  body = env.request.body
  raise MissingBodyError.new("Request body is missing.") if body.nil?
  body.gets_to_end
end

# Path-scoped before filter to validate the board name and store it in the context.
before_all "/boards/:board_name/*" do |env|
  board_name = env.params.url["board_name"].as(String)
  # Use the BoardManager to check for existence. This also warms the cache.
  board = ToCry.board_manager.get(board_name)

  unless board
    env.response.status_code = 404
    env.response.content_type = "application/json"
    env.response.print({error: "Board '#{board_name}' not found."}.to_json)
    halt env # Stop processing the request
  end
  # Store the board name in the environment for other routes to use.
  env.set("board_name", board_name)
end

# Global error handler for missing request bodies or invalid JSON.
error MissingBodyError | JSON::ParseException do |env, ex|
  env.response.status_code = 400 # Bad Request
  env.response.content_type = "application/json"
  {error: ex.message}.to_json
end

# Global error handler for any other unhandled exceptions.
error Exception do |env, ex|
  env.response.status_code = 500 # Internal Server Error
  ToCry::Log.error(exception: ex) { "An unexpected error occurred: #{ex.message}" }
  env.response.content_type = "application/json"
  {error: "An unexpected error occurred."}.to_json
end

# API Endpoint to get all boards
get "/boards" do |env|
  env.response.content_type = "application/json"
  ToCry.board_manager.list.to_json
end

# API Endpoint to create a new board
# Expects a JSON body with a board name, e.g.:
# { "name": "My New Board" }
post "/boards" do |env|
  json_body = get_json_body(env)
  payload = NewBoardPayload.from_json(json_body)

  new_board_name = payload.name.strip
  # Validate the new board name for safety
  validate_path_component(new_board_name)

  ToCry.board_manager.create(new_board_name)

  env.response.status_code = 201 # Created
  env.response.content_type = "application/json"
  {success: "Board '#{new_board_name}' created."}.to_json
end

# API Endpoint to get all lanes
get "/boards/:board_name/lanes" do |env|
  env.response.content_type = "application/json"
  board = get_board_from_context(env)
  board.lanes.to_json
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

# Helper struct for parsing the PUT /boards/:board_name request payload for renaming
struct RenameBoardPayload
  include JSON::Serializable
  property new_name : String
end

# Helper struct for parsing the POST /boards request payload
struct NewBoardPayload
  include JSON::Serializable
  property name : String
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
post "/boards/:board_name/lane" do |env|
  begin
    board = get_board_from_context(env)
    json_body = get_json_body(env)
    payload = NewLanePayload.from_json(json_body)

    requested_name = payload.name
    validate_path_component(requested_name) # Validate the requested lane name
    final_name = requested_name
    counter = 1

    # Deduplicate name if a lane with the same name already exists
    while board.lanes.any? { |lane| lane.name == final_name }
      final_name = "#{requested_name} (#{counter})"
      counter += 1
    end

    new_lane = board.lane_add(final_name)
    if final_name != requested_name
      ToCry::Log.info { "Lane '#{requested_name}' requested, added as '#{final_name}' to board '#{board.board_data_dir}' via POST /lane due to name collision." }
    else
      ToCry::Log.info { "Lane '#{new_lane.name}' added to board '#{board.board_data_dir}' via POST /lane." }
    end
    board.save

    env.response.status_code = 201 # Created
    env.response.content_type = "application/json"
    new_lane.to_json
  end
end

# API Endpoint to update a lane's name and/or position
# Expects the current lane name in the URL path, e.g.:
# PUT /lane/Old%20Lane%20Name
# Expects a JSON body like:
# { "lane": { "name": "New Lane Name", "notes": [...] }, "position": 1 }
# Note: This implementation primarily uses the 'name' and 'position' from the payload.
# Updating notes via this endpoint is not implemented here.
put "/boards/:board_name/lane/:name" do |env|
  begin
    current_lane_name = env.params.url["name"].as(String)
    board = get_board_from_context(env)
    json_body = get_json_body(env)
    payload = UpdateLanePayload.from_json(json_body)
    new_lane_data = payload.lane
    new_position = payload.position

    validate_path_component(new_lane_data.name) # Validate the new lane name for safety
    # Find the existing lane by its current name
    existing_lane = board.lane(current_lane_name)

    unless existing_lane
      env.response.status_code = 404 # Not Found
      env.response.content_type = "application/json"
      next {error: "Lane with name '#{current_lane_name}' not found."}.to_json
    end

    # Update the lane's name if it has changed
    existing_lane.name = new_lane_data.name

    # Move the lane to the new position
    # Ensure the new position is within valid bounds
    actual_new_position = new_position.clamp(0, board.lanes.size - 1)
    board.lanes.delete(existing_lane)
    board.lanes.insert(actual_new_position, existing_lane)

    board.save # Save the board to persist changes (renaming and reordering directories)

    env.response.status_code = 200 # OK
    env.response.content_type = "application/json"
    existing_lane.to_json # Return the updated lane data
end
end

# API Endpoint to rename a board
# Expects the current board name in the URL path, e.g.:
# PUT /boards/Old%20Board%20Name
# Expects a JSON body like:
# { "new_name": "New Board Name" }
put "/boards/:board_name" do |env|
  begin
    old_board_name = env.params.url["board_name"].as(String)
    json_body = get_json_body(env)
    payload = RenameBoardPayload.from_json(json_body)
    new_board_name = payload.new_name.strip

    raise MissingBodyError.new("New board name cannot be empty.") if new_board_name.empty?
    validate_path_component(new_board_name) # Validate the new board name for safety

    ToCry.board_manager.rename(old_board_name, new_board_name)

    env.response.status_code = 200 # OK
    env.response.content_type = "application/json"
    {success: "Board '#{old_board_name}' renamed to '#{new_board_name}'."}.to_json
  rescue ex
    ToCry::Log.error(exception: ex) { "Error renaming board '#{old_board_name}' to '#{new_board_name}'" }
    raise ex
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
post "/boards/:board_name/note" do |env|
  begin
    board = get_board_from_context(env)
    json_body = get_json_body(env)
    payload = NewNotePayload.from_json(json_body)

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
end

MAX_IMAGE_SIZE = 1_048_576 # 1MB

# API Endpoint to handle image uploads
# Expects a multipart/form-data request with a file part.

post "/upload/image" do |env|
  begin
    # Ensure the user-images subdirectory exists within the uploads directory
    upload_dir = File.join(ToCry.data_directory, ".uploads", "user-images")
    FileUtils.mkdir_p(upload_dir)

    # Get the first uploaded file from the request.
    uploaded_file = env.params.files.values.first?

    if uploaded_file.nil?
      raise MissingBodyError.new("No file uploaded.")
    end

    # Check if the file size exceeds the limit
    if uploaded_file.tempfile.size > MAX_IMAGE_SIZE
      env.response.status_code = 413 # Payload Too Large
      env.response.content_type = "application/json"
      next {error: "Image size exceeds the 1MB limit."}.to_json
    end

    # Generate a unique filename to prevent overwrites, while keeping the original extension
    extension = File.extname(uploaded_file.filename.as(String))
    unique_filename = "#{UUID.random}#{extension}"
    save_path = File.join(upload_dir, unique_filename)

    # Save the file by copying the tempfile to our target location
    File.open(save_path, "w") do |outf|
      IO.copy(uploaded_file.tempfile, outf)
    end

    # The public URL for the saved image
    public_url = "/user-images/#{unique_filename}"
    ToCry::Log.info { "Image uploaded successfully: #{public_url}" }

    # Respond with the URL so the frontend can use it
    env.response.status_code = 201 # Created
    env.response.content_type = "application/json"
    {url: public_url}.to_json
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
put "/boards/:board_name/note/:id" do |env|
  begin
    note_id = env.params.url["id"].as(String)
    board = get_board_from_context(env)
    json_body = get_json_body(env)
    payload = UpdateNotePayload.from_json(json_body)
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
      existing_note.save(board.board_data_dir) # Save the note to persist changes
      ToCry::Log.info { "Note '#{existing_note.title}' (ID: #{note_id}) data updated for board '#{board.board_data_dir}'." }
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
end

# API Endpoint to delete a lane by name
# Expects the lane name in the URL path, e.g.:
# DELETE /lane/My%20Lane%20Name
delete "/boards/:board_name/lane/:name" do |env|
  begin
    lane_name = env.params.url["name"].as(String)
    board = get_board_from_context(env)
    board.lane_del(lane_name)
    env.response.status_code = 200
    env.response.content_type = "application/json"
    {success: "Lane '#{lane_name}' deleted."}.to_json
  end
end

# API Endpoint to delete a note by its ID
# Expects the note ID in the URL path, e.g.:
# DELETE /note/some-uuid-123
delete "/boards/:board_name/note/:id" do |env|
  begin
    note_id = env.params.url["id"].as(String)
    board = get_board_from_context(env)

    # Find the note on the board to get a handle on the object
    find_result = board.note(note_id)

    if find_result
      note_to_delete, _ = find_result
      note_to_delete.delete(board) # Pass the board object to the note's delete method

      env.response.status_code = 200
      env.response.content_type = "application/json"
      note_to_delete.to_json # Return the deleted note's data
    end
  end
end

# API Endpoint to delete a board by name
# Expects the board name in the URL path, e.g.:
# DELETE /boards/My%20Board
delete "/boards/:board_name" do |env|
  board_name = env.params.url["board_name"].as(String)
  ToCry.board_manager.delete(board_name)
  env.response.status_code = 200 # OK
  env.response.content_type = "application/json"
  {success: "Board '#{board_name}' deleted."}.to_json
end
