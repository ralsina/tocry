require "./spec_helper"
require "json" # Required for JSON.parse
require "file_utils"

describe ToCry::Lane do
  describe "JSON Serialization" do
    it "serializes and deserializes an empty lane" do
      original_lane = ToCry::Lane.new(name: "Test Lane Empty")
      json_string = original_lane.to_json
      deserialized_lane = ToCry::Lane.from_json(json_string)

      deserialized_lane.name.should eq("Test Lane Empty")
      deserialized_lane.notes.should be_empty
    end

    it "serializes and deserializes a lane with one note" do
      note1 = ToCry::Note.new(title: "Note 1", tags: ["tagA"], content: "Content for Note 1")
      original_lane = ToCry::Lane.new(name: "Lane With One Note", notes: [note1])

      json_string = original_lane.to_json
      deserialized_lane = ToCry::Lane.from_json(json_string)

      deserialized_lane.name.should eq("Lane With One Note")
      deserialized_lane.notes.size.should eq(1)

      deserialized_note = deserialized_lane.notes[0]
      original_note = original_lane.notes[0]

      deserialized_note.id.should eq(original_note.id)
      deserialized_note.title.should eq(original_note.title)
      deserialized_note.tags.should eq(original_note.tags)
      deserialized_note.content.should eq(original_note.content)
    end

    it "serializes and deserializes a lane with multiple notes" do
      note1 = ToCry::Note.new(title: "Alpha Note", tags: ["test", "alpha"], content: "Alpha content")
      note2 = ToCry::Note.new(title: "Beta Note", tags: ["test", "beta"], content: "Beta content")
      original_lane = ToCry::Lane.new(name: "Lane With Many Notes", notes: [note1, note2])

      json_string = original_lane.to_json
      deserialized_lane = ToCry::Lane.from_json(json_string)

      deserialized_lane.name.should eq("Lane With Many Notes")
      deserialized_lane.notes.size.should eq(2)

      # Compare note 1
      deserialized_lane.notes[0].id.should eq(original_lane.notes[0].id)
      deserialized_lane.notes[0].title.should eq(original_lane.notes[0].title)
      deserialized_lane.notes[0].tags.should eq(original_lane.notes[0].tags)
      deserialized_lane.notes[0].content.should eq(original_lane.notes[0].content)

      # Compare note 2
      deserialized_lane.notes[1].id.should eq(original_lane.notes[1].id)
      deserialized_lane.notes[1].title.should eq(original_lane.notes[1].title)
      deserialized_lane.notes[1].tags.should eq(original_lane.notes[1].tags)
      deserialized_lane.notes[1].content.should eq(original_lane.notes[1].content)
    end

    it "produces JSON with expected structure for a lane with one note" do
      note1 = ToCry::Note.new(title: "Structure Test Note", tags: ["struct"], content: "Structure content")
      original_lane = ToCry::Lane.new(name: "JSON Structure Lane", notes: [note1])
      parsed_json = JSON.parse(original_lane.to_json)

      parsed_json["name"].as_s.should eq("JSON Structure Lane")
      parsed_json["notes"].as_a.size.should eq(1)
      note_json = parsed_json["notes"].as_a[0].as_h
      note_json["id"].as_s.should eq(note1.id)
      note_json["title"].as_s.should eq("Structure Test Note") # Note constructor normalizes title
      note_json["tags"].as_a.map(&.as_s).should eq(["struct"])
      note_json["content"].as_s.should eq("Structure content")
    end
  end

  describe "File Persistence" do
    board_data_dir = File.join(TEST_PATH, "default")

    Spec.after_each do
      FileUtils.rm_rf(TEST_PATH) if Dir.exists?(TEST_PATH)
    end

    it "saves a lane and can be loaded back (round-trip)" do
      # 1. Create an original lane and add some notes to it
      original_lane = ToCry::Lane.new("To Do")
      note1 = original_lane.note_add("First Task", ["urgent", "testing"], "Content for the first task.")
      note1.save
      note2 = original_lane.note_add("Second Task", ["testing"], "Content for the second task.")
      note2.save

      # 2. Save the lane to the filesystem at position 0
      original_lane.save(File.join(board_data_dir, "0000_To Do"))

      # 3. Determine the path where the lane was saved and load it back
      lane_dir_path = File.join(board_data_dir, "0000_To Do")
      # Sanity check that the directory was actually created
      Dir.exists?(lane_dir_path).should be_true

      loaded_lane = ToCry::Lane.load(original_lane.sepia_id, lane_dir_path)

      # 4. Assert that the loaded lane has the same properties as the original
      loaded_lane.name.should eq(original_lane.name)
      loaded_lane.notes.size.should eq(2)

      # 5. Assert that the notes within the loaded lane are identical to the original notes
      loaded_note1 = loaded_lane.notes[0]
      loaded_note2 = loaded_lane.notes[1]

      # These are backwards because notes are inserted at the top
      loaded_note1.id.should eq(note2.id)
      loaded_note1.title.should eq(note2.title)
      loaded_note1.tags.should eq(note2.tags)
      loaded_note1.content.should eq(note2.content)

      loaded_note2.id.should eq(note1.id)
      loaded_note2.title.should eq(note1.title)
      loaded_note2.tags.should eq(note1.tags)
      loaded_note2.content.should eq(note1.content)
    end
  end
end
