# /home/ralsina/code/tocry/src/endpoints/lanes.cr
require "kemal"
require "../tocry"
require "./helpers"

module ToCry::Endpoints::Lanes
  # API Endpoint to get all lanes
  get "/boards/:board_name/lanes" do |env|
    board = ToCry::Endpoints::Helpers.get_board_from_context(env)
    ToCry::Endpoints::Helpers.success_response(env, board.lanes)
  end

  # API Endpoint to add a new lane
  # Expects a JSON body with a lane name, e.g.:
  # { "name": "New Lane Name" }
  post "/boards/:board_name/lane" do |env|
    board = ToCry::Endpoints::Helpers.get_board_from_context(env)
    json_body = ToCry::Endpoints::Helpers.get_json_body(env)
    payload = ToCry::Endpoints::Helpers::NewLanePayload.from_json(json_body)

    requested_name = payload.name
    ToCry::Endpoints::Helpers.validate_path_component(requested_name) # Validate the requested lane name
    final_name = requested_name
    counter = 1

    # Deduplicate name if a lane with the same name already exists
    while board.lanes.any? { |lane| lane.name == final_name }
      final_name = "#{requested_name} (#{counter})"
      counter += 1
    end

    new_lane = board.lane_add(final_name)
    if final_name != requested_name
      ToCry::Log.info { "Lane '#{requested_name}' requested, added as '#{final_name}' to board '#{board.name}' via POST /lane due to name collision." }
    else
      ToCry::Log.info { "Lane '#{new_lane.name}' added to board '#{board.name}' via POST /lane." }
    end
    board.save

    ToCry::Endpoints::Helpers.created_response(env, new_lane)
  end

  # API Endpoint to update a lane's name and/or position
  # Expects the current lane name in the URL path, e.g.:
  # PUT /lane/Old%20Lane%20Name
  # Expects a JSON body like:
  # { "lane": { "name": "New Lane Name", "notes": [...] }, "position": 1 }
  # Note: This implementation primarily uses the 'name' and 'position' from the payload.
  # Updating notes via this endpoint is not implemented here.
  put "/boards/:board_name/lane/:name" do |env|
    current_lane_name = env.params.url["name"].as(String)
    board = ToCry::Endpoints::Helpers.get_board_from_context(env)
    json_body = ToCry::Endpoints::Helpers.get_json_body(env)
    payload = ToCry::Endpoints::Helpers::UpdateLanePayload.from_json(json_body)
    new_lane_data = payload.lane
    new_position = payload.position

    ToCry::Endpoints::Helpers.validate_path_component(new_lane_data.name) # Validate the new lane name for safety
    # Find the existing lane by its current name
    existing_lane = board.lane(current_lane_name)

    unless existing_lane
      next ToCry::Endpoints::Helpers.not_found_response(env, "Lane with name '#{current_lane_name}' not found.")
    end

    # Update the lane's name if it has changed
    existing_lane.name = new_lane_data.name

    # Move the lane to the new position
    # Ensure the new position is within valid bounds
    actual_new_position = new_position.clamp(0, board.lanes.size - 1)
    board.lanes.delete(existing_lane)
    board.lanes.insert(actual_new_position, existing_lane)

    board.save # Save the board to persist changes (renaming and reordering directories)

    ToCry::Endpoints::Helpers.success_response(env, existing_lane)
  end

  # API Endpoint to reorder all lanes
  # Expects a JSON body with ordered lane names, e.g.:
  # { "lanes": ["Lane 1", "Lane 2", "Lane 3"] }
  post "/boards/:board_name/lanes/reorder" do |env|
    board = ToCry::Endpoints::Helpers.get_board_from_context(env)
    json_body = ToCry::Endpoints::Helpers.get_json_body(env)
    payload = ToCry::Endpoints::Helpers::ReorderLanesPayload.from_json(json_body)

    # Create a new array with lanes in the requested order
    new_lanes_order = [] of ToCry::Lane

    payload.lanes.each do |lane_name|
      lane = board.lanes.find { |existing_lane| existing_lane.name == lane_name }
      if lane
        new_lanes_order << lane
      else
        ToCry::Endpoints::Helpers.error_response(env, "Lane '#{lane_name}' not found", 400)
      end
    end

    # Ensure all lanes are included
    if new_lanes_order.size != board.lanes.size
      ToCry::Endpoints::Helpers.error_response(env, "Not all lanes included in reorder request", 400)
      next
    end

    # Update the board's lanes order
    board.lanes = new_lanes_order
    board.save

    ToCry::Endpoints::Helpers.success_response(env, {success: "Lanes reordered successfully."})
  end

  # API Endpoint to delete a lane by name
  # Expects the lane name in the URL path, e.g.:
  # DELETE /lane/My%20Lane%20Name
  delete "/boards/:board_name/lane/:name" do |env|
    lane_name = env.params.url["name"].as(String)
    board = ToCry::Endpoints::Helpers.get_board_from_context(env)
    board.lane_del(lane_name)
    ToCry::Endpoints::Helpers.success_response(env, {success: "Lane '#{lane_name}' deleted."})
  end
end
