# /home/ralsina/code/tocry/src/endpoints/boards.cr
require "kemal"
require "../tocry"
require "../demo"
require "./helpers"

module ToCry::Endpoints::Boards
  # Path-scoped before filter to validate the board name and store it in the context.
  # This filter is specific to board-related paths.
  # Skips existence check for DELETE requests to support idempotent deletion.
  before_all "/api/v1/boards/:board_name/*" do |env|
    ToCry::Endpoints::Helpers.validate_board_access(env)
  end

  # Serve the main application HTML for board-specific URLs
  get "/b/:board_name" do |env|
    board_name = env.params.url["board_name"].as(String)
    demo_mode = ToCry::Demo.demo_mode?
    render "templates/app.ecr"
  end

  # Serve the public board view (read-only, no authentication required)
  get "/public/:board_id" do |env|
    board_id = env.params.url["board_id"].as(String)

    begin
      # Load the board directly using Sepia
      board = ToCry::Board.load(board_id)

      # Check if board exists and is public
      if board.nil? || !board.public
        ToCry::Log.info { "Public board access denied for ID '#{board_id}': #{board.nil? ? "not found" : "not public"}" }
        env.response.status_code = 404
        next render "templates/404.ecr"
      end

      # Make board available to ECR template
      public_board = board

      # Render the template - ECR will have access to local variables
      render "templates/public_board.ecr"
    rescue ex
      ToCry::Log.error(exception: ex) { "Error loading public board with ID '#{board_id}': #{ex.message}" }
      env.response.status_code = 500
      render "templates/404.ecr"
    end
  end

  # API Endpoint to get all boards
  get "/api/v1/boards" do |env|
    user = ToCry.get_current_user_id(env)
    # Get board names using the new BoardReference system
    board_names = ToCry::BoardReference.accessible_to_user(user).map(&.board_name)

    ToCry::Endpoints::Helpers.success_response(env, board_names)
  end

  # API Endpoint to get board details including color scheme and complete lane state
  # Expects the board name in the URL path, e.g.:
  # GET /boards/My%20Board
  #
  # Returns the complete board state including all lanes and their notes:
  # {
  #   "name": "Board Name",
  #   "color_scheme": "Blue",
  #   "first_visible_lane": 0,
  #   "show_hidden_lanes": false,
  #   "lanes": [
  #     {
  #       "name": "Todo",
  #       "notes": [
  #         {
  #           "id": "note-uuid",
  #           "title": "Task title",
  #           "content": "Task content",
  #           "tags": ["urgent"],
  #           "expanded": false,
  #           "public": false,
  #           "attachments": [],
  #           "start_date": "2025-01-01",
  #           "end_date": "2025-01-15",
  #           "priority": "high"
  #         }
  #       ]
  #     }
  #   ]
  # }
  get "/api/v1/boards/:board_name" do |env|
    user = ToCry.get_current_user_id(env)
    board_name = env.params.url["board_name"].as(String)
    board = ToCry.board_manager.get(board_name, user)

    unless board
      next ToCry::Endpoints::Helpers.error_response(env, "Board not found", 404)
    end

    # Build complete board representation with lanes and notes
    lanes_data = board.lanes.map do |lane|
      {
        name:  lane.name,
        notes: lane.notes.map do |note|
          {
            sepia_id:    note.sepia_id,
            title:       note.title,
            content:     note.content,
            tags:        note.tags,
            expanded:    note.expanded,
            public:      note.public,
            attachments: note.attachments,
            start_date:  note.start_date,
            end_date:    note.end_date,
            priority:    note.priority.try(&.to_s),
          }
        end,
      }
    end

    board_details = {
      id:                 board.sepia_id,
      name:               board.name,
      color_scheme:       ToCry::ColorScheme.validate(board.color_scheme),
      first_visible_lane: board.first_visible_lane,
      show_hidden_lanes:  board.show_hidden_lanes,
      public:             board.public,
      lanes:              lanes_data,
    }

    ToCry::Endpoints::Helpers.success_response(env, board_details)
  end

  # API Endpoint to create a new board
  # Expects a JSON body with a board name and optional color scheme, e.g.:
  # { "name": "My New Board", "color_scheme": "Blue" }
  post "/api/v1/boards" do |env|
    json_body = ToCry::Endpoints::Helpers.get_json_body(env)
    payload = ToCry::Endpoints::Helpers::NewBoardPayload.from_json(json_body)

    new_board_name = payload.name.strip
    ToCry::Endpoints::Helpers.validate_path_component(new_board_name)

    # Get the current user from the request context and pass it to create.
    user = ToCry.get_current_user_id(env)
    board = ToCry.board_manager.create(new_board_name, user)

    # Set color scheme if provided
    if payload.color_scheme
      board.color_scheme = ToCry::ColorScheme.validate(payload.color_scheme)
      board.save
    end

    ToCry::Endpoints::Helpers.created_response(env, {success: "Board '#{new_board_name}' created."})
  end

  # API Endpoint to update a board (rename or change first_visible_lane)
  # Expects the current board name in the URL path, e.g.:
  # PUT /boards/Old%20Board%20Name
  # Expects a JSON body like:
  # { "new_name": "New Board Name" } or { "first_visible_lane": 2 } or both
  put "/api/v1/boards/:board_name" do |env|
    begin
      old_board_name = env.params.url["board_name"].as(String)
      json_body = ToCry::Endpoints::Helpers.get_json_body(env)

      # Log the raw JSON payload for debugging
      ToCry::Log.info { "PUT /api/v1/boards/#{old_board_name} - Raw JSON payload: #{json_body}" }

      payload = ToCry::Endpoints::Helpers::UpdateBoardPayload.from_json(json_body)
      ToCry::Log.info { payload.to_s }


      # Log parsed payload fields
      ToCry::Log.info { "Parsed payload - new_name: #{payload.new_name.inspect}, first_visible_lane: #{payload.first_visible_lane.inspect}, show_hidden_lanes: #{payload.show_hidden_lanes.inspect}, public: #{payload.public.inspect}, lanes: #{payload.lanes.try(&.size)} lanes" }

      user = ToCry.get_current_user_id(env)
      board = ToCry.board_manager.get(old_board_name, user)

      unless board
        next ToCry::Endpoints::Helpers.error_response(env, "Board not found", 404)
      end

      # Handle board renaming
      if new_name = payload.new_name
        new_board_name = new_name.strip
        raise ToCry::Endpoints::Helpers::MissingBodyError.new("New board name cannot be empty.") if new_board_name.empty?
        ToCry::Endpoints::Helpers.validate_path_component(new_board_name)
        ToCry.board_manager.rename(old_board_name, new_board_name, user)
        old_board_name = new_board_name # Update for success message
      end

      # Handle first_visible_lane update
      if first_visible_lane = payload.first_visible_lane
        # Validate the first_visible_lane value
        if first_visible_lane < 0
          next ToCry::Endpoints::Helpers.error_response(env, "first_visible_lane cannot be negative", 400)
        end
        if first_visible_lane > board.lanes.size
          next ToCry::Endpoints::Helpers.error_response(env, "first_visible_lane cannot exceed number of lanes", 400)
        end

        ToCry::Log.info { "Updating first_visible_lane from #{board.first_visible_lane} to #{first_visible_lane}" }
        board.first_visible_lane = first_visible_lane
        board.save
        ToCry::Log.info { "After save, board.first_visible_lane is #{board.first_visible_lane}" }

        # Verify by reloading
        reloaded = ToCry.board_manager.get(board.name, user: user)
        if reloaded
          ToCry::Log.info { "Reloaded board first_visible_lane is #{reloaded.first_visible_lane}" }
        end
      end

      # Handle show_hidden_lanes update
      unless payload.show_hidden_lanes.nil?
        show_hidden_lanes = payload.show_hidden_lanes.not_nil!
        board.show_hidden_lanes = show_hidden_lanes
        board.save
      end

      # Handle color_scheme update
      if color_scheme = payload.color_scheme
        board.color_scheme = ToCry::ColorScheme.validate(color_scheme)
        board.save
      end

      # Handle public update
      unless payload.public.nil?
        public_status = payload.public.not_nil!
        ToCry::Log.info { "Updating board public status from #{board.public} to #{public_status}" }
        board.public = public_status
        board.save
        ToCry::Log.info { "After save, board.public is #{board.public}" }

        # Verify by reloading
        reloaded = ToCry.board_manager.get(board.name, user: user)
        if reloaded
          ToCry::Log.info { "Reloaded board.public is #{reloaded.public}" }
        end
      end

      # Handle complete lane state management
      if lanes = payload.lanes
        # Create new lanes array with proper ordering based on payload
        new_lanes = [] of ToCry::Lane

        # Process each lane definition from the payload
        lanes.each do |lane_payload|
          lane_name = lane_payload.name.strip

          # Validate lane name
          if lane_name.empty?
            next ToCry::Endpoints::Helpers.error_response(env, "Lane name cannot be empty.", 400)
          end

          # Find existing lane with this name on this board
          existing_lane = board.lanes.find { |lane| lane.name == lane_name }

          if existing_lane
            # Move existing lane to new position (create fresh Lane object)
            new_lane = ToCry::Lane.new(existing_lane.name)
            # Copy all notes to the new lane (creating fresh Note instances)
            new_lane.notes = existing_lane.notes.map do |note|
              new_note = ToCry::Note.new(
                note.title,
                note.tags,
                note.content,
                note.expanded,
                note.public,
                note.attachments,
                note.start_date,
                note.end_date,
                note.priority
              )
              new_note
            end
            new_lanes << new_lane
          else
            # Create completely new lane
            new_lane = ToCry::Lane.new(lane_name)
            new_lanes << new_lane
          end
        end

        # Replace the board's lanes entirely with the new ordered lanes
        board.lanes = new_lanes
        board.save
      end

      ToCry::Endpoints::Helpers.success_response(env, {success: "Board updated successfully."})
    rescue ex
      ToCry::Log.error(exception: ex) { "Error updating board '#{old_board_name}'" }
      raise ex
    end
  end

  # API Endpoint to delete a board by name (idempotent)
  # Expects the board name in the URL path, e.g.:
  # DELETE /boards/My%20Board
  # Note: This endpoint is idempotent - deleting an already deleted board will succeed
  delete "/api/v1/boards/:board_name" do |env|
    board_name = env.params.url["board_name"].as(String)
    user = ToCry.get_current_user_id(env)
    ToCry.board_manager.delete(board_name, user)
    ToCry::Endpoints::Helpers.success_response(env, {success: "Board '#{board_name}' deleted."})
  end

  # API Endpoint to share a board with another user
  # Expects the board name in the URL path, e.g.:
  # POST /boards/My%20Board/share
  # Expects a JSON body like:
  # { "to_user_email": "another_user@example.com" }
  post "/api/v1/boards/:board_name/share" do |env|
    board_name = env.params.url["board_name"].as(String)
    json_body = ToCry::Endpoints::Helpers.get_json_body(env)
    payload = ToCry::Endpoints::Helpers::ShareBoardPayload.from_json(json_body)
    to_user_email = payload.to_user_email
    from_user = ToCry.get_current_user_id(env)

    ToCry.board_manager.share_board(board_name, from_user, to_user_email)

    ToCry::Endpoints::Helpers.success_response(env, {success: "Board '#{board_name}' shared with '#{to_user_email}'."})
  end
end
