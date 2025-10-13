require "./spec_helper"
require "file_utils"

describe ToCry::Board do
  describe "File Persistence" do
    data_dir = "test_data_board"

    before_each do
      FileUtils.rm_rf(data_dir)
      FileUtils.mkdir_p(data_dir)
    end

    after_each do
      FileUtils.rm_rf(data_dir)
    end

    it "saves a board and can be loaded back (round-trip)" do
      # 1. Create original board and populate it
      FileUtils.mkdir_p(data_dir)
      original_board = ToCry::Board.load("foo", data_dir)

      lane1 = original_board.lane_add("To Do")
      note1_2 = lane1.note_add("Task 2", ["tag2"], "Content 2") # Added first, will be at index 1
      note1_1 = lane1.note_add("Task 1", ["tag1"], "Content 1") # Added second, will be at index 0

      lane2 = original_board.lane_add("In Progress")
      note2_1 = lane2.note_add("Task 3", ["tag3"], "Content 3")

      original_board.lane_add("Done") # An empty lane

      # Create an extra directory to test cleanup of orphaned lanes
      FileUtils.mkdir_p(File.join(data_dir, "lanes", "9999_Orphaned"))

      # 2. Save the board
      original_board.save(data_dir)

      # Check that the orphaned directory was removed by the save operation
      Dir.exists?(File.join(data_dir, "lanes", "9999_Orphaned")).should be_false

      # 3. Create a new board and load from disk
      loaded_board = ToCry::Board.load("foo", data_dir)

      # 4. Assertions
      loaded_board.lanes.size.should eq(3)

      # Check Lane 1 ("To Do")
      loaded_lane1 = loaded_board.lanes[0]
      loaded_lane1.name.should eq("To Do")
      loaded_lane1.notes.size.should eq(2)
      loaded_lane1.notes[0].sepia_id.should eq(note1_1.sepia_id)
      loaded_lane1.notes[0].title.should eq(note1_1.title)
      loaded_lane1.notes[1].sepia_id.should eq(note1_2.sepia_id)
      loaded_lane1.notes[1].title.should eq(note1_2.title)

      # Check Lane 2 ("In Progress")
      loaded_lane2 = loaded_board.lanes[1]
      loaded_lane2.name.should eq("In Progress")
      loaded_lane2.notes.size.should eq(1)
      loaded_lane2.notes[0].sepia_id.should eq(note2_1.sepia_id)

      # Check Lane 3 ("Done")
      loaded_lane3 = loaded_board.lanes[2]
      loaded_lane3.name.should eq("Done")
      loaded_lane3.notes.should be_empty
    end
  end
end
