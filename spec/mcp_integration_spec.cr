require "./spec_helper"
require "model_context_protocol"
require "../src/mcp/tools/list_boards_tool"

describe "MCP Integration" do
  test_user_id = "test_user"
  test_data_dir = "/tmp/tocry-mcp-test"

  before_each do
    # Clean up and create test data directory
    FileUtils.rm_rf(test_data_dir) if Dir.exists?(test_data_dir)
    FileUtils.mkdir_p(test_data_dir)

    # Initialize ToCry with test data directory
    ToCry.data_directory = test_data_dir
    ToCry.board_manager = ToCry::Initialization.setup_data_environment(test_data_dir, false, true, false)
  end

  after_each do
    # Clean up test data directory
    FileUtils.rm_rf(test_data_dir) if Dir.exists?(test_data_dir)
  end

  describe "MCP Tools" do
    it "list_boards_tool works with empty boards" do
      tool = ListBoardsTool.new
      response = tool.invoke_with_user({} of String => JSON::Any, test_user_id)
      result = JSON.parse(response)

      result["boards"].as_a.should be_empty
      result["count"].as_i.should eq(0)
    end

    it "list_boards_tool requires authentication" do
      tool = ListBoardsTool.new

      expect_raises(Exception, "Authentication required") do
        tool.invoke({} of String => JSON::Any)
      end
    end
  end

  describe "MCP Tool Authentication" do
    it "requires authentication for all tool invocations" do
      # Test that tools require authentication by checking invoke method raises error
      list_tool = ListBoardsTool.new

      expect_raises(Exception, "Authentication required") do
        list_tool.invoke({} of String => JSON::Any)
      end
    end

    it "works with authenticated user" do
      list_tool = ListBoardsTool.new
      response = list_tool.invoke_with_user({} of String => JSON::Any, "authenticated_user")
      result = JSON.parse(response)

      result["boards"].as_a.should be_empty
      result["count"].as_i.should eq(0)
    end
  end
end
