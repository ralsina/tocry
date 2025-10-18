require "./spec_helper"
require "../../src/mcp/tools/search_notes_tool"

describe "MCP Search Tools" do
  describe "SearchNotesTool" do
    it "searches empty boards" do
      MCPTestHelpers.setup_test_environment

      begin
        tool = SearchNotesTool.new
        params = MCPTestHelpers.search_params("test query")
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["results"].as_a.should be_empty
        result["count"].as_i.should eq(0)
        result["query"].as_s.should eq("test query")
        result["boards_searched"].as_i.should eq(0)
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "finds notes by title" do
      MCPTestHelpers.setup_test_environment

      begin
        # Create test boards and notes
        board1 = MCPTestHelpers.create_test_board_with_lanes("board1", ["Todo"])
        board2 = MCPTestHelpers.create_test_board_with_lanes("board2", ["Done"])

        MCPTestHelpers.create_test_note(board1, "Todo", "Important Task")
        MCPTestHelpers.create_test_note(board2, "Done", "Regular Task")
        MCPTestHelpers.create_test_note(board1, "Todo", "Another Important Item")

        tool = SearchNotesTool.new
        params = MCPTestHelpers.search_params("Important")
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["count"].as_i.should eq(2)
        result["boards_searched"].as_i.should eq(2)

        titles = result["results"].as_a.map(&.["title"].as_s)
        titles.should contain("Important Task")
        titles.should contain("Another Important Item")
        titles.should_not contain("Regular Task")
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "finds notes by content" do
      MCPTestHelpers.setup_test_environment

      begin
        board = MCPTestHelpers.create_test_board_with_lanes("search_board", ["Todo"])
        MCPTestHelpers.create_test_note(board, "Todo", "Task 1", content: "This is about database migration")
        MCPTestHelpers.create_test_note(board, "Todo", "Task 2", content: "Regular development task")
        MCPTestHelpers.create_test_note(board, "Todo", "Task 3", content: "Database performance optimization")

        tool = SearchNotesTool.new
        params = MCPTestHelpers.search_params("database")
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["count"].as_i.should eq(2)

        titles = result["results"].as_a.map(&.["title"].as_s)
        titles.should contain("Task 1")
        titles.should contain("Task 3")
        titles.should_not contain("Task 2")
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "finds notes by tags" do
      MCPTestHelpers.setup_test_environment

      begin
        board = MCPTestHelpers.create_test_board_with_lanes("tag_board", ["Todo"])
        MCPTestHelpers.create_test_note(board, "Todo", "Bug Fix", tags: ["bug", "urgent"])
        MCPTestHelpers.create_test_note(board, "Todo", "Feature", tags: ["feature", "enhancement"])
        MCPTestHelpers.create_test_note(board, "Todo", "Urgent Task", tags: ["urgent", "priority"])

        tool = SearchNotesTool.new
        params = MCPTestHelpers.search_params("urgent")
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["count"].as_i.should eq(2)

        titles = result["results"].as_a.map(&.["title"].as_s)
        titles.should contain("Bug Fix")
        titles.should contain("Urgent Task")
        titles.should_not contain("Feature")
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "searches within specific board" do
      MCPTestHelpers.setup_test_environment

      begin
        board1 = MCPTestHelpers.create_test_board_with_lanes("project1", ["Todo"])
        board2 = MCPTestHelpers.create_test_board_with_lanes("project2", ["Todo"])

        MCPTestHelpers.create_test_note(board1, "Todo", "API Development")
        MCPTestHelpers.create_test_note(board2, "Todo", "API Documentation")

        tool = SearchNotesTool.new
        params = MCPTestHelpers.search_params("API", board_name: "project1")
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["count"].as_i.should eq(1)
        result["boards_searched"].as_i.should eq(1)

        result["results"].as_a.first["title"].as_s.should eq("API Development")
        result["results"].as_a.first["board_name"].as_s.should eq("project1")
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "filters by priority" do
      MCPTestHelpers.setup_test_environment

      begin
        board = MCPTestHelpers.create_test_board_with_lanes("priority_board", ["Todo"])
        MCPTestHelpers.create_test_note(board, "Todo", "High Priority Task", priority: "high")
        MCPTestHelpers.create_test_note(board, "Todo", "Medium Priority Task", priority: "medium")
        MCPTestHelpers.create_test_note(board, "Todo", "Low Priority Task", priority: "low")
        MCPTestHelpers.create_test_note(board, "Todo", "Another High Task", priority: "high")

        tool = SearchNotesTool.new
        params = MCPTestHelpers.search_params("Task", priority_filter: "high")
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["count"].as_i.should eq(2)

        priorities = result["results"].as_a.map(&.["priority"].as_s)
        priorities.all? { |priority| priority == "high" }.should be_true

        titles = result["results"].as_a.map(&.["title"].as_s)
        titles.should contain("High Priority Task")
        titles.should contain("Another High Task")
        titles.should_not contain("Medium Priority Task")
        titles.should_not contain("Low Priority Task")
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "applies result limit" do
      MCPTestHelpers.setup_test_environment

      begin
        board = MCPTestHelpers.create_test_board_with_lanes("limit_board", ["Todo"])
        5.times do |i|
          MCPTestHelpers.create_test_note(board, "Todo", "Task #{i} - Important", content: "Important content")
        end

        tool = SearchNotesTool.new
        params = MCPTestHelpers.search_params("Important", limit: 3)
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["count"].as_i.should eq(3) # Limited to 3 results
        result["results"].as_a.size.should eq(3)
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "searches across multiple boards" do
      MCPTestHelpers.setup_test_environment

      begin
        # Create multiple boards
        board1 = MCPTestHelpers.create_test_board_with_lanes("work", ["Todo", "In Progress"])
        board2 = MCPTestHelpers.create_test_board_with_lanes("personal", ["Todo", "Done"])
        board3 = MCPTestHelpers.create_test_board_with_lanes("learning", ["Todo"])

        # Add notes to different boards
        MCPTestHelpers.create_test_note(board1, "Todo", "Work Task 1", content: "Important project deadline")
        MCPTestHelpers.create_test_note(board1, "In Progress", "Work Task 2", content: "Another important task")
        MCPTestHelpers.create_test_note(board2, "Todo", "Personal Task", content: "Important personal goal")
        MCPTestHelpers.create_test_note(board3, "Todo", "Learning Task", content: "Important learning objective")

        tool = SearchNotesTool.new
        params = MCPTestHelpers.search_params("important")
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["count"].as_i.should eq(4)
        result["boards_searched"].as_i.should eq(3)

        # Verify all boards are represented
        board_names = result["results"].as_a.map(&.["board_name"].as_s).uniq!
        board_names.should contain("work")
        board_names.should contain("personal")
        board_names.should contain("learning")
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "includes all note properties in results" do
      MCPTestHelpers.setup_test_environment

      begin
        board = MCPTestHelpers.create_test_board_with_lanes("properties_board", ["Todo"])
        MCPTestHelpers.create_test_note(
          board, "Todo", "Complete Note",
          content: "Note with all properties",
          tags: ["complete", "test"],
          priority: "high",
          start_date: "2025-01-01",
          end_date: "2025-01-15",
          public: true
        )

        tool = SearchNotesTool.new
        params = MCPTestHelpers.search_params("Complete")
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["count"].as_i.should eq(1)

        result_data = result["results"].as_a.first
        result_data["title"].as_s.should eq("Complete Note")
        result_data["content"].as_s.should contain("all properties")
        result_data["board_name"].as_s.should eq("properties_board")
        result_data["lane_name"].as_s.should eq("Todo")
        result_data["priority"].as_s.should eq("high")
        result_data["start_date"].as_s.should eq("2025-01-01")
        result_data["end_date"].as_s.should eq("2025-01-15")
        result_data["public"].as_bool.should be_true

        tags = result_data["tags"].as_a.map(&.as_s)
        tags.should eq(["complete", "test"])
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "handles case insensitive search" do
      MCPTestHelpers.setup_test_environment

      begin
        board = MCPTestHelpers.create_test_board_with_lanes("case_board", ["Todo"])
        MCPTestHelpers.create_test_note(board, "Todo", "DATABASE Migration", content: "Important database work")
        MCPTestHelpers.create_test_note(board, "Todo", "Database Design", content: "Designing the database schema")
        MCPTestHelpers.create_test_note(board, "Todo", "API Work", content: "REST API development")

        # Search with different case
        tool = SearchNotesTool.new
        params_lower = MCPTestHelpers.search_params("database")
        result_lower = tool.invoke_with_user(params_lower, MCPTestHelpers::TEST_USER_ID)

        params_upper = MCPTestHelpers.search_params("DATABASE")
        result_upper = tool.invoke_with_user(params_upper, MCPTestHelpers::TEST_USER_ID)

        params_mixed = MCPTestHelpers.search_params("DaTaBaSe")
        result_mixed = tool.invoke_with_user(params_mixed, MCPTestHelpers::TEST_USER_ID)

        # All should find the same results
        [result_lower, result_upper, result_mixed].each do |response|
          MCPTestHelpers.assert_success_response(response)
          result = MCPTestHelpers.parse_mcp_response(response)
          result["count"].as_i.should eq(2)
          titles = result["results"].as_a.map(&.["title"].as_s)
          titles.should contain("DATABASE Migration")
          titles.should contain("Database Design")
          titles.should_not contain("API Work")
        end
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "handles search in non-existent board" do
      MCPTestHelpers.setup_test_environment

      begin
        tool = SearchNotesTool.new
        params = MCPTestHelpers.search_params("test", board_name: "nonexistent_board")
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["results"].as_a.should be_empty
        result["count"].as_i.should eq(0)
        result["boards_searched"].as_i.should eq(0)
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "requires authentication" do
      tool = SearchNotesTool.new
      params = MCPTestHelpers.search_params("test")

      expect_raises(Exception, "Authentication required") do
        tool.invoke(params)
      end
    end

    it "handles invalid priority filter" do
      MCPTestHelpers.setup_test_environment

      begin
        board = MCPTestHelpers.create_test_board_with_lanes("invalid_board", ["Todo"])
        MCPTestHelpers.create_test_note(board, "Todo", "Test Note")

        tool = SearchNotesTool.new
        params = MCPTestHelpers.search_params("test", priority_filter: "invalid_priority")
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        # Should return no results since no notes match invalid priority
        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["results"].as_a.should be_empty
        result["count"].as_i.should eq(0)
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end
  end

  describe "Search Workflow Tests" do
    it "handles complex search scenarios" do
      MCPTestHelpers.setup_test_environment

      begin
        # Setup complex test data
        work_board = MCPTestHelpers.create_test_board_with_lanes("work_project", ["Todo", "In Progress", "Done"])
        personal_board = MCPTestHelpers.create_test_board_with_lanes("personal_tasks", ["Todo", "Done"])

        # Work tasks with different priorities and properties
        MCPTestHelpers.create_test_note(
          work_board, "Todo", "Fix Production Bug",
          content: "Critical bug in authentication system",
          tags: ["bug", "production", "urgent"],
          priority: "high",
          start_date: "2025-01-10",
          end_date: "2025-01-12"
        )

        MCPTestHelpers.create_test_note(
          work_board, "In Progress", "Implement User Dashboard",
          content: "Build responsive dashboard with charts",
          tags: ["feature", "frontend", "dashboard"],
          priority: "medium",
          start_date: "2025-01-15",
          end_date: "2025-01-25"
        )

        MCPTestHelpers.create_test_note(
          work_board, "Done", "Update API Documentation",
          content: "Document new REST endpoints",
          tags: ["documentation", "api"],
          priority: "low"
        )

        # Personal tasks
        MCPTestHelpers.create_test_note(
          personal_board, "Todo", "Learn Crystal Programming",
          content: "Study Crystal language fundamentals",
          tags: ["learning", "crystal", "programming"],
          priority: "medium"
        )

        MCPTestHelpers.create_test_note(
          personal_board, "Todo", "Exercise Routine",
          content: "Daily 30-minute workout",
          tags: ["health", "fitness"],
          priority: "high"
        )

        tool = SearchNotesTool.new

        # Test 1: Search for high priority items across all boards
        high_priority_params = MCPTestHelpers.search_params("", priority_filter: "high")
        high_response = tool.invoke_with_user(high_priority_params, MCPTestHelpers::TEST_USER_ID)
        high_result = MCPTestHelpers.parse_mcp_response(high_response)
        high_result["count"].as_i.should eq(2)

        # Test 2: Search for API-related content
        api_params = MCPTestHelpers.search_params("api")
        api_response = tool.invoke_with_user(api_params, MCPTestHelpers::TEST_USER_ID)
        api_result = MCPTestHelpers.parse_mcp_response(api_response)
        api_result["count"].as_i.should eq(1) # only documentation matches "api"

        # Test 3: Search for learning-related items
        learning_params = MCPTestHelpers.search_params("learning")
        learning_response = tool.invoke_with_user(learning_params, MCPTestHelpers::TEST_USER_ID)
        learning_result = MCPTestHelpers.parse_mcp_response(learning_response)
        learning_result["count"].as_i.should eq(1)
        learning_result["results"].as_a.first["title"].as_s.should contain("Learn Crystal")

        # Test 4: Search only in work board
        work_params = MCPTestHelpers.search_params("dashboard", board_name: "work_project")
        work_response = tool.invoke_with_user(work_params, MCPTestHelpers::TEST_USER_ID)
        work_result = MCPTestHelpers.parse_mcp_response(work_response)
        work_result["count"].as_i.should eq(1)
        work_result["boards_searched"].as_i.should eq(1)

        # Test 5: Search with limit
        limited_params = MCPTestHelpers.search_params("", limit: 3)
        limited_response = tool.invoke_with_user(limited_params, MCPTestHelpers::TEST_USER_ID)
        limited_result = MCPTestHelpers.parse_mcp_response(limited_response)
        limited_result["count"].as_i.should eq(3) # Limited to 3 results
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end
  end
end
