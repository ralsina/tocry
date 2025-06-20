require "kemal"
require "./tocry" # To access ToCry::BOARD and other definitions

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
    json_body = env.request.body.not_nil!.gets_to_end
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
    json_body = env.request.body.not_nil!.gets_to_end

    payload = UpdateLanePayload.from_json(json_body)
    new_lane_data = payload.lane
    new_position = payload.position

    # Find the existing lane by its current name
    existing_lane = ToCry::BOARD.lanes.find { |lane| lane.name == current_lane_name }

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
    json_body = env.request.body.not_nil!.gets_to_end
    payload = NewNotePayload.from_json(json_body)

    pp! payload

    target_lane_name = payload.lane_name
    note_data = payload.note

    # Find the target lane
    target_lane = ToCry::BOARD.lanes.find { |lane| lane.name == target_lane_name }

    unless target_lane
      env.response.status_code = 404 # Not Found
      env.response.content_type = "application/json"
      next {error: "Lane with name '#{target_lane_name}' not found."}.to_json
    end

    # Create a new Note instance and add it to the lane. The Note.initialize will generate a new ID.
    new_note = target_lane.note_add(title: note_data.title, tags: note_data.tags, content: note_data.content)
    new_note.save

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
    {error: "An unexpected error occurred."}.to_json
  end
end
