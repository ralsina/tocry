require "spec"
require "../src/note" # Note must be defined before Lane as Lane uses Note
require "../src/lane" # The class we are testing

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
end