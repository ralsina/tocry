require "../spec_helper"

TEST_BOARD_PREFIX = "test_board"

describe "Boards API using Generated Client" do
  describe "GET /api/v1/boards" do
    it "should return a list of boards" do
      boards = APITestHelpers.boards_api.get_boards_list

      boards.should be_a(Array(String))
      boards.size.should be >= 0
    end
  end

  describe "POST /api/v1/boards" do
    it "should create a new board" do
      board_name = "#{TEST_BOARD_PREFIX}_#{Time.utc.to_unix}"

      create_request = OpenAPIClient::BoardCreateRequest.new(board_name, nil)
      response = APITestHelpers.boards_api.create_board(create_request)

      response.success.should_not be_nil
    end

    it "should create a board with color scheme" do
      board_name = "#{TEST_BOARD_PREFIX}_color_#{Time.utc.to_unix}"

      create_request = OpenAPIClient::BoardCreateRequest.new(board_name, "purple")
      response = APITestHelpers.boards_api.create_board(create_request)

      response.success.should_not be_nil

      # Verify the board was created with the color scheme
      board_details = APITestHelpers.boards_api.get_board_details(board_name)
      board_details.color_scheme.should eq("purple")
    end
  end

  describe "GET /api/v1/boards/{board_name}" do
    it "should return board details for existing board" do
      # Create a test board for retrieval tests
      board_name = "#{TEST_BOARD_PREFIX}_get_#{Time.utc.to_unix}"
      create_request = OpenAPIClient::BoardCreateRequest.new(board_name, nil)
      APITestHelpers.boards_api.create_board(create_request)

      board = APITestHelpers.boards_api.get_board_details(board_name)

      board.name.should eq(board_name)
      board.lanes.should_not be_nil
    end

    it "should return 404 for non-existent board" do
      expect_raises(OpenAPIClient::ApiError) do
        APITestHelpers.boards_api.get_board_details("nonexistent")
      end
    end
  end

  describe "PUT /api/v1/boards/{board_name}" do
    it "should update an existing board name" do
      # Create a test board for update tests
      original_name = "#{TEST_BOARD_PREFIX}_update_#{Time.utc.to_unix}"
      create_request = OpenAPIClient::BoardCreateRequest.new(original_name, nil)
      APITestHelpers.boards_api.create_board(create_request)

      new_name = "updated_#{original_name}"

      update_request = OpenAPIClient::BoardUpdateRequest.new(
        new_name, nil, nil, nil, nil, nil
      )
      response = APITestHelpers.boards_api.update_board(original_name, update_request)

      response.success.should_not be_nil

      # Verify the name was updated
      updated_board = APITestHelpers.boards_api.get_board_details(new_name)
      updated_board.name.should eq(new_name)
    end

    it "should update board with lanes" do
      # Create a test board first
      original_name = "#{TEST_BOARD_PREFIX}_lanes_#{Time.utc.to_unix}"
      create_request = OpenAPIClient::BoardCreateRequest.new(original_name, nil)
      APITestHelpers.boards_api.create_board(create_request)

      lanes = [
        OpenAPIClient::BoardUpdateRequestLanesInner.new("Todo"),
        OpenAPIClient::BoardUpdateRequestLanesInner.new("In Progress"),
        OpenAPIClient::BoardUpdateRequestLanesInner.new("Done"),
      ]

      update_request = OpenAPIClient::BoardUpdateRequest.new(
        nil, nil, nil, nil, nil, lanes
      )
      response = APITestHelpers.boards_api.update_board(original_name, update_request)

      response.success.should_not be_nil

      # Verify lanes were added
      updated_board = APITestHelpers.boards_api.get_board_details(original_name)
      updated_board.lanes.not_nil!.size.should eq(3)
      lane_names = updated_board.lanes.not_nil!.map(&.name)
      lane_names.should eq(["Todo", "In Progress", "Done"])
    end

    it "should update board color scheme" do
      update_request = OpenAPIClient::BoardUpdateRequest.new(
        nil, nil, nil, "orange", nil, nil
      )
      # Create a test board first
      original_name = "#{TEST_BOARD_PREFIX}_color_scheme_#{Time.utc.to_unix}"
      create_request = OpenAPIClient::BoardCreateRequest.new(original_name, nil)
      APITestHelpers.boards_api.create_board(create_request)

      response = APITestHelpers.boards_api.update_board(original_name, update_request)

      response.success.should_not be_nil

      # Verify color scheme was updated
      updated_board = APITestHelpers.boards_api.get_board_details(original_name)
      updated_board.color_scheme.should eq("orange")
    end
  end

  describe "DELETE /api/v1/boards/{board_name}" do
    it "should delete an existing board" do
      board_name = "#{TEST_BOARD_PREFIX}_delete_#{Time.utc.to_unix}"

      # First create the board
      create_request = OpenAPIClient::BoardCreateRequest.new(board_name, nil)
      APITestHelpers.boards_api.create_board(create_request)

      # Verify it exists
      all_boards_before = APITestHelpers.boards_api.get_boards_list
      all_boards_before.should contain(board_name)

      # Then delete it
      response = APITestHelpers.boards_api.delete_board(board_name)
      response.success.should_not be_nil

      # Verify it's gone
      all_boards_after = APITestHelpers.boards_api.get_boards_list
      all_boards_after.should_not contain(board_name)
    end

    it "should be idempotent - deleting already deleted board should succeed" do
      board_name = "#{TEST_BOARD_PREFIX}_idempotent_#{Time.utc.to_unix}"

      # Create the board
      create_request = OpenAPIClient::BoardCreateRequest.new(board_name, nil)
      APITestHelpers.boards_api.create_board(create_request)

      # Delete it first time
      first_response = APITestHelpers.boards_api.delete_board(board_name)
      first_response.success.should_not be_nil

      # Delete it second time (idempotent)
      second_response = APITestHelpers.boards_api.delete_board(board_name)
      second_response.success.should_not be_nil
    end

    it "should be idempotent - deleting non-existent board should succeed" do
      board_name = "#{TEST_BOARD_PREFIX}_never_existed_#{Time.utc.to_unix}"

      # Try to delete a board that never existed
      response = APITestHelpers.boards_api.delete_board(board_name)
      response.success.should_not be_nil
    end
  end

  describe "Board Management Workflow" do
    it "should handle complete board lifecycle" do
      board_name = "#{TEST_BOARD_PREFIX}_lifecycle_#{Time.utc.to_unix}"

      # 1. Create board with color scheme
      create_request = OpenAPIClient::BoardCreateRequest.new(board_name, "green")
      create_response = APITestHelpers.boards_api.create_board(create_request)
      create_response.success.should_not be_nil

      # 2. Verify board creation
      board = APITestHelpers.boards_api.get_board_details(board_name)
      board.name.should eq(board_name)
      board.color_scheme.should eq("green")
      (board.lanes.nil? || board.lanes.not_nil!.empty?).should be_true

      # 3. Add kanban lanes
      lanes = [
        OpenAPIClient::BoardUpdateRequestLanesInner.new("Backlog"),
        OpenAPIClient::BoardUpdateRequestLanesInner.new("Todo"),
        OpenAPIClient::BoardUpdateRequestLanesInner.new("In Progress"),
        OpenAPIClient::BoardUpdateRequestLanesInner.new("Review"),
        OpenAPIClient::BoardUpdateRequestLanesInner.new("Done"),
      ]
      update_request = OpenAPIClient::BoardUpdateRequest.new(
        nil, 0, false, nil, nil, lanes
      )
      update_response = APITestHelpers.boards_api.update_board(board_name, update_request)
      update_response.success.should_not be_nil

      # 4. Verify lanes were added and first visible lane set
      updated_board = APITestHelpers.boards_api.get_board_details(board_name)
      updated_board.lanes.not_nil!.size.should eq(5)
      updated_board.first_visible_lane.should eq(0)

      # 5. Update color scheme
      color_update_request = OpenAPIClient::BoardUpdateRequest.new(
        nil, nil, true, "red", nil, nil
      )
      color_response = APITestHelpers.boards_api.update_board(board_name, color_update_request)
      color_response.success.should_not be_nil

      # 6. Verify color scheme and show hidden lanes
      final_board = APITestHelpers.boards_api.get_board_details(board_name)
      final_board.color_scheme.should eq("red")
      final_board.show_hidden_lanes.should be_true

      # 7. Delete the board
      delete_response = APITestHelpers.boards_api.delete_board(board_name)
      delete_response.success.should_not be_nil

      # 8. Verify board is deleted
      expect_raises(OpenAPIClient::ApiError) do
        APITestHelpers.boards_api.get_board_details(board_name)
      end
    end
  end

  describe "Error Handling" do
    it "should handle invalid board names gracefully" do
      # Try to create a board with invalid data
      expect_raises(OpenAPIClient::ApiError) do
        # The client should validate the request
        invalid_request = OpenAPIClient::BoardCreateRequest.new("", nil)
        APITestHelpers.boards_api.create_board(invalid_request)
      end
    end

    it "should handle update requests for non-existent boards" do
      expect_raises(OpenAPIClient::ApiError) do
        update_request = OpenAPIClient::BoardUpdateRequest.new(
          "new_name", nil, nil, nil, nil, nil
        )
        APITestHelpers.boards_api.update_board("nonexistent", update_request)
      end
    end
  end
end
