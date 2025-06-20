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
