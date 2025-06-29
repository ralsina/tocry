require "./spec_helper"
require "json" # Required for JSON.parse
require "file_utils"

TEST_PATH = "test_data_note" # Use a unique path to avoid conflicts with other specs

describe ToCry::Note do
  Spec.after_each do
    FileUtils.rm_rf(TEST_PATH)
  end

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
      note.content.should eq ""        # Default for String is an empty string
    end
  end

  describe "File Persistence" do
    before_each do
      Sepia::Storage::INSTANCE.path = TEST_PATH
    end

    after_each do
      FileUtils.rm_rf(TEST_PATH) if Dir.exists?(TEST_PATH)
    end

    it "saves a note and can be loaded back" do
      # 1. Create a new note
      original_note = ToCry::Note.new(
        "Round Trip Test",
        ["save", "load"],
        "This note will be saved and then loaded."
      )

      # 2. Save the note
      original_note.save

      # 3. Load the note back using its ID
      loaded_note = ToCry::Note.load(original_note.id.to_s)

      # 4. Assert that the loaded note is identical to the original
      loaded_note.id.should eq(original_note.id)
      loaded_note.title.should eq(original_note.title)
      loaded_note.tags.should eq(original_note.tags)
      loaded_note.content.should eq(original_note.content)
    end

    it "deletes a note, its file, and its symlink" do
      # Setup: Create a board, a lane, and a note
      board_data_dir = File.join(TEST_PATH, "delete_test_board")
      FileUtils.mkdir_p(board_data_dir)
      board = ToCry::Board.load("delete_test_board", board_data_dir)
      lane = board.lane_add("Test Lane")
      note = lane.note_add("Note to Delete", ["test"], "Content to delete")
      board.save(board_data_dir) # Save the board to persist the note and create symlinks

      # Verify initial state
      note_file_path = File.join(TEST_PATH, "ToCry::Note", note.id)
      lane_dir = File.join(board_data_dir, "lanes", "0000_Test Lane")     # Assuming first lane
      note_symlink_path = File.join(lane_dir, "notes", "0000_#{note.id}") # Get the symlink

      File.exists?(note_file_path).should be_true
      File.symlink?(note_symlink_path).should be_true
      lane.notes.should_not be_empty
      lane.notes.includes?(note).should be_true

      # Action: Delete the note
      note.delete(board)

      # Assertions:
      # 1. Note is removed from the lane's notes array
      lane.notes.should be_empty
      lane.notes.includes?(note).should be_false

      # 2. Note's canonical file is deleted
      File.exists?(note_file_path).should be_false

      # 3. Symlink to the note is removed from the lane's directory
      File.exists?(note_symlink_path).should be_false
    end

    describe ".load" do
      it "loads a note from a valid markdown file" do
        note_id = "test-load-id"
        file_path = File.join(TEST_PATH, "ToCry::Note", note_id)
        file_content = <<-MD
        ---
        title: Loaded Note
        tags:
        - loaded
        - from_file
        ---
        This is the content of the loaded note.
        MD
        FileUtils.mkdir_p(File.dirname(file_path))
        File.write(file_path, file_content)

        note = ToCry::Note.load(note_id)

        note.id.should eq(note_id)
        note.title.should eq("Loaded Note")
        note.tags.should eq(["loaded", "from_file"])
        note.content.strip.should eq("This is the content of the loaded note.")
      end

      it "raises FileNotFoundError if the note file does not exist" do
        expect_raises(Exception, /not found in storage/) do
          ToCry::Note.load("non-existent-id")
        end
      end

      it "raises an error for a file with invalid format (no frontmatter)" do
        note_id = "invalid-format-id"
        FileUtils.mkdir_p(File.join(TEST_PATH, "ToCry::Note"))
        file_path = File.join(TEST_PATH, "ToCry::Note", note_id)
        File.write(file_path, "Just some text without frontmatter.")

        expect_raises(Exception, /Could not parse frontmatter/) do
          ToCry::Note.load(note_id)
        end
      end

      it "raises an error for a file with invalid YAML in frontmatter" do
        note_id = "invalid-yaml-id"
        FileUtils.mkdir_p(File.join(TEST_PATH, "ToCry::Note"))
        file_path = File.join(TEST_PATH, "ToCry::Note", note_id)
        file_content = <<-MD
        ---
        title: Bad YAML
        tags: [a, b # this is a syntax error
        ---
        Content.
        MD
        File.write(file_path, file_content)

        expect_raises(Exception, /Invalid YAML frontmatter/) do
          ToCry::Note.load(note_id)
        end
      end

      it "loads a note with no tags correctly" do
        note_id = "no-tags-id"
        FileUtils.mkdir_p(File.join(TEST_PATH, "ToCry::Note"))
        file_path = File.join(TEST_PATH, "ToCry::Note", note_id)
        file_content = <<-MD
        ---
        title: Note Without Tags
        ---
        Content here.
        MD
        File.write(file_path, file_content)

        note = ToCry::Note.load(note_id)
        note.title.should eq("Note Without Tags")
        note.tags.should be_empty
        note.content.strip.should eq("Content here.")
      end

      it "loads a note with no content correctly" do
        note_id = "no-content-id"
        FileUtils.mkdir_p(File.join(TEST_PATH, "ToCry::Note"))
        file_path = File.join(TEST_PATH, "ToCry::Note", note_id)
        file_content = <<-MD
        ---
        title: Note Without Content
        tags:
        - no_content
        ---
        MD
        File.write(file_path, file_content)

        note = ToCry::Note.load(note_id)
        note.title.should eq("Note Without Content")
        note.tags.should eq(["no_content"])
        note.content.strip.should be_empty
      end

      it "deletes itself from lane, board, and disk" do
        board_data_dir = File.join(TEST_PATH, "delete_test_board")
        FileUtils.mkdir_p(board_data_dir)
        board = ToCry::Board.load("delete_test_board", board_data_dir)
        lane = board.lane_add("Test Lane")
        note = lane.note_add("Note to Delete", ["test"], "Content to delete")
        board.save(board_data_dir) # Save the board to persist the note and create symlinks

        # Verify initial state
        note_file_path = File.join(TEST_PATH, "ToCry::Note", note.id)
        lane_dir = File.join(board_data_dir, "lanes", "0000_Test Lane")
        note_symlink_path = File.join(lane_dir, "notes", "0000_#{note.id}")

        File.exists?(note_file_path).should be_true
        File.symlink?(note_symlink_path).should be_true
        lane.notes.should_not be_empty
        lane.notes.includes?(note).should be_true

        # Action: Delete the note
        note.delete(board)

        # Assertions:
        # 1. Note is removed from the lane's notes array
        lane.notes.should be_empty
        lane.notes.includes?(note).should be_false
        # 2. Note's canonical file is deleted
        File.exists?(note_file_path).should be_false
        # 3. Symlink to the note is removed from the lane's directory
        File.exists?(note_symlink_path).should be_false
      end
    end
  end
end
