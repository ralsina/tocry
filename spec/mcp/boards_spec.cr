require "./spec_helper"
require "../../src/mcp/tools/create_board_tool"
require "../../src/mcp/tools/get_board_tool"
require "../../src/mcp/tools/update_board_tool"
require "../../src/mcp/tools/delete_board_tool"
require "../../src/mcp/tools/list_boards_tool"

describe "MCP Board Management Tools" do
  describe "CreateBoardTool" do
    it "creates a basic board" do
      MCPTestHelpers.setup_test_environment

      begin
        tool = CreateBoardTool.new
        params = MCPTestHelpers.board_params("test_board_#{Time.utc.to_unix}")
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["name"].as_s.should contain("test_board_")
        result["public"].as_bool.should be_false
        result["lane_count"].as_i.should eq(0)
        result["total_notes"].as_i.should eq(0)
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "creates a board with color scheme" do
      MCPTestHelpers.setup_test_environment

      begin
        tool = CreateBoardTool.new
        params = MCPTestHelpers.board_params("colored_board", color_scheme: "purple")
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["color_scheme"].as_s.should eq("purple")
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "creates a public board" do
      MCPTestHelpers.setup_test_environment

      begin
        tool = CreateBoardTool.new
        params = MCPTestHelpers.board_params("public_board", public: true)
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["public"].as_bool.should be_true
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "requires authentication" do
      tool = CreateBoardTool.new
      params = MCPTestHelpers.board_params("test_board")

      expect_raises(Exception, "Authentication required") do
        tool.invoke(params)
      end
    end

    it "handles missing required parameter" do
      MCPTestHelpers.setup_test_environment

      begin
        tool = CreateBoardTool.new
        params = {} of String => JSON::Any

        expect_raises(Exception) do
          tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)
        end
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end
  end

  describe "GetBoardTool" do
    it "retrieves existing board details" do
      MCPTestHelpers.setup_test_environment

      begin
        # Create a test board first
        board_name = "get_test_board"
        MCPTestHelpers.create_test_board(board_name, color_scheme: "blue")

        tool = GetBoardTool.new
        params = MCPTestHelpers.board_params(board_name)
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["name"].as_s.should eq(board_name)
        result["color_scheme"].as_s.should eq("blue")
        result["public"].as_bool.should be_false
        result["lanes"].as_a.should be_empty
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "handles non-existent board" do
      MCPTestHelpers.setup_test_environment

      begin
        tool = GetBoardTool.new
        params = MCPTestHelpers.board_params("nonexistent_board")
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_error_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["error"].as_s.should contain("not found")
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "requires authentication" do
      tool = GetBoardTool.new
      params = MCPTestHelpers.board_params("test_board")

      expect_raises(Exception, "Authentication required") do
        tool.invoke(params)
      end
    end
  end

  describe "UpdateBoardTool" do
    it "updates board name" do
      MCPTestHelpers.setup_test_environment

      begin
        # Create a test board first
        original_name = "update_test_board"
        MCPTestHelpers.create_test_board(original_name)

        tool = UpdateBoardTool.new
        params = MCPTestHelpers.board_params(original_name, new_board_name: "updated_board")
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["name"].as_s.should eq("updated_board")

        # Verify the update persisted
        get_tool = GetBoardTool.new
        get_params = MCPTestHelpers.board_params("updated_board")
        get_result = get_tool.invoke_with_user(get_params, MCPTestHelpers::TEST_USER_ID)
        parsed_get_result = MCPTestHelpers.parse_mcp_response(get_result)
        parsed_get_result["name"].as_s.should eq("updated_board")
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "updates board color scheme" do
      MCPTestHelpers.setup_test_environment

      begin
        board_name = "color_update_board"
        MCPTestHelpers.create_test_board(board_name)

        tool = UpdateBoardTool.new
        params = MCPTestHelpers.board_params(board_name, color_scheme: "red")
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["color_scheme"].as_s.should eq("red")
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "toggles board public status" do
      MCPTestHelpers.setup_test_environment

      begin
        board_name = "public_toggle_board"
        MCPTestHelpers.create_test_board(board_name)

        tool = UpdateBoardTool.new

        # Make board public
        public_params = MCPTestHelpers.board_params(board_name, public: true)
        public_result = tool.invoke_with_user(public_params, MCPTestHelpers::TEST_USER_ID)
        MCPTestHelpers.assert_success_response(public_result)
        parsed_public_result = MCPTestHelpers.parse_mcp_response(public_result)
        parsed_public_result["public"].as_bool.should be_true

        # Make board private again
        private_params = MCPTestHelpers.board_params(board_name, public: false)
        private_result = tool.invoke_with_user(private_params, MCPTestHelpers::TEST_USER_ID)
        MCPTestHelpers.assert_success_response(private_result)
        parsed_private_result = MCPTestHelpers.parse_mcp_response(private_result)
        parsed_private_result["public"].as_bool.should be_false
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "updates lanes on board" do
      MCPTestHelpers.setup_test_environment

      begin
        board_name = "lanes_update_board"
        MCPTestHelpers.create_test_board(board_name)

        tool = UpdateBoardTool.new

        # Add lanes
        lanes_data = [
          {"name" => "Todo"},
          {"name" => "In Progress"},
          {"name" => "Done"},
        ]
        lanes_json = lanes_data.map do |lane|
          JSON::Any.new(lane.transform_values { |v| JSON::Any.new(v) })
        end

        params = MCPTestHelpers.board_params(board_name)
        params["lanes"] = JSON::Any.new(lanes_json)

        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)
        MCPTestHelpers.assert_success_response(response)

        # Verify lanes were added
        get_tool = GetBoardTool.new
        get_params = MCPTestHelpers.board_params(board_name)
        get_result = get_tool.invoke_with_user(get_params, MCPTestHelpers::TEST_USER_ID)
        parsed_get_result = MCPTestHelpers.parse_mcp_response(get_result)
        parsed_get_result["lanes"].as_a.size.should eq(3)
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "handles non-existent board" do
      MCPTestHelpers.setup_test_environment

      begin
        tool = UpdateBoardTool.new
        params = MCPTestHelpers.board_params("nonexistent_board", new_board_name: "new_name")
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_error_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["error"].as_s.should contain("not found")
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "requires authentication" do
      tool = UpdateBoardTool.new
      params = MCPTestHelpers.board_params("test_board")

      expect_raises(Exception, "Authentication required") do
        tool.invoke(params)
      end
    end
  end

  describe "DeleteBoardTool" do
    it "deletes existing board" do
      MCPTestHelpers.setup_test_environment

      begin
        # Create a test board first
        board_name = "delete_test_board"
        MCPTestHelpers.create_test_board(board_name)

        # Verify board exists
        get_tool = GetBoardTool.new
        get_params = MCPTestHelpers.board_params(board_name)
        get_result = get_tool.invoke_with_user(get_params, MCPTestHelpers::TEST_USER_ID)
        MCPTestHelpers.assert_success_response(get_result)

        # Delete the board
        delete_tool = DeleteBoardTool.new
        delete_params = MCPTestHelpers.board_params(board_name)
        delete_result = delete_tool.invoke_with_user(delete_params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(delete_result)
        parsed_delete_result = MCPTestHelpers.parse_mcp_response(delete_result)
        parsed_delete_result["message"].as_s.should contain("deleted")

        # Verify board is deleted
        final_get_result = get_tool.invoke_with_user(get_params, MCPTestHelpers::TEST_USER_ID)
        MCPTestHelpers.assert_error_response(final_get_result)
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "is idempotent - deleting already deleted board succeeds" do
      MCPTestHelpers.setup_test_environment

      begin
        board_name = "idempotent_delete_board"
        MCPTestHelpers.create_test_board(board_name)

        delete_tool = DeleteBoardTool.new
        delete_params = MCPTestHelpers.board_params(board_name)

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

    it "is idempotent - deleting non-existent board succeeds" do
      MCPTestHelpers.setup_test_environment

      begin
        tool = DeleteBoardTool.new
        params = MCPTestHelpers.board_params("never_existed_board")
        response = tool.invoke_with_user(params, MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["message"].as_s.should contain("deleted")
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "requires authentication" do
      tool = DeleteBoardTool.new
      params = MCPTestHelpers.board_params("test_board")

      expect_raises(Exception, "Authentication required") do
        tool.invoke(params)
      end
    end
  end

  describe "ListBoardsTool" do
    it "lists empty boards" do
      MCPTestHelpers.setup_test_environment

      begin
        tool = ListBoardsTool.new
        response = tool.invoke_with_user(({} of String => JSON::Any), MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["boards"].as_a.should be_empty
        result["count"].as_i.should eq(0)
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "lists multiple boards" do
      MCPTestHelpers.setup_test_environment

      begin
        # Create multiple test boards
        MCPTestHelpers.create_test_board("board1")
        MCPTestHelpers.create_test_board("board2")
        MCPTestHelpers.create_test_board("board3", color_scheme: "green")

        tool = ListBoardsTool.new
        response = tool.invoke_with_user(({} of String => JSON::Any), MCPTestHelpers::TEST_USER_ID)

        MCPTestHelpers.assert_success_response(response)
        result = MCPTestHelpers.parse_mcp_response(response)
        result["count"].as_i.should eq(3)
        board_summaries = result["boards"].as_a.map { |board_json| BoardSummary.from_json(board_json.to_json) }
        board_names = board_summaries.map(&.name)
        board_names.should contain("board1")
        board_names.should contain("board2")
        board_names.should contain("board3")
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end

    it "requires authentication" do
      tool = ListBoardsTool.new

      expect_raises(Exception, "Authentication required") do
        tool.invoke({} of String => JSON::Any)
      end
    end
  end

  describe "Board Lifecycle Workflow" do
    it "handles complete board lifecycle" do
      MCPTestHelpers.setup_test_environment

      begin
        board_name = "lifecycle_board_#{Time.utc.to_unix}"

        # 1. Create board
        create_tool = CreateBoardTool.new
        create_params = MCPTestHelpers.board_params(board_name, color_scheme: "blue", public: true)
        create_result = create_tool.invoke_with_user(create_params, MCPTestHelpers::TEST_USER_ID)
        MCPTestHelpers.assert_success_response(create_result)

        # 2. Verify creation
        get_tool = GetBoardTool.new
        get_params = MCPTestHelpers.board_params(board_name)
        get_result = get_tool.invoke_with_user(get_params, MCPTestHelpers::TEST_USER_ID)
        MCPTestHelpers.assert_success_response(get_result)
        parsed_get_result = MCPTestHelpers.parse_mcp_response(get_result)
        parsed_get_result["color_scheme"].as_s.should eq("blue")
        parsed_get_result["public"].as_bool.should be_true

        # 3. Update with lanes
        update_tool = UpdateBoardTool.new
        lanes_data = [
          {"name" => "Todo"},
          {"name" => "Done"},
        ]
        lanes_json = lanes_data.map do |lane|
          JSON::Any.new(lane.transform_values { |v| JSON::Any.new(v) })
        end

        update_params = MCPTestHelpers.board_params(board_name)
        update_params["lanes"] = JSON::Any.new(lanes_json)

        update_result = update_tool.invoke_with_user(update_params, MCPTestHelpers::TEST_USER_ID)
        MCPTestHelpers.assert_success_response(update_result)

        # 4. Verify lanes were added
        final_get_result = get_tool.invoke_with_user(get_params, MCPTestHelpers::TEST_USER_ID)
        parsed_final_get_result = MCPTestHelpers.parse_mcp_response(final_get_result)
        parsed_final_get_result["lanes"].as_a.size.should eq(2)

        # 5. Delete board
        delete_tool = DeleteBoardTool.new
        delete_params = MCPTestHelpers.board_params(board_name)
        delete_result = delete_tool.invoke_with_user(delete_params, MCPTestHelpers::TEST_USER_ID)
        MCPTestHelpers.assert_success_response(delete_result)

        # 6. Verify deletion
        final_verification = get_tool.invoke_with_user(get_params, MCPTestHelpers::TEST_USER_ID)
        MCPTestHelpers.assert_error_response(final_verification)
      ensure
        MCPTestHelpers.cleanup_test_environment
      end
    end
  end
end
