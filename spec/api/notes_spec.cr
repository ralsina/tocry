require "../spec_helper"

NOTES_TEST_BOARD = "notes_test_board"

describe "Notes API using Generated Client" do
  before_each do
    # Clean up any existing test board
    begin
      APITestHelpers.boards_api.delete_board(NOTES_TEST_BOARD)
    rescue
      # Board doesn't exist, which is fine
    end

    # Create a test board for note tests
    create_request = OpenAPIClient::BoardCreateRequest.new(NOTES_TEST_BOARD, nil)
    APITestHelpers.boards_api.create_board(create_request)

    # Add lanes to the board
    lanes = [
      OpenAPIClient::BoardUpdateRequestLanesInner.new("Todo"),
      OpenAPIClient::BoardUpdateRequestLanesInner.new("In Progress"),
      OpenAPIClient::BoardUpdateRequestLanesInner.new("Done"),
    ]
    update_request = OpenAPIClient::BoardUpdateRequest.new(
      nil, nil, nil, nil, lanes
    )
    APITestHelpers.boards_api.update_board(NOTES_TEST_BOARD, update_request)
  end

  after_each do
    # Clean up test board
    APITestHelpers.boards_api.delete_board(NOTES_TEST_BOARD)
  end

  describe "POST /api/v1/boards/{board_name}/note" do
    it "should create a new note in Todo lane" do
      # Create note using the generated request model
      note = OpenAPIClient::NoteData.new(
        "Test Note #{Time.utc.to_unix}",
        "This is a test note created via API",
        nil, nil, nil, nil, nil, nil, "high"
      )

      create_request = OpenAPIClient::NoteCreateRequest.new("Todo", note)

      response = APITestHelpers.notes_api.create_note(NOTES_TEST_BOARD, create_request)
      response.success.should_not be_nil

      # Verify note was created by checking board state
      board = APITestHelpers.boards_api.get_board_details(NOTES_TEST_BOARD)
      todo_lane = board.lanes.not_nil!.find(&.name.==("Todo"))
      todo_lane.not_nil!.notes.not_nil!.should_not be_empty

      created_note = todo_lane.not_nil!.notes.not_nil!.first
      created_note.title.not_nil!.should contain("Test Note")
      created_note.priority.should eq("high")
    end

    it "should create a note with all properties" do
      tags = ["test", "generated-client", "api"]
      note = OpenAPIClient::NoteData.new(
        "Complete Note #{Time.utc.to_unix}",
        "This is a complete test note with all properties",
        tags, true, false, nil,
        "2025-01-01", "2025-01-15", "medium"
      )

      create_request = OpenAPIClient::NoteCreateRequest.new("In Progress", note)

      response = APITestHelpers.notes_api.create_note(NOTES_TEST_BOARD, create_request)
      response.success.should_not be_nil

      # Verify all properties were set correctly
      board = APITestHelpers.boards_api.get_board_details(NOTES_TEST_BOARD)
      in_progress_lane = board.lanes.not_nil!.find(&.name.==("In Progress"))
      created_note = in_progress_lane.not_nil!.notes.not_nil!.first

      created_note.title.not_nil!.should contain("Complete Note")
      created_note.content.not_nil!.should contain("complete test note")
      created_note.tags.should eq(tags)
      created_note.expanded.should be_true
      created_note.public.should be_false
      created_note.priority.should eq("medium")
      created_note.start_date.should eq("2025-01-01")
      created_note.end_date.should eq("2025-01-15")
    end
  end

  describe "PUT /api/v1/boards/{board_name}/note/{note_id}" do
    it "should update an existing note" do
      # First create a note to update
      note = OpenAPIClient::NoteData.new(
        "Original Note #{Time.utc.to_unix}",
        "Original content",
        nil, nil, nil, nil, nil, nil, "low"
      )

      create_request = OpenAPIClient::NoteCreateRequest.new("Todo", note)

      APITestHelpers.notes_api.create_note(NOTES_TEST_BOARD, create_request)

      # Get the note ID
      board = APITestHelpers.boards_api.get_board_details(NOTES_TEST_BOARD)
      todo_lane = board.lanes.not_nil!.find(&.name.==("Todo"))
      note_id = todo_lane.not_nil!.notes.not_nil!.first.sepia_id.not_nil!

      # Update the note
      updated_note = OpenAPIClient::NoteData.new(
        "Updated Note #{Time.utc.to_unix}",
        "Updated content with more details",
        nil, nil, nil, nil, nil, nil, "high"
      )

      update_request = OpenAPIClient::NoteUpdateRequest.new(
        updated_note, "In Progress", 0
      )

      response = APITestHelpers.notes_api.update_note(NOTES_TEST_BOARD, note_id, update_request)
      response.success.should_not be_nil

      # Verify the note was updated and moved
      updated_board = APITestHelpers.boards_api.get_board_details(NOTES_TEST_BOARD)
      in_progress_lane = updated_board.lanes.not_nil!.find(&.name.==("In Progress"))
      updated_note = in_progress_lane.not_nil!.notes.not_nil!.first

      updated_note.title.not_nil!.should contain("Updated Note")
      updated_note.content.not_nil!.should contain("Updated content")
      updated_note.priority.should eq("high")
      updated_board.lanes.not_nil!.find!(&.name.==("Todo")).notes.not_nil!.should be_empty
    end
  end

  describe "DELETE /api/v1/boards/{board_name}/note/{note_id}" do
    it "should delete an existing note" do
      # First create a note to delete
      note = OpenAPIClient::NoteData.new(
        "Delete Test Note #{Time.utc.to_unix}",
        "This note will be deleted",
        nil, nil, nil, nil, nil, nil, nil
      )

      create_request = OpenAPIClient::NoteCreateRequest.new("Todo", note)

      APITestHelpers.notes_api.create_note(NOTES_TEST_BOARD, create_request)

      # Get the note ID
      board = APITestHelpers.boards_api.get_board_details(NOTES_TEST_BOARD)
      todo_lane = board.lanes.not_nil!.find(&.name.==("Todo"))
      note_id = todo_lane.not_nil!.notes.not_nil!.first.sepia_id.not_nil!

      # Verify note exists before deletion
      todo_lane.not_nil!.notes.not_nil!.size.should eq(1)

      # Delete the note
      response = APITestHelpers.notes_api.delete_note(NOTES_TEST_BOARD, note_id)
      response.success.should_not be_nil

      # Verify note was deleted
      updated_board = APITestHelpers.boards_api.get_board_details(NOTES_TEST_BOARD)
      updated_todo_lane = updated_board.lanes.not_nil!.find(&.name.==("Todo"))
      updated_todo_lane.not_nil!.notes.not_nil!.should be_empty
    end

    it "should be idempotent - deleting already deleted note should succeed" do
      # First create a note to delete
      note = OpenAPIClient::NoteData.new(
        "Idempotent Test Note #{Time.utc.to_unix}",
        "This note will be deleted twice",
        nil, nil, nil, nil, nil, nil, nil
      )

      create_request = OpenAPIClient::NoteCreateRequest.new("Todo", note)

      APITestHelpers.notes_api.create_note(NOTES_TEST_BOARD, create_request)

      # Get the note ID
      board = APITestHelpers.boards_api.get_board_details(NOTES_TEST_BOARD)
      note_id = board.lanes.not_nil!.find!(&.name.==("Todo")).notes.not_nil!.first.sepia_id.not_nil!

      # Delete it first time
      first_response = APITestHelpers.notes_api.delete_note(NOTES_TEST_BOARD, note_id)
      first_response.success.should_not be_nil

      # Delete it second time (idempotent)
      second_response = APITestHelpers.notes_api.delete_note(NOTES_TEST_BOARD, note_id)
      second_response.success.should_not be_nil
    end

    it "should be idempotent - deleting non-existent note should succeed" do
      # Try to delete a note that never existed (using a fake UUID)
      fake_note_id = "00000000-0000-0000-0000-000000000000"

      response = APITestHelpers.notes_api.delete_note(NOTES_TEST_BOARD, fake_note_id)
      response.success.should_not be_nil
    end
  end

  describe "Note Management Workflow" do
    it "should handle complete note lifecycle" do
      # 1. Create note in Todo lane
      note = OpenAPIClient::NoteData.new(
        "Workflow Test #{Time.utc.to_unix}",
        "Testing complete note lifecycle",
        ["workflow", "test"], nil, nil, nil, nil, nil, "medium"
      )

      create_request = OpenAPIClient::NoteCreateRequest.new("Todo", note)

      create_response = APITestHelpers.notes_api.create_note(NOTES_TEST_BOARD, create_request)
      create_response.success.should_not be_nil

      # 2. Verify note was created
      board = APITestHelpers.boards_api.get_board_details(NOTES_TEST_BOARD)
      todo_lane = board.lanes.not_nil!.find(&.name.==("Todo"))
      note_id = todo_lane.not_nil!.notes.not_nil!.first.sepia_id.not_nil!
      original_note = todo_lane.not_nil!.notes.not_nil!.first

      original_note.title.not_nil!.should contain("Workflow Test")
      original_note.priority.should eq("medium")

      # 3. Move note to In Progress lane and update content
      updated_note = OpenAPIClient::NoteData.new(
        "Workflow Test - In Progress #{Time.utc.to_unix}",
        "Note is now in progress - updated content",
        nil, nil, nil, nil, nil, nil, "high"
      )

      update_request = OpenAPIClient::NoteUpdateRequest.new(
        updated_note, "In Progress", 0
      )

      update_response = APITestHelpers.notes_api.update_note(NOTES_TEST_BOARD, note_id, update_request)
      update_response.success.should_not be_nil

      # 4. Verify note was moved and updated
      updated_board = APITestHelpers.boards_api.get_board_details(NOTES_TEST_BOARD)
      in_progress_lane = updated_board.lanes.not_nil!.find(&.name.==("In Progress"))
      fetched_note = in_progress_lane.not_nil!.notes.not_nil!.first

      fetched_note.title.not_nil!.should contain("In Progress")
      fetched_note.content.not_nil!.should contain("in progress")
      fetched_note.priority.should eq("high")

      # 5. Move note to Done lane
      done_note = OpenAPIClient::NoteData.new(
        fetched_note.title.not_nil!,
        fetched_note.content,
        nil, nil, nil, nil, nil, nil, "high"
      )

      done_update_request = OpenAPIClient::NoteUpdateRequest.new(
        done_note, "Done", 0
      )

      done_response = APITestHelpers.notes_api.update_note(NOTES_TEST_BOARD, note_id, done_update_request)
      done_response.success.should_not be_nil

      # 6. Verify note is in Done lane
      final_board = APITestHelpers.boards_api.get_board_details(NOTES_TEST_BOARD)
      done_lane = final_board.lanes.not_nil!.find(&.name.==("Done"))
      done_lane.not_nil!.notes.not_nil!.size.should eq(1)

      # 7. Delete the note
      delete_response = APITestHelpers.notes_api.delete_note(NOTES_TEST_BOARD, note_id)
      delete_response.success.should_not be_nil

      # 8. Verify note is deleted
      final_board_after_delete = APITestHelpers.boards_api.get_board_details(NOTES_TEST_BOARD)
      done_lane_after_delete = final_board_after_delete.lanes.not_nil!.find(&.name.==("Done"))
      done_lane_after_delete.not_nil!.notes.not_nil!.should be_empty
    end
  end

  describe "Error Handling" do
    it "should reject notes with empty titles" do
      # The API should reject notes with empty titles
      expect_raises(OpenAPIClient::ApiError) do
        invalid_note = OpenAPIClient::NoteData.new(
          "",
          "Some content",
          nil, nil, nil, nil, nil, nil, nil
        )

        invalid_request = OpenAPIClient::NoteCreateRequest.new("Todo", invalid_note)
        APITestHelpers.notes_api.create_note(NOTES_TEST_BOARD, invalid_request)
      end
    end

    it "should handle updates for non-existent notes" do
      fake_note_id = "00000000-0000-0000-0000-000000000000"

      expect_raises(OpenAPIClient::ApiError) do
        update_note = OpenAPIClient::NoteData.new(
          "Updated",
          nil, nil, nil, nil, nil, nil, nil, nil
        )
        update_request = OpenAPIClient::NoteUpdateRequest.new(
          update_note, nil, 0
        )
        APITestHelpers.notes_api.update_note(NOTES_TEST_BOARD, fake_note_id, update_request)
      end
    end
  end
end
