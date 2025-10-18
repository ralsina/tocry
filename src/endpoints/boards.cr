# /home/ralsina/code/tocry/src/endpoints/boards.cr
require "kemal"
require "../tocry"
require "../demo"
require "../websocket_handler"
require "./helpers"
require "../services/board_service"

module ToCry::Endpoints::Boards
  # Path-scoped before filter to validate the board name and store it in the context.
  # This filter is specific to board-related paths.
  # Skips existence check for DELETE requests to support idempotent deletion.
  before_all "/api/v1/boards/:board_name/*" do |env|
    ToCry::Endpoints::Helpers.validate_board_access(env)
  end

  # Serve the main application HTML for board-specific URLs
  get "/b/:board_name" do |_env|
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

      # Make board available to ECR template (used in templates/public_board.ecr)
      # ameba:disable Lint/UselessAssign
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
    begin
      user = ToCry.get_current_user_id(env)

      # Use NoteService to list all boards (handles all business logic)
      result = ToCry::Services::NoteService.list_all_boards(user)

      if result[:success]
        ToCry::Endpoints::Helpers.success_response(env, result[:boards].map(&.["name"].as(String)))
      else
        ToCry::Endpoints::Helpers.error_response(env, result[:error], 500)
      end
    rescue ex
      ToCry::Log.error(exception: ex) { "Error listing boards" }
      ToCry::Endpoints::Helpers.error_response(env, "Failed to list boards", 500)
    end
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
    begin
      user = ToCry.get_current_user_id(env)
      board_name = env.params.url["board_name"].as(String)

      # Use NoteService to get board details (handles all validation and data transformation)
      result = ToCry::Services::NoteService.get_board_with_details(board_name, user)

      if result[:success]
        ToCry::Endpoints::Helpers.success_response(env, result[:board])
      else
        ToCry::Endpoints::Helpers.error_response(env, result[:error], 404)
      end
    rescue ex
      ToCry::Log.error(exception: ex) { "Error getting board details" }
      ToCry::Endpoints::Helpers.error_response(env, "Failed to get board details", 500)
    end
  end

  # API Endpoint to create a new board
  # Expects a JSON body with a board name and optional color scheme, e.g.:
  # { "name": "My New Board", "color_scheme": "Blue" }
  post "/api/v1/boards" do |env|
    begin
      json_body = ToCry::Endpoints::Helpers.get_json_body(env)
      payload = ToCry::Endpoints::Helpers::NewBoardPayload.from_json(json_body)

      new_board_name = payload.name.strip
      ToCry::Endpoints::Helpers.validate_path_component(new_board_name)

      user = ToCry.get_current_user_id(env)

      # Use BoardService to create the board
      result = ToCry::Services::BoardService.create_board(
        board_name: new_board_name,
        user_id: user,
        color_scheme: payload.color_scheme,
        exclude_client_id: ToCry::WebSocketHandler.extract_client_id(env)
      )

      if result.success
        ToCry::Endpoints::Helpers.created_response(env, {success: "Board '#{new_board_name}' created successfully."})
      else
        ToCry::Endpoints::Helpers.error_response(env, result.message, 400)
      end
    rescue ex
      ToCry::Log.error(exception: ex) { "Error creating board" }
      ToCry::Endpoints::Helpers.error_response(env, "Failed to create board", 500)
    end
  end

  # API Endpoint to update a board (rename or change properties)
  # Expects the current board name in the URL path, e.g.:
  # PUT /boards/Old%20Board%20Name
  # Expects a JSON body like:
  # { "new_name": "New Board Name", "color_scheme": "Blue", "public": true }
  put "/api/v1/boards/:board_name" do |env|
    begin
      old_board_name = env.params.url["board_name"].as(String)
      json_body = ToCry::Endpoints::Helpers.get_json_body(env)
      payload = ToCry::Endpoints::Helpers::UpdateBoardPayload.from_json(json_body)

      user = ToCry.get_current_user_id(env)

      # Validate new name if provided
      new_board_name = payload.new_name
      if new_board_name
        new_board_name = new_board_name.strip
        if new_board_name.empty?
          next ToCry::Endpoints::Helpers.error_response(env, "New board name cannot be empty.", 400)
        end
        ToCry::Endpoints::Helpers.validate_path_component(new_board_name)
      end

      # Convert lanes to the format expected by BoardService
      lanes_data = payload.lanes.try do |lanes|
        lanes.map do |lane|
          {
            "name" => JSON::Any.new(lane.name),
          }
        end
      end

      # Use BoardService to update the board
      result = ToCry::Services::BoardService.update_board(
        board_name: old_board_name,
        user_id: user,
        new_board_name: new_board_name,
        public: payload.public,
        color_scheme: payload.color_scheme,
        lanes: lanes_data,
        exclude_client_id: ToCry::WebSocketHandler.extract_client_id(env)
      )

      if result.success
        # Handle first_visible_lane update if provided (not handled by BoardService)
        if first_visible_lane = payload.first_visible_lane
          final_board_name = result.new_name.empty? ? result.old_name : result.new_name
          board = ToCry.board_manager.get(final_board_name, user)
          if board
            # Validate the first_visible_lane value
            if first_visible_lane < 0
              next ToCry::Endpoints::Helpers.error_response(env, "first_visible_lane cannot be negative", 400)
            end
            if first_visible_lane > board.lanes.size
              next ToCry::Endpoints::Helpers.error_response(env, "first_visible_lane cannot exceed number of lanes", 400)
            end

            board.first_visible_lane = first_visible_lane
            board.save
          end
        end

        ToCry::Endpoints::Helpers.success_response(env, {success: "Board updated successfully."})
      else
        ToCry::Endpoints::Helpers.error_response(env, result.message, 400)
      end
    rescue ex
      ToCry::Log.error(exception: ex) { "Error updating board '#{old_board_name}'" }
      ToCry::Endpoints::Helpers.error_response(env, "Failed to update board", 500)
    end
  end

  # API Endpoint to delete a board by name (idempotent)
  # Expects the board name in the URL path, e.g.:
  # DELETE /boards/My%20Board
  # Note: This endpoint is idempotent - deleting an already deleted board will succeed
  delete "/api/v1/boards/:board_name" do |env|
    begin
      board_name = env.params.url["board_name"].as(String)
      user = ToCry.get_current_user_id(env)

      # Use BoardService to delete the board
      result = ToCry::Services::BoardService.delete_board(
        board_name: board_name,
        user_id: user,
        exclude_client_id: ToCry::WebSocketHandler.extract_client_id(env)
      )

      if result.success
        ToCry::Endpoints::Helpers.success_response(env, {success: result.message})
      else
        ToCry::Endpoints::Helpers.error_response(env, result.message, 400)
      end
    rescue ex
      ToCry::Log.error(exception: ex) { "Error deleting board '#{board_name}'" }
      ToCry::Endpoints::Helpers.error_response(env, "Failed to delete board", 500)
    end
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
