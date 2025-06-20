require "./spec_helper"
require "json" # Required for JSON.parse

describe ToCry::Note do
  describe "JSON Serialization" do
    it "serializes a note to JSON correctly" do
      note = ToCry::Note.new("Test Title", ["tag1", "tag2"], "Test content.")
      # We need to know the ID to compare, so let's grab it
      known_id = note.id
      json_output = note.to_json

      parsed_json = JSON.parse(json_output)

      parsed_json["id"].should eq known_id
      parsed_json["title"].should eq "Test Title"
      parsed_json["tags"].should eq ["tag1", "tag2"]
      parsed_json["content"].should eq "Test content."
    end

    it "serializes a note with empty tags and content correctly" do
      note = ToCry::Note.new("Simple Title")
      known_id = note.id
      json_output = note.to_json

      parsed_json = JSON.parse(json_output)

      parsed_json["id"].should eq known_id
      parsed_json["title"].should eq "Simple Title"
      parsed_json["tags"].should eq [] of String # Ensure it's an empty array of strings
      parsed_json["content"].should eq ""
    end
  end

  describe "JSON Deserialization" do
    it "deserializes a JSON string to a Note object correctly" do
      json_string = %({"id":"test-uuid-123","title":"From JSON","tags":["json_tag"],"content":"JSON content"})
      note = ToCry::Note.from_json(json_string)

      note.id.should eq "test-uuid-123"
      note.title.should eq "From JSON" # Title setter should handle this
      note.tags.should eq ["json_tag"]
      note.content.should eq "JSON content"
    end

    it "deserializes a JSON without id" do
      json_string = %({"title":"No ID Note","tags":["tag1"],"content":"Content without ID"})
      note = ToCry::Note.from_json(json_string)

      note.id.should_not be_nil # Should generate a new UUID
      note.title.should eq "No ID Note"
      note.tags.should eq ["tag1"]
      note.content.should eq "Content without ID"
    end

    it "deserializes and slug normalizes title with leading/trailing spaces" do
      json_string = %({"id":"test-uuid-456","title":"  Spaced Title  ","tags":[],"content":""})
      note = ToCry::Note.from_json(json_string)

      note.id.should eq "test-uuid-456"
      note.slug.should eq "Spaced_Title" # Title setter should strip spaces
    end

    it "deserializes and slug normalizes an empty/whitespace title to 'Untitled'" do
      json_string = %({"id":"test-uuid-789","title":"","tags":[],"content":""})
      note = ToCry::Note.from_json(json_string)

      note.id.should eq "test-uuid-789"
      note.slug.should eq "untitled" # Title setter should set to "Untitled"
    end

    it "deserializes a note with missing optional fields (tags, content)" do
      # JSON::Serializable handles missing fields by using default values or nil if nillable
      # For Note, tags and content have defaults in initialize, but from_json might behave differently
      # Let's test with JSON that only has id and title
      json_string = %({"id":"test-uuid-000","title":"Minimal Note"})
      note = ToCry::Note.from_json(json_string)

      note.id.should eq "test-uuid-000"
      note.title.should eq "Minimal Note"
      # JSON::Serializable will initialize properties to their type's default if not in JSON
      # and no default is specified in `JSON::Field(default: ...)`
      note.tags.should eq [] of String # Default for Array(String) is an empty array
      note.content.should eq ""       # Default for String is an empty string
    end
  end
end