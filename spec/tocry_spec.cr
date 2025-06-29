require "./spec_helper" # Includes ../src/tocry which defines Board, Lane, Note

describe ToCry::Board do
  describe "JSON Serialization" do
    it "serializes and deserializes an empty board" do
      original_board = ToCry::Board.new
      json_string = original_board.to_json
      deserialized_board = ToCry::Board.from_json(json_string)

      deserialized_board.lanes.should be_empty
    end

    it "serializes and deserializes a board with one empty lane" do
      original_board = ToCry::Board.new
      original_board.lane_add("Empty Lane")

      json_string = original_board.to_json
      deserialized_board = ToCry::Board.from_json(json_string)

      deserialized_board.lanes.size.should eq(1)
      deserialized_board.lanes[0].name.should eq("Empty Lane")
      deserialized_board.lanes[0].notes.should be_empty
    end

    it "serializes and deserializes a board with one lane containing notes" do
      original_board = ToCry::Board.new
      lane1 = original_board.lane_add("Lane With Notes")
      note1 = lane1.note_add(title: "Note A", tags: ["tag1"], content: "Content A")
      note2 = lane1.note_add(title: "Note B", content: "Content B")

      json_string = original_board.to_json
      deserialized_board = ToCry::Board.from_json(json_string)

      deserialized_board.lanes.size.should eq(1)
      deserialized_lane = deserialized_board.lanes[0]

      deserialized_lane.name.should eq("Lane With Notes")
      deserialized_lane.notes.size.should eq(2)

      # Notes are inserted at the head of the lane

      # Compare Note A
      deserialized_lane.notes[1].id.should eq(note1.id)
      deserialized_lane.notes[1].title.should eq(note1.title)
      deserialized_lane.notes[1].tags.should eq(note1.tags)
      deserialized_lane.notes[1].content.should eq(note1.content)

      # Compare Note B
      deserialized_lane.notes[0].id.should eq(note2.id)
      deserialized_lane.notes[0].title.should eq(note2.title)
      deserialized_lane.notes[0].tags.should eq(note2.tags) # Should be empty
      deserialized_lane.notes[0].content.should eq(note2.content)
    end

    it "serializes and deserializes a board with multiple lanes, some with notes" do
      original_board = ToCry::Board.new
      lane1 = original_board.lane_add("Todo")
      lane1.note_add(title: "Task 1", content: "Do this")

      original_board.lane_add("Doing")
      # No notes in lane2

      lane3 = original_board.lane_add("Done")
      lane3.note_add(title: "Task X", content: "Finished X")
      lane3.note_add(title: "Task Y", content: "Finished Y")

      json_string = original_board.to_json
      deserialized_board = ToCry::Board.from_json(json_string)

      deserialized_board.lanes.size.should eq(3)

      # Check Lane 1 ("Todo")
      deserialized_board.lanes[0].name.should eq("Todo")
      deserialized_board.lanes[0].notes.size.should eq(1)
      deserialized_board.lanes[0].notes[0].title.should eq("Task 1")

      # Check Lane 2 ("Doing")
      deserialized_board.lanes[1].name.should eq("Doing")
      deserialized_board.lanes[1].notes.should be_empty

      # Check Lane 3 ("Done")
      deserialized_board.lanes[2].name.should eq("Done")
      deserialized_board.lanes[2].notes.size.should eq(2)
      deserialized_board.lanes[2].notes[1].title.should eq("Task X")
      deserialized_board.lanes[2].notes[0].title.should eq("Task Y")
    end

    it "produces JSON with expected structure for a board with one lane and one note" do
      original_board = ToCry::Board.new
      lane = original_board.lane_add("Sample Lane")
      lane.note_add(title: "Sample Note")
      parsed_json = JSON.parse(original_board.to_json)

      parsed_json["lanes"].as_a.size.should eq(1)
      parsed_json["lanes"].as_a[0].as_h["name"].as_s.should eq("Sample Lane")
      parsed_json["lanes"].as_a[0].as_h["notes"].as_a.size.should eq(1)
      parsed_json["lanes"].as_a[0].as_h["notes"].as_a[0].as_h["title"].as_s.should eq("Sample Note")
    end
  end
end

describe ToCry do
  describe "#find_broken_symlinks" do
    test_data_dir = "test_data_symlinks"

    before_each do
      FileUtils.rm_rf(test_data_dir)
      FileUtils.mkdir_p(test_data_dir)
      ToCry.data_directory = test_data_dir
    end

    after_each do
      FileUtils.rm_rf(test_data_dir)
    end

    it "correctly identifies broken symlinks and ignores working ones" do
      # Create a target file for a working symlink
      working_file_path = File.join(test_data_dir, "target_file.txt")
      File.write(working_file_path, "hello")

      # Create a working symlink to the file
      working_symlink_file_path = File.join(test_data_dir, "working_symlink_file")
      File.symlink(Path[working_file_path].relative_to(Path[working_symlink_file_path].parent), working_symlink_file_path)

      # Create a broken symlink to a non-existent file
      broken_symlink_file_path = File.join(test_data_dir, "broken_symlink_file")
      File.symlink(File.join(test_data_dir, "non_existent_file.txt"), broken_symlink_file_path)

      # Create a target directory for a working symlink
      working_dir_path = File.join(test_data_dir, "target_dir")
      FileUtils.mkdir_p(working_dir_path)

      # Create a working symlink to the directory
      working_symlink_dir_path = File.join(test_data_dir, "working_symlink_dir")
      File.symlink(Path[working_dir_path].relative_to(Path[working_symlink_dir_path].parent), working_symlink_dir_path)

      # Create a broken symlink to a non-existent directory
      broken_symlink_dir_path = File.join(test_data_dir, "broken_symlink_dir")
      File.symlink(File.join(test_data_dir, "non_existent_dir"), broken_symlink_dir_path)

      # Run the function
      broken_links = ToCry.find_broken_symlinks

      # Assertions
      broken_links.size.should eq(2)
      broken_links.should contain(broken_symlink_file_path)
      broken_links.should contain(broken_symlink_dir_path)

      # Ensure working symlinks are not reported as broken
      broken_links.should_not contain(working_symlink_file_path)
      broken_links.should_not contain(working_symlink_dir_path)
    end

    it "returns an empty array if no symlinks are present" do
      File.write(File.join(test_data_dir, "regular_file.txt"), "content")
      FileUtils.mkdir_p(File.join(test_data_dir, "empty_dir"))

      broken_links = ToCry.find_broken_symlinks
      broken_links.should be_empty
    end

    it "returns an empty array if all symlinks are working" do
      working_file_path = File.join(test_data_dir, "target_file.txt")
      File.write(working_file_path, "hello")
      working_symlink_file_path = File.join(test_data_dir, "working_symlink_file")
      File.symlink(Path[working_file_path].relative_to(Path[working_symlink_file_path].parent), working_symlink_file_path)

      broken_links = ToCry.find_broken_symlinks
      broken_links.should be_empty
    end

    it "handles nested directories correctly" do
      nested_dir = File.join(test_data_dir, "nested", "deep")
      FileUtils.mkdir_p(nested_dir)

      broken_symlink_path = File.join(nested_dir, "broken_nested_symlink")
      File.symlink(File.join(test_data_dir, "non_existent_target"), broken_symlink_path)

      broken_links = ToCry.find_broken_symlinks
      broken_links.size.should eq(1)
      broken_links.should contain(broken_symlink_path)
    end
  end
end
