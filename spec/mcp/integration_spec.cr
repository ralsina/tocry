require "./spec_helper"
require "../../src/mcp/tools/create_board_tool"
require "../../src/mcp/tools/create_note_tool"
require "../../src/mcp/tools/update_note_tool"
require "../../src/mcp/tools/delete_note_tool"
require "../../src/mcp/tools/update_board_tool"
require "../../src/mcp/tools/delete_board_tool"
require "../../src/mcp/tools/list_boards_tool"
require "../../src/mcp/tools/search_notes_tool"
require "../../src/mcp/tools/get_board_tool"
require "../../src/mcp/tools/get_note_tool"

describe "MCP Tools Integration" do
  describe "Complete Kanban Workflow" do
    it "manages full project lifecycle with multiple boards and notes" do
      MCPTestHelpers.setup_test_environment

      begin
        user_id = MCPTestHelpers::TEST_USER_ID

        # Tools we'll use
        create_board = CreateBoardTool.new
        create_note = CreateNoteTool.new
        update_board = UpdateBoardTool.new
        update_note = UpdateNoteTool.new
        list_boards = ListBoardsTool.new
        search = SearchNotesTool.new
        get_board = GetBoardTool.new
        get_note = GetNoteTool.new
        delete_note = DeleteNoteTool.new
        delete_board = DeleteBoardTool.new

        # 1. Create a project board with lanes
        project_name = "web_development_project_#{Time.utc.to_unix}"
        create_board_params = MCPTestHelpers.board_params(project_name, color_scheme: "blue", public: true)
        project_result = create_board.invoke_with_user(create_board_params, user_id)
        MCPTestHelpers.assert_success_response(project_result)

        # Add kanban lanes
        lanes_data = [
          {"name" => "Backlog"},
          {"name" => "Todo"},
          {"name" => "In Progress"},
          {"name" => "Code Review"},
          {"name" => "Testing"},
          {"name" => "Done"},
        ]
        lanes_json = lanes_data.map do |lane|
          JSON::Any.new(lane.transform_values { |v| JSON::Any.new(v) })
        end

        update_board_params = MCPTestHelpers.board_params(project_name)
        update_board_params["lanes"] = JSON::Any.new(lanes_json)
        update_board_result = update_board.invoke_with_user(update_board_params, user_id)
        MCPTestHelpers.assert_success_response(update_board_result)

        # 2. Create multiple notes representing different tasks
        tasks = [
          {
            title:    "Set up project structure",
            lane:     "Todo",
            content:  "Initialize repository, add dependencies, configure build system",
            tags:     ["setup", "infrastructure"],
            priority: "high",
          },
          {
            title:    "Design database schema",
            lane:     "Todo",
            content:  "Create ER diagrams, define tables and relationships",
            tags:     ["design", "database"],
            priority: "high",
          },
          {
            title:    "Implement authentication",
            lane:     "Backlog",
            content:  "User registration, login, JWT tokens",
            tags:     ["security", "backend"],
            priority: "medium",
          },
          {
            title:    "Build REST API",
            lane:     "Backlog",
            content:  "CRUD operations for all entities",
            tags:     ["backend", "api"],
            priority: "medium",
          },
          {
            title:    "Create responsive UI",
            lane:     "Backlog",
            content:  "HTML, CSS, JavaScript frontend",
            tags:     ["frontend", "ui"],
            priority: "medium",
          },
        ]

        created_notes = [] of String
        tasks.each do |task|
          note_params = MCPTestHelpers.note_params(
            project_name,
            task[:lane],
            task[:title],
            content: task[:content],
            tags: task[:tags],
            priority: task[:priority]
          )
          note_result = create_note.invoke_with_user(note_params, user_id)
          MCPTestHelpers.assert_success_response(note_result)
          created_notes << note_result["id"].as_s
        end

        # 3. Verify board state
        get_board_params = MCPTestHelpers.board_params(project_name)
        board_details = get_board.invoke_with_user(get_board_params, user_id)
        MCPTestHelpers.assert_success_response(board_details)
        board_details["lanes"].as_a.size.should eq(6)

        # 4. Search for all high priority tasks
        search_params = MCPTestHelpers.search_params("", priority_filter: "high")
        high_priority_result = search.invoke_with_user(search_params, user_id)
        MCPTestHelpers.assert_success_response(high_priority_result)
        high_priority_result["count"].as_i.should eq(2)

        # 5. Move first task to In Progress
        first_note_id = created_notes[0]
        update_params = MCPTestHelpers.board_params(project_name,
          note_id: first_note_id,
          new_lane_name: "In Progress"
        )
        update_result = update_note.invoke_with_user(update_params, user_id)
        MCPTestHelpers.assert_success_response(update_result)
        update_result["lane_name"].as_s.should eq("In Progress")

        # 6. Work on the task - add progress notes
        progress_params = MCPTestHelpers.board_params(project_name,
          note_id: first_note_id,
          content: "✓ Repository initialized\n✓ Dependencies added\n✓ Build system configured\nNext: Set up CI/CD"
        )
        progress_result = update_note.invoke_with_user(progress_params, user_id)
        MCPTestHelpers.assert_success_response(progress_result)
        progress_result["content"].as_s.should contain("Repository initialized")

        # 7. Search for tasks with "setup" tag
        setup_search_params = MCPTestHelpers.search_params("setup")
        setup_result = search.invoke_with_user(setup_search_params, user_id)
        MCPTestHelpers.assert_success_response(setup_result)
        setup_result["count"].as_i.should eq(1)

        # 8. Move completed task to Done
        done_params = MCPTestHelpers.board_params(project_name,
          note_id: first_note_id,
          new_lane_name: "Done"
        )
        done_result = update_note.invoke_with_user(done_params, user_id)
        MCPTestHelpers.assert_success_response(done_result)
        done_result["lane_name"].as_s.should eq("Done")

        # 9. List all boards to verify our project exists
        list_result = list_boards.invoke_with_user({} of String => JSON::Any, user_id)
        MCPTestHelpers.assert_success_response(list_result)
        list_result["count"].as_i.should eq(1)
        list_result["boards"].as_a.first.as_s.should eq(project_name)

        # 10. Clean up - delete notes first, then board
        created_notes.each do |note_id|
          delete_params = MCPTestHelpers.board_params(project_name, note_id: note_id)
          delete_result = delete_note.invoke_with_user(delete_params, user_id)
          MCPTestHelpers.assert_success_response(delete_result)
        end

        # 11. Delete the board
        delete_board_params = MCPTestHelpers.board_params(project_name)
        delete_board_result = delete_board.invoke_with_user(delete_board_params, user_id)
        MCPTestHelpers.assert_success_response(delete_board_result)

        # 12. Verify everything is cleaned up
        final_list_result = list_boards.invoke_with_user({} of String => JSON::Any, user_id)
        MCPTestHelpers.assert_success_response(final_list_result)
        final_list_result["count"].as_i.should eq(0)
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "handles multi-board project management" do
      MCPTestHelpers.setup_test_environment

      begin
        user_id = MCPTestHelpers::TEST_USER_ID

        # Create multiple project boards
        create_board = CreateBoardTool.new
        update_board = UpdateBoardTool.new
        create_note = CreateNoteTool.new
        search = SearchNotesTool.new
        list_boards = ListBoardsTool.new

        # Board 1: Frontend Development
        frontend_board = "frontend_project_#{Time.utc.to_unix}"
        frontend_create_params = MCPTestHelpers.board_params(frontend_board, color_scheme: "green")
        frontend_result = create_board.invoke_with_user(frontend_create_params, user_id)
        MCPTestHelpers.assert_success_response(frontend_result)

        frontend_lanes = [{"name" => "Design"}, {"name" => "Development"}, {"name" => "Testing"}]
        frontend_lanes_json = frontend_lanes.map do |lane|
          JSON::Any.new(lane.transform_values { |v| JSON::Any.new(v) })
        end
        frontend_update_params = MCPTestHelpers.board_params(frontend_board)
        frontend_update_params["lanes"] = JSON::Any.new(frontend_lanes_json)
        update_board.invoke_with_user(frontend_update_params, user_id)

        # Board 2: Backend Development
        backend_board = "backend_project_#{Time.utc.to_unix}"
        backend_create_params = MCPTestHelpers.board_params(backend_board, color_scheme: "orange")
        backend_result = create_board.invoke_with_user(backend_create_params, user_id)
        MCPTestHelpers.assert_success_response(backend_result)

        backend_lanes = [{"name" => "API Design"}, {"name" => "Implementation"}, {"name" => "Documentation"}]
        backend_lanes_json = backend_lanes.map do |lane|
          JSON::Any.new(lane.transform_values { |v| JSON::Any.new(v) })
        end
        backend_update_params = MCPTestHelpers.board_params(backend_board)
        backend_update_params["lanes"] = JSON::Any.new(backend_lanes_json)
        update_board.invoke_with_user(backend_update_params, user_id)

        # Add tasks to both boards
        frontend_tasks = [
          {title: "Design UI mockups", lane: "Design", tags: ["design", "ui"]},
          {title: "Implement responsive layout", lane: "Development", tags: ["css", "frontend"]},
          {title: "Write unit tests", lane: "Testing", tags: ["testing", "frontend"]},
        ]

        backend_tasks = [
          {title: "Design REST API", lane: "API Design", tags: ["api", "design"]},
          {title: "Implement authentication", lane: "Implementation", tags: ["security", "backend"]},
          {title: "Write API documentation", lane: "Documentation", tags: ["docs", "api"]},
        ]

        all_tasks = [] of String

        frontend_tasks.each do |task|
          note_params = MCPTestHelpers.note_params(frontend_board, task[:lane], task[:title], tags: task[:tags])
          result = create_note.invoke_with_user(note_params, user_id)
          MCPTestHelpers.assert_success_response(result)
          all_tasks << result["id"].as_s
        end

        backend_tasks.each do |task|
          note_params = MCPTestHelpers.note_params(backend_board, task[:lane], task[:title], tags: task[:tags])
          result = create_note.invoke_with_user(note_params, user_id)
          MCPTestHelpers.assert_success_response(result)
          all_tasks << result["id"].as_s
        end

        # Search across all boards for design-related tasks
        design_search_params = MCPTestHelpers.search_params("design")
        design_result = search.invoke_with_user(design_search_params, user_id)
        MCPTestHelpers.assert_success_response(design_result)
        design_result["count"].as_i.should eq(2) # UI mockups + REST API design
        design_result["boards_searched"].as_i.should eq(2)

        # Search only in frontend board
        frontend_search_params = MCPTestHelpers.search_params("", board_name: frontend_board)
        frontend_result = search.invoke_with_user(frontend_search_params, user_id)
        MCPTestHelpers.assert_success_response(frontend_result)
        frontend_result["count"].as_i.should eq(3)
        frontend_result["boards_searched"].as_i.should eq(1)

        # Verify board listing
        list_result = list_boards.invoke_with_user({} of String => JSON::Any, user_id)
        MCPTestHelpers.assert_success_response(list_result)
        list_result["count"].as_i.should eq(2)
        board_names = list_result["boards"].as_a.map(&.as_s)
        board_names.should contain(frontend_board)
        board_names.should contain(backend_board)
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    describe "Error Handling Integration" do
      it "handles cascading failures gracefully" do
        MCPTestHelpers.setup_test_environment

        begin
          user_id = MCPTestHelpers::TEST_USER_ID

          create_board = CreateBoardTool.new
          create_note = CreateNoteTool.new
          update_note = UpdateNoteTool.new
          delete_note = DeleteNoteTool.new

          # Try to create note in non-existent board
          note_params = MCPTestHelpers.note_params("nonexistent_board", "Todo", "Test Note")
          note_result = create_note.invoke_with_user(note_params, user_id)
          MCPTestHelpers.assert_error_response(note_result)

          # Create board successfully
          board_params = MCPTestHelpers.board_params("error_test_board")
          board_result = create_board.invoke_with_user(board_params, user_id)
          MCPTestHelpers.assert_success_response(board_result)

          # Try to update non-existent note
          update_params = MCPTestHelpers.board_params("error_test_board", note_id: "fake-id")
          update_result = update_note.invoke_with_user(update_params, user_id)
          MCPTestHelpers.assert_error_response(update_result)

          # Try to delete non-existent note (should succeed due to idempotency)
          delete_params = MCPTestHelpers.board_params("error_test_board", note_id: "fake-id")
          delete_result = delete_note.invoke_with_user(delete_params, user_id)
          MCPTestHelpers.assert_success_response(delete_result)
        ensure
          MCPTestHelpers.cleanup_test_environment
        end
      end
    end
  end
end
