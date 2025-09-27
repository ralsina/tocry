require "sepia"
require "./board"
require "./lane"
require "./note"
require "./user"
require "./board_manager"

module ToCry::Demo
  Log = ::Log.for(self)

  # Maximum file size for demo uploads (64KB)
  MAX_UPLOAD_SIZE = 64 * 1024

  def self.setup_demo_storage
    Log.info { "Configuring in-memory storage for demo mode..." }

    # Configure Sepia to use in-memory backend
    Sepia::Storage.configure(:memory)

    # Seed demo data
    seed_data

    Log.info { "Demo mode storage configured successfully" }
  end

  def self.seed_data
    Log.info { "Seeding demo data..." }

    # Create demo users for different auth modes
    create_demo_users

    # Create demo boards with various features
    create_demo_boards

    Log.info { "Demo data seeded successfully" }
  end

  private def self.create_demo_users
    # Create root user for no-auth/basic-auth modes
    root_user = ToCry::User.new(
      email: "root",
      name: "Demo User",
      provider: "demo",
      is_root: true
    )
    root_user.save

    # Create additional demo users for Google auth simulation
    demo_user = ToCry::User.new(
      email: "demo@example.com",
      name: "Demo User",
      provider: "google"
    )
    demo_user.save

    Log.info { "Created demo users" }
  end

  private def self.create_demo_boards
    # Create a feature demonstration board
    create_feature_demo_board

    # Create a project management board
    create_project_board

    # Create a personal task board
    create_personal_board
  end

  private def self.create_feature_demo_board
    board = ToCry::Board.new("🚀 ToCry Features Demo", color_scheme: "Blue")

    # "Getting Started" lane
    getting_started = board.lane_add("📚 Getting Started")

    welcome_note = getting_started.note_add(
      "Welcome to ToCry!",
      ["welcome", "demo"],
      <<-CONTENT
      Welcome to the ToCry demo! This is an in-memory demonstration of ToCry's features.

      **What you can try:**
      - Create and edit notes
      - Drag notes between lanes
      - Change color schemes
      - Upload small files (limited to 64KB in demo)
      - Set note priorities and dates

      **Note:** This is a demo - your data won't persist when you refresh the page!
      CONTENT
    )
    welcome_note.expanded = true
    welcome_note.save

    features_note = getting_started.note_add(
      "Key Features",
      ["features"],
      <<-CONTENT
      ToCry offers:

      - **Kanban boards** with customizable lanes
      - **Rich text notes** with markdown support
      - **File attachments** and image uploads
      - **Drag & drop** interface
      - **Color themes** per board
      - **Note priorities** and due dates
      - **Public/private** note sharing
      - **Multi-user support** with authentication
      CONTENT
    )
    features_note.priority = ToCry::Priority::High
    features_note.save

    # "Try These" lane
    try_lane = board.lane_add("✨ Try These")

    drag_note = try_lane.note_add(
      "Drag me around!",
      ["interactive"],
      "Try dragging this note to different lanes to see the drag & drop functionality in action."
    )
    drag_note.save

    priority_note = try_lane.note_add(
      "Priority Example",
      ["priority", "example"],
      "This note has a high priority. You can set Low, Medium, or High priorities on notes."
    )
    priority_note.priority = ToCry::Priority::High
    priority_note.save

    date_note = try_lane.note_add(
      "Note with Dates",
      ["dates"],
      "This note has start and end dates to help with project planning."
    )
    date_note.start_date = Time.utc.to_s("%Y-%m-%d")
    date_note.end_date = (Time.utc + 7.days).to_s("%Y-%m-%d")
    date_note.save

    # "Demo Limitations" lane
    limitations_lane = board.lane_add("⚠️  Demo Limitations")

    persistence_note = limitations_lane.note_add(
      "Data Persistence",
      ["demo", "limitation"],
      <<-CONTENT
      In demo mode:

      - All data is stored in memory
      - Data resets when you refresh the page
      - No actual files are stored on disk
      - Upload functionality is simulated

      Install ToCry locally for full persistence!
      CONTENT
    )
    persistence_note.save

    upload_note = limitations_lane.note_add(
      "Upload Limits",
      ["demo", "uploads"],
      "File uploads are limited to 64KB in demo mode and are simulated rather than actually stored."
    )
    upload_note.save

    # "Completed Examples" lane
    done_lane = board.lane_add("✅ Completed")

    done_note = done_lane.note_add(
      "Finished Task",
      ["completed", "example"],
      "This represents a completed task. You can move notes here when they're done!"
    )
    done_note.save

    board.save

    # Register board with BoardManager
    register_demo_board(board, "root")
  end

  private def self.create_project_board
    board = ToCry::Board.new("📋 Project Alpha", color_scheme: "Green")

    # Project lanes
    backlog = board.lane_add("📝 Backlog")
    in_progress = board.lane_add("🔄 In Progress")
    review = board.lane_add("👀 Review")
    done = board.lane_add("✅ Done")

    # Backlog items
    backlog.note_add("User authentication system", ["auth", "backend"], "Implement user login and registration")
    backlog.note_add("Dashboard redesign", ["ui", "frontend"], "Create new dashboard layout")
    backlog.note_add("API documentation", ["docs", "api"], "Document REST API endpoints")

    # In progress
    api_note = in_progress.note_add("Database migration", ["backend", "database"], "Migrate from SQLite to PostgreSQL")
    api_note.priority = ToCry::Priority::High
    api_note.start_date = (Time.utc - 2.days).to_s("%Y-%m-%d")
    api_note.save

    # Review
    review.note_add("Mobile responsive fixes", ["frontend", "mobile"], "Fix responsive design issues on mobile devices")

    # Done
    done.note_add("Project setup", ["setup"], "Initial project configuration and dependencies")
    done.note_add("Development environment", ["devops"], "Docker development environment setup")

    board.save
    register_demo_board(board, "root")
  end

  private def self.create_personal_board
    board = ToCry::Board.new("🏠 Personal Tasks", color_scheme: "Purple")

    # Personal lanes
    today = board.lane_add("📅 Today")
    this_week = board.lane_add("📆 This Week")
    someday = board.lane_add("💭 Someday")
    done = board.lane_add("✅ Done")

    # Today's tasks
    grocery_note = today.note_add("Buy groceries", ["shopping"], "Milk, bread, eggs, vegetables")
    grocery_note.priority = ToCry::Priority::Medium
    grocery_note.save

    workout_note = today.note_add("Morning workout", ["health"], "30-minute cardio session")
    workout_note.start_date = Time.utc.to_s("%Y-%m-%d")
    workout_note.save

    # This week
    this_week.note_add("Doctor appointment", ["health"], "Annual checkup on Thursday")
    this_week.note_add("Update resume", ["career"], "Add recent projects and skills")
    this_week.note_add("Plan weekend trip", ["travel"], "Research destinations and book accommodation")

    # Someday
    someday.note_add("Learn Spanish", ["learning"], "Start with Duolingo or similar app")
    someday.note_add("Organize garage", ["home"], "Sort through old items and donate unused things")
    someday.note_add("Write blog post", ["writing"], "Share learnings from recent project")

    # Done
    done.note_add("Pay bills", ["finance"], "Monthly utility and credit card payments")

    board.save
    register_demo_board(board, "root")
  end

  private def self.register_demo_board(board : ToCry::Board, user_id : String)
    # Create BoardIndex entry
    board_index = ToCry::BoardIndex.new(
      board_uuid: board.sepia_id,
      board_name: board.name,
      owner: user_id
    )
    board_index.save

    # Create BoardReference for the user
    board_ref = ToCry::BoardReference.new(
      user_id: user_id,
      board_name: board.name,
      board_uuid: board.sepia_id
    )
    board_ref.save

    Log.info { "Registered demo board: #{board.name}" }
  end

  # Handle demo file uploads by creating dummy files
  def self.handle_demo_upload(filename : String, content_type : String?, file_size : Int64, uploaded_by : String, upload_type : String = "image") : ToCry::Upload?
    # Check size limit
    if file_size > MAX_UPLOAD_SIZE
      Log.warn { "Demo upload rejected: file size #{file_size} exceeds limit #{MAX_UPLOAD_SIZE}" }
      return nil
    end

    # Create dummy upload metadata
    file_extension = File.extname(filename)
    upload_id = UUID.random.to_s
    relative_path = "uploads/demo/#{upload_id}#{file_extension}"

    upload = ToCry::Upload.new(
      original_filename: filename,
      file_extension: file_extension,
      file_size: file_size,
      upload_type: upload_type,
      uploaded_by: uploaded_by,
      relative_path: relative_path,
      content_type: content_type
    )

    upload.save
    Log.info { "Created demo upload: #{filename} (#{file_size} bytes)" }
    upload
  end

  # Check if we're in demo mode
  def self.demo_mode? : Bool
    Sepia::Storage.backend.is_a?(Sepia::InMemoryStorage)
  end
end
