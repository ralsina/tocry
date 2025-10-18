require "./spec_helper"
require "../../src/mcp/tools/create_note_tool"
require "../../src/mcp/tools/get_note_tool"
require "../../src/mcp/tools/update_note_tool"
require "../../src/mcp/tools/delete_note_tool"

describe "MCP Note Management Tools" do
  describe "CreateNoteTool" do
    it "creates a basic note" do
      MCPTestHelpers.setup_test_environment

      begin
        # Create a test board with lanes first
        MCPTestHelpers.create_test_board_with_lanes("test_board", ["Todo"])

        tool = CreateNoteTool.new
        params = MCPTestHelpers.note_params("test_board", "Todo", "Test Note #{Time.utc.to_unix}")
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["title"].as_s.should contain("Test Note")
        result["lane_name"].as_s.should eq("Todo")
        result["board_name"].as_s.should eq("test_board")
        result["content"].as_s.should eq("")
        result["public"].as_bool.should be_false
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "creates a note with all properties" do
      MCPTestHelpers.setup_test_environment

      begin
        MCPTestHelpers.create_test_board_with_lanes("test_board", ["Todo", "In Progress"])

        tool = CreateNoteTool.new
        params = MCPTestHelpers.note_params(
          "test_board",
          "Todo",
          "Complete Note #{Time.utc.to_unix}",
          content: "This is a complete note with all properties",
          tags: ["test", "mcp", "complete"],
          priority: "high",
          start_date: "2025-01-01",
          end_date: "2025-01-15",
          public: true
        )
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["content"].as_s.should contain("complete note")

        tags = result["tags"].as_a.map(&.as_s)
        tags.should eq(["test", "mcp", "complete"])

        result["priority"].as_s.should eq("high")
        result["start_date"].as_s.should eq("2025-01-01")
        result["end_date"].as_s.should eq("2025-01-15")
        result["public"].as_bool.should be_true
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "handles non-existent board" do
      MCPTestHelpers.setup_test_environment

      begin
        tool = CreateNoteTool.new
        params = MCPTestHelpers.note_params("nonexistent_board", "Todo", "Test Note")
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_error_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["error"].as_s.should contain("not found")
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "handles non-existent lane" do
      MCPTestHelpers.setup_test_environment

      begin
        MCPTestHelpers.create_test_board("test_board") # No lanes

        tool = CreateNoteTool.new
        params = MCPTestHelpers.note_params("test_board", "NonExistentLane", "Test Note")
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_error_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["error"].as_s.should contain("not found")
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "requires authentication" do
      tool = CreateNoteTool.new
      params = MCPTestHelpers.note_params("test_board", "Todo", "Test Note")

      expect_raises(Exception, "Authentication required") do
        tool.invoke(params)
      end
    end
  end

  describe "GetNoteTool" do
    it "retrieves existing note details" do
      MCPTestHelpers.setup_test_environment

      begin
        # Create a test board and note
        board = MCPTestHelpers.create_test_board_with_lanes("test_board", ["Todo"])
        note = MCPTestHelpers.create_test_note(
          board, "Todo", "Get Test Note",
          content: "Content for get test",
          tags: ["get", "test"],
          priority: "medium"
        )

        tool = GetNoteTool.new
        params = MCPTestHelpers.board_params("test_board", note_id: note.sepia_id)
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["id"].as_s.should eq(note.sepia_id)
        result["title"].as_s.should eq("Get Test Note")
        result["content"].as_s.should eq("Content for get test")
        result["lane_name"].as_s.should eq("Todo")

        tags = result["tags"].as_a.map(&.as_s)
        tags.should eq(["get", "test"])

        result["priority"].as_s.should eq("medium")
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "handles non-existent note" do
      MCPTestHelpers.setup_test_environment

      begin
        MCPTestHelpers.create_test_board_with_lanes("test_board", ["Todo"])

        tool = GetNoteTool.new
        params = MCPTestHelpers.board_params("test_board", note_id: "00000000-0000-0000-0000-000000000000")
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_error_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["error"].as_s.should contain("not found")
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "handles non-existent board" do
      MCPTestHelpers.setup_test_environment

      begin
        tool = GetNoteTool.new
        params = MCPTestHelpers.board_params("nonexistent_board", note_id: "some-note-id")
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_error_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["error"].as_s.should contain("not found")
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "requires authentication" do
      tool = GetNoteTool.new
      params = MCPTestHelpers.board_params("test_board", note_id: "test-note-id")

      expect_raises(Exception, "Authentication required") do
        tool.invoke(params)
      end
    end
  end

  describe "UpdateNoteTool" do
    it "updates note content and properties" do
      MCPTestHelpers.setup_test_environment

      begin
        # Create a test board and note
        board = MCPTestHelpers.create_test_board_with_lanes("test_board", ["Todo", "In Progress"])
        note = MCPTestHelpers.create_test_note(
          board, "Todo", "Original Note",
          content: "Original content",
          priority: "low"
        )

        tool = UpdateNoteTool.new
        params = MCPTestHelpers.board_params("test_board",
          note_id: note.sepia_id,
          title: "Updated Note",
          content: "Updated content with more details",
          priority: "high"
        )
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["title"].as_s.should eq("Updated Note")
        result["content"].as_s.should contain("Updated content")
        result["priority"].as_s.should eq("high")
        result["lane_name"].as_s.should eq("Todo") # Still in same lane
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "moves note between lanes" do
      MCPTestHelpers.setup_test_environment

      begin
        board = MCPTestHelpers.create_test_board_with_lanes("test_board", ["Todo", "In Progress", "Done"])
        note = MCPTestHelpers.create_test_note(board, "Todo", "Move Test Note")

        tool = UpdateNoteTool.new
        params = MCPTestHelpers.board_params("test_board",
          note_id: note.sepia_id,
          new_lane_name: "Done"
        )
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["lane_name"].as_s.should eq("Done")
        result["title"].as_s.should eq("Move Test Note")
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "updates note and moves to different lane" do
      MCPTestHelpers.setup_test_environment

      begin
        board = MCPTestHelpers.create_test_board_with_lanes("test_board", ["Todo", "In Progress"])
        note = MCPTestHelpers.create_test_note(
          board, "Todo", "Move and Update Note",
          content: "Original content",
          tags: ["original"],
          priority: "low"
        )

        tool = UpdateNoteTool.new
        params = MCPTestHelpers.board_params("test_board",
          note_id: note.sepia_id,
          title: "Updated and Moved Note",
          content: "Updated content",
          tags: ["updated", "moved"],
          priority: "high",
          new_lane_name: "In Progress"
        )
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["title"].as_s.should eq("Updated and Moved Note")
        result["content"].as_s.should contain("Updated content")
        result["lane_name"].as_s.should eq("In Progress")
        result["priority"].as_s.should eq("high")

        tags = result["tags"].as_a.map(&.as_s)
        tags.should eq(["updated", "moved"])
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "handles non-existent note" do
      MCPTestHelpers.setup_test_environment

      begin
        MCPTestHelpers.create_test_board_with_lanes("test_board", ["Todo"])

        tool = UpdateNoteTool.new
        params = MCPTestHelpers.board_params("test_board",
          note_id: "00000000-0000-0000-0000-000000000000",
          title: "Updated Title"
        )
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_error_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["error"].as_s.should contain("not found")
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "handles move to non-existent lane" do
      MCPTestHelpers.setup_test_environment

      begin
        board = MCPTestHelpers.create_test_board_with_lanes("test_board", ["Todo"])
        note = MCPTestHelpers.create_test_note(board, "Todo", "Test Note")

        tool = UpdateNoteTool.new
        params = MCPTestHelpers.board_params("test_board",
          note_id: note.sepia_id,
          new_lane_name: "NonExistentLane"
        )
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_error_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["error"].as_s.should contain("not found")
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "requires authentication" do
      tool = UpdateNoteTool.new
      params = MCPTestHelpers.board_params("test_board", note_id: "test-note-id")

      expect_raises(Exception, "Authentication required") do
        tool.invoke(params)
      end
    end
  end

  describe "DeleteNoteTool" do
    it "deletes existing note" do
      MCPTestHelpers.setup_test_environment

      begin
        # Create a test board and note
        board = MCPTestHelpers.create_test_board_with_lanes("test_board", ["Todo"])
        note = MCPTestHelpers.create_test_note(board, "Todo", "Delete Test Note")

        # Verify note exists
        get_tool = GetNoteTool.new
        get_params = MCPTestHelpers.board_params("test_board", note_id: note.sepia_id)
        get_result = get_tool.invoke_with_user(get_params, MCPTestHelpers::TEST_USER_ID)
        MCPTestHelpers.assert_success_response(get_result)

        # Delete the note
        delete_tool = DeleteNoteTool.new
        delete_params = MCPTestHelpers.board_params("test_board", note_id: note.sepia_id)
        delete_result = delete_tool.invoke_with_user(delete_params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(delete_result)
        parsed_delete_result = MCPTestHelpers.parse_mcp_response(delete_result)
        parsed_delete_result["message"].as_s.should contain("deleted successfully")

        # Verify note is deleted
        final_get_result = get_tool.invoke_with_user(get_params, MCPTestHelpers::TEST_USER_ID)
        MCPTestHelpers.assert_error_response(final_get_result)
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "is idempotent - deleting already deleted note succeeds" do
      MCPTestHelpers.setup_test_environment

      begin
        board = MCPTestHelpers.create_test_board_with_lanes("test_board", ["Todo"])
        note = MCPTestHelpers.create_test_note(board, "Todo", "Idempotent Delete Note")

        delete_tool = DeleteNoteTool.new
        delete_params = MCPTestHelpers.board_params("test_board", note_id: note.sepia_id)

        # First deletion
        first_result = delete_tool.invoke_with_user(delete_params, MCPTestHelpers::TEST_USER_ID)
        MCPTestHelpers.assert_success_response(first_result)

        # Second deletion (should still succeed)
        second_result = delete_tool.invoke_with_user(delete_params, MCPTestHelpers::TEST_USER_ID)
        MCPTestHelpers.assert_success_response(second_result)
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "is idempotent - deleting non-existent note succeeds" do
      MCPTestHelpers.setup_test_environment

      begin
        MCPTestHelpers.create_test_board_with_lanes("test_board", ["Todo"])

        tool = DeleteNoteTool.new
        params = MCPTestHelpers.board_params("test_board", note_id: "00000000-0000-0000-0000-000000000000")
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["message"].as_s.should contain("deleted successfully")
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "is idempotent - deleting note from non-existent board succeeds" do
      MCPTestHelpers.setup_test_environment

      begin
        tool = DeleteNoteTool.new
        params = MCPTestHelpers.board_params("nonexistent_board", note_id: "some-note-id")
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["message"].as_s.should contain("deleted successfully")
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "requires authentication" do
      tool = DeleteNoteTool.new
      params = MCPTestHelpers.board_params("test_board", note_id: "test-note-id")

      expect_raises(Exception, "Authentication required") do
        tool.invoke(params)
      end
    end
  end

  describe "Note Lifecycle Workflow" do
    it "handles complete note lifecycle" do
      MCPTestHelpers.setup_test_environment

      begin
        board_name = "lifecycle_board_#{Time.utc.to_unix}"
        MCPTestHelpers.create_test_board_with_lanes(board_name, ["Todo", "In Progress", "Done"])

        # 1. Create note in Todo lane
        create_tool = CreateNoteTool.new
        create_params = MCPTestHelpers.note_params(
          board_name,
          "Todo",
          "Lifecycle Test Note",
          content: "Testing complete note lifecycle",
          tags: ["lifecycle", "test"],
          priority: "medium"
        )
        create_result = create_tool.invoke_with_user(create_params, MCPTestHelpers::TEST_USER_ID)
        MCPTestHelpers.assert_success_response(create_result)
        parsed_create_result = MCPTestHelpers.parse_mcp_response(create_result)
        note_id = parsed_create_result["id"].as_s

        # 2. Verify note creation
        get_tool = GetNoteTool.new
        get_params = MCPTestHelpers.board_params(board_name, note_id: note_id)
        get_result = get_tool.invoke_with_user(get_params, MCPTestHelpers::TEST_USER_ID)
        MCPTestHelpers.assert_success_response(get_result)
        parsed_get_result = MCPTestHelpers.parse_mcp_response(get_result)
        parsed_get_result["lane_name"].as_s.should eq("Todo")
        parsed_get_result["priority"].as_s.should eq("medium")

        # 3. Update note and move to In Progress
        update_tool = UpdateNoteTool.new
        update_params = MCPTestHelpers.board_params(board_name,
          note_id: note_id,
          title: "Lifecycle Test Note - In Progress",
          content: "Note is now in progress",
          priority: "high",
          new_lane_name: "In Progress"
        )
        update_result = update_tool.invoke_with_user(update_params, MCPTestHelpers::TEST_USER_ID)
        MCPTestHelpers.assert_success_response(update_result)

        # 4. Verify note was updated and moved
        updated_get_result = get_tool.invoke_with_user(get_params, MCPTestHelpers::TEST_USER_ID)
        parsed_updated_get_result = MCPTestHelpers.parse_mcp_response(updated_get_result)
        parsed_updated_get_result["lane_name"].as_s.should eq("In Progress")
        parsed_updated_get_result["priority"].as_s.should eq("high")
        parsed_updated_get_result["title"].as_s.should contain("In Progress")

        # 5. Move note to Done lane
        done_update_params = MCPTestHelpers.board_params(board_name,
          note_id: note_id,
          new_lane_name: "Done"
        )
        done_result = update_tool.invoke_with_user(done_update_params, MCPTestHelpers::TEST_USER_ID)
        MCPTestHelpers.assert_success_response(done_result)

        # 6. Verify note is in Done lane
        done_get_result = get_tool.invoke_with_user(get_params, MCPTestHelpers::TEST_USER_ID)
        parsed_done_get_result = MCPTestHelpers.parse_mcp_response(done_get_result)
        parsed_done_get_result["lane_name"].as_s.should eq("Done")

        # 7. Delete the note
        delete_tool = DeleteNoteTool.new
        delete_params = MCPTestHelpers.board_params(board_name, note_id: note_id)
        delete_result = delete_tool.invoke_with_user(delete_params, MCPTestHelpers::TEST_USER_ID)
        MCPTestHelpers.assert_success_response(delete_result)

        # 8. Verify note is deleted
        final_get_result = get_tool.invoke_with_user(get_params, MCPTestHelpers::TEST_USER_ID)
        MCPTestHelpers.assert_error_response(final_get_result)
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end
  end
end
