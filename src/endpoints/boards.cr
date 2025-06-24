# /home/ralsina/code/tocry/src/endpoints/boards.cr
require "kemal"
require "../tocry"
require "./helpers"

module ToCry::Endpoints::Boards
  # Note: No longer extending Helpers, we will call its methods directly.

  # Path-scoped before filter to validate the board name and store it in the context.
  # This filter is specific to board-related paths.
  before_all "/boards/:board_name/*" do |env|
    board_name = env.params.url["board_name"].as(String)
    board = ToCry.board_manager.get(board_name)

    unless board
      env.response.status_code = 404
      env.response.content_type = "application/json"
      env.response.print({error: "Board '#{board_name}' not found."}.to_json)
      halt env # Stop processing the request
    end
    env.set("board_name", board_name)
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
    json_body = ToCry::Endpoints::Helpers.get_json_body(env)
    payload = ToCry::Endpoints::Helpers::NewBoardPayload.from_json(json_body)

    new_board_name = payload.name.strip
    ToCry::Endpoints::Helpers.validate_path_component(new_board_name)

    ToCry.board_manager.create(new_board_name)

    env.response.status_code = 201 # Created
    env.response.content_type = "application/json"
    {success: "Board '#{new_board_name}' created."}.to_json
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

      ToCry.board_manager.rename(old_board_name, new_board_name)

      env.response.status_code = 200 # OK
      env.response.content_type = "application/json"
      {success: "Board '#{old_board_name}' renamed to '#{new_board_name}'."}.to_json
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
    ToCry.board_manager.delete(board_name)
    env.response.status_code = 200 # OK
    env.response.content_type = "application/json"
    {success: "Board '#{board_name}' deleted."}.to_json
  end
end
