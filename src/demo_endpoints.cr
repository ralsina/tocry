# Demo-specific endpoints - only compiled with -Ddemo flag
require "kemal"
require "./tocry"
require "./endpoints/helpers"

module ToCry::Endpoints::Demo
  # Demo info endpoint
  get "/demo/info" do |env|
    ToCry::Endpoints::Helpers.success_response(env, {
      demo_mode: true,
      version: ToCry::VERSION,
      features: [
        "Touch-based drag & drop",
        "Mobile-optimized interface",
        "Per-board color schemes",
        "Priority labels and dates",
        "File attachments",
        "Live search",
        "Multiple boards"
      ],
      sample_boards: ToCry::DemoData.board_names
    })
  end

  # Demo reset endpoint - reload sample data
  post "/demo/reset" do |env|
    # In demo mode, this would reset the session data
    # For now, just return success
    ToCry::Endpoints::Helpers.success_response(env, {
      message: "Demo data reset successfully",
      boards: ToCry::DemoData.board_names
    })
  end

  # Override boards endpoint for demo mode
  get "/boards" do |env|
    user = ToCry.get_current_user_id(env)

    # Return demo board names
    board_names = ToCry::DemoData.board_names
    ToCry::Endpoints::Helpers.success_response(env, board_names)
  end

  # Override board details endpoint for demo mode
  get "/boards/:board_name" do |env|
    board_name = env.params.url["board_name"].as(String)

    # Find the board in demo data
    if ToCry::DemoData.board_names.includes?(board_name)
      board_details = {
        name: board_name,
        color_scheme: ToCry::DemoData.board_color_scheme(board_name)
      }
      ToCry::Endpoints::Helpers.success_response(env, board_details)
    else
      env.response.status_code = 404
      ToCry::Endpoints::Helpers.error_response(env, "Board not found", 404)
    end
  end

  # Override lanes endpoint for demo mode
  get "/boards/:board_name/lanes" do |env|
    board_name = env.params.url["board_name"].as(String)

    if ToCry::DemoData.board_names.includes?(board_name)
      # Find the board data and return lanes
      sample_board = ToCry::DemoData::SAMPLE_BOARDS.find { |b| b[:name] == board_name }
      if sample_board
        lanes_data = sample_board[:lanes].map_with_index do |lane_data, index|
          {
            name: lane_data[:name],
            position: index,
            notes: lane_data[:notes].map_with_index do |note_data, note_index|
              # Extract note data directly from named tuple
              {
                id: UUID.random.to_s, # Generate random ID for demo
                title: note_data[:title],
                content: note_data[:content],
                tags: note_data.fetch(:tags, [] of String),
                start_date: note_data.fetch(:start_date, nil),
                end_date: note_data.fetch(:end_date, nil),
                priority: note_data.fetch(:priority, nil),
                position: note_index,
                public: false,
                attachments: [] of String
              }
            end
          }
        end

        ToCry::Endpoints::Helpers.success_response(env, lanes_data)
      else
        env.response.status_code = 404
        ToCry::Endpoints::Helpers.error_response(env, "Board data not found", 404)
      end
    else
      env.response.status_code = 404
      ToCry::Endpoints::Helpers.error_response(env, "Board not found", 404)
    end
  end

  # Demo-only response for write operations
  private def self.demo_write_response(env, operation : String)
    ToCry::Endpoints::Helpers.success_response(env, {
      demo_mode: true,
      message: "This is a demo instance. #{operation} are disabled.",
      boards_available: ToCry::DemoData.board_names
    })
  end

  # Override specific write operations to return demo messages
  {% for method in ["post", "put", "delete"] %}
    {{method.id}} "/boards/:board_name" do |env|
      demo_write_response(env, "Board modifications")
    end

    {{method.id}} "/boards/:board_name/lanes" do |env|
      demo_write_response(env, "Lane modifications")
    end

    {{method.id}} "/boards/:board_name/lanes/:lane_name" do |env|
      demo_write_response(env, "Lane modifications")
    end

    {{method.id}} "/boards/:board_name/notes" do |env|
      demo_write_response(env, "Note modifications")
    end

    {{method.id}} "/boards/:board_name/notes/:note_id" do |env|
      demo_write_response(env, "Note modifications")
    end

    {{method.id}} "/boards/:board_name/color-scheme" do |env|
      demo_write_response(env, "Color scheme changes")
    end

    {{method.id}} "/upload" do |env|
      demo_write_response(env, "File uploads")
    end
  {% end %}

  # Serve the main application HTML for board-specific URLs
  get "/b/:board_name" do |env|
    board_name = env.params.url["board_name"].as(String)
    puts "Board route accessed with board_name: #{board_name}"
    render "templates/app.ecr"
  end
end