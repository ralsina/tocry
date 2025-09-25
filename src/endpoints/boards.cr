# /home/ralsina/code/tocry/src/endpoints/boards.cr
require "kemal"
require "../tocry"
require "./helpers"

module ToCry::Endpoints::Boards
  # Path-scoped before filter to validate the board name and store it in the context.
  # This filter is specific to board-related paths.
  before_all "/boards/:board_name/*" do |env|
    user = ToCry.get_current_user_id(env)
    board_name = env.params.url["board_name"].as(String)
    board = ToCry.board_manager.get(board_name, user)

    unless board
      env.response.status_code = 404
    end
    env.set("board_name", board_name)
  end

  # Serve the main application HTML for board-specific URLs
  get "/b/:board_name" do |_|
    # board_name = env.params.url["board_name"].as(String)
    # user = ToCry.get_current_user_id(env)
    render "templates/app.ecr"
  end

  # API Endpoint to get all boards
  get "/boards" do |env|
    user = ToCry.get_current_user_id(env)
    board_names = ToCry.board_manager.list(user).map { |uuid|
      ToCry.board_manager.@boards[uuid].name
    }

    ToCry::Endpoints::Helpers.success_response(env, board_names)
  end

  # API Endpoint to get board details including color scheme
  get "/boards/:board_name" do |env|
    user = ToCry.get_current_user_id(env)
    board_name = env.params.url["board_name"].as(String)
    board = ToCry.board_manager.get(board_name, user)

    unless board
      env.response.status_code = 404
      next ToCry::Endpoints::Helpers.error_response(env, "Board not found", 404)
    end

    board_details = {
      name:         board.name,
      color_scheme: board.color_scheme,
    }

    ToCry::Endpoints::Helpers.success_response(env, board_details)
  end

  # API Endpoint to create a new board
  # Expects a JSON body with a board name and optional color scheme, e.g.:
  # { "name": "My New Board", "color_scheme": "Blue" }
  post "/boards" do |env|
    json_body = ToCry::Endpoints::Helpers.get_json_body(env)
    payload = ToCry::Endpoints::Helpers::NewBoardPayload.from_json(json_body)

    new_board_name = payload.name.strip
    ToCry::Endpoints::Helpers.validate_path_component(new_board_name)

    # Get the current user from the request context and pass it to create.
    user = ToCry.get_current_user_id(env)
    board = ToCry.board_manager.create(new_board_name, user)

    # Set color scheme if provided
    if payload.color_scheme
      board.color_scheme = payload.color_scheme
      board.save
    end

    ToCry::Endpoints::Helpers.created_response(env, {success: "Board '#{new_board_name}' created."})
  end

  # API Endpoint to rename a board
  # Expects the current board name in the URL path, e.g.:
  # PUT /boards/Old%20Board%20Name
  # Expects a JSON body like:
  # { "new_name": "New Board Name" }
  put "/boards/:board_name" do |env|
    begin
      old_board_name = env.params.url["board_name"].as(String)
      json_body = ToCry::Endpoints::Helpers.get_json_body(env)
      payload = ToCry::Endpoints::Helpers::RenameBoardPayload.from_json(json_body)
      new_board_name = payload.new_name.strip

      raise ToCry::Endpoints::Helpers::MissingBodyError.new("New board name cannot be empty.") if new_board_name.empty?
      ToCry::Endpoints::Helpers.validate_path_component(new_board_name)

      user = ToCry.get_current_user_id(env)
      ToCry.board_manager.rename(old_board_name, new_board_name, user)

      ToCry::Endpoints::Helpers.success_response(env, {success: "Board '#{old_board_name}' renamed to '#{new_board_name}'."})
    rescue ex
      ToCry::Log.error(exception: ex) { "Error renaming board '#{old_board_name}' to '#{new_board_name}'" }
      raise ex
    end
  end

  # API Endpoint to delete a board by name
  # Expects the board name in the URL path, e.g.:
  # DELETE /boards/My%20Board
  delete "/boards/:board_name" do |env|
    board_name = env.params.url["board_name"].as(String)
    user = ToCry.get_current_user_id(env)
    ToCry.board_manager.delete(board_name, user)
    ToCry::Endpoints::Helpers.success_response(env, {success: "Board '#{board_name}' deleted."})
  end

  # API Endpoint to update board color scheme
  # Expects the board name in the URL path, e.g.:
  # PUT /boards/My%20Board/color-scheme
  # Expects a JSON body like:
  # { "color_scheme": "Blue" }
  put "/boards/:board_name/color-scheme" do |env|
    board_name = env.params.url["board_name"].as(String)
    json_body = ToCry::Endpoints::Helpers.get_json_body(env)
    payload = ToCry::Endpoints::Helpers::ColorSchemePayload.from_json(json_body)

    user = ToCry.get_current_user_id(env)
    board = ToCry.board_manager.get(board_name, user)

    unless board
      env.response.status_code = 404
      next ToCry::Endpoints::Helpers.error_response(env, "Board not found", 404)
    end

    # Save color scheme to board object
    board.color_scheme = payload.color_scheme
    board.save

    ToCry::Endpoints::Helpers.success_response(env, {success: "Color scheme updated for board '#{board_name}'."})
  end

  # API Endpoint to share a board with another user
  # Expects the board name in the URL path, e.g.:
  # POST /boards/My%20Board/share
  # Expects a JSON body like:
  # { "to_user_email": "another_user@example.com" }
  post "/boards/:board_name/share" do |env|
    board_name = env.params.url["board_name"].as(String)
    json_body = ToCry::Endpoints::Helpers.get_json_body(env)
    payload = ToCry::Endpoints::Helpers::ShareBoardPayload.from_json(json_body)
    to_user_email = payload.to_user_email
    from_user = ToCry.get_current_user_id(env)

    ToCry.board_manager.share_board(board_name, from_user, to_user_email)

    ToCry::Endpoints::Helpers.success_response(env, {success: "Board '#{board_name}' shared with '#{to_user_email}'."})
  end
end
