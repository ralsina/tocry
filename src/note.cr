require "file_utils" # For File.dirname, File.basename
require "json"       # For JSON serialization
require "uuid"       # For generating UUIDs
require "yaml"       # For generating YAML frontmatter

module ToCry
  # Represents the YAML frontmatter structure for a Note.
  struct FrontMatter
    include YAML::Serializable
    property title : String
    property tags : Array(String) = [] of String # Default to empty array

    def initialize(@title : String, @tags : Array(String) = [] of String)
    end
  end

  class Note
    include JSON::Serializable

    def slug : String
      # Replace characters that are typically invalid or problematic in filenames
      # Keep alphanumeric, underscore, hyphen, space. Replace others with underscore.
      sanitized = title.gsub(/[^\w\s-]/, "_").gsub(/\s+/, "_")
      # Also handle potential leading/trailing spaces or dots/hyphens/underscores which can be problematic
      sanitized = sanitized.gsub(/^\.+|\.+$/, "").gsub(/^-+|-+$/, "").gsub(/^_|_$/, "")
      sanitized.empty? ? "untitled" : sanitized # Provide a fallback if title becomes empty after cleaning
    end

    property id : String?

    def id
      @id = UUID.random.to_s if @id.nil?
      @id
    end

    def title=(value : String)
      stripped_value = value.strip
      @title = stripped_value.empty? ? "Untitled" : stripped_value
    end

    property title : String = ""                 # Provide a default initializer
    property tags : Array(String) = [] of String # Default empty array for tags
    property content : String = ""

    # Initialize a new Note with a generated UUID
    def initialize(
      @title : String,
      @tags : Array(String) = [] of String, # Default empty array for tags
      @content : String = "",               # Default empty string for content
    )
      @id = UUID.random.to_s # Assign a random UUID as the ID (UUIDs are strings)
      self.title = @title
    end

    # Loads a Note from its corresponding markdown file.
    #
    # The file is expected to be at `data/.notes/{id}.md`.
    # It should contain YAML frontmatter for metadata (title, tags)
    # and the rest of the file is the note's content.
    #
    # Raises `IO::FileNotFoundError` if the file doesn't exist.
    # Raises `RuntimeError` if the file format is invalid or has invalid YAML.
    def self.load(id : String)
      file_path = File.join("data", ".notes", "#{id}.md")
      unless File.exists?(file_path)
        raise File::NotFoundError.new(file: file_path, message: "Note file not found for ID #{id} at #{file_path}")
      end

      file_content = File.read(file_path)

      # Regex to parse frontmatter and content.
      # It captures the YAML block and the content block separately.
      match = file_content.match(/\A---\s*\n(.*?)\n---\s*\n?(.*)\z/m)

      unless match
        raise "Invalid note format in #{file_path}. Could not parse frontmatter."
      end

      yaml_content = match[1]
      note_content = match[2]

      frontmatter = begin
        FrontMatter.from_yaml(yaml_content)
      rescue ex : YAML::ParseException
        raise "Invalid YAML frontmatter in #{file_path}: #{ex.message}"
      end

      note = Note.new(frontmatter.title, frontmatter.tags, note_content)
      note.id = id # Set the correct, persistent ID.
      note
    end

    def save
      notes_dir = File.join("data", ".notes")
      FileUtils.mkdir_p(notes_dir)

      file_path = File.join(notes_dir, "#{self.id}.md")

      # Use the new FrontMatter struct for serialization
      frontmatter_struct = FrontMatter.new(title: self.title, tags: self.tags)
      frontmatter_section = "#{frontmatter_struct.to_yaml}\n---\n"
      File.write(file_path, frontmatter_section + self.content)
      Log.info { "Note '#{self.title}' (ID: #{self.id}) saved to #{file_path}" }
    rescue ex
      Log.error(exception: ex) { "Failed to save note '#{self.title}' (ID: #{self.id}) to #{file_path}" }
      raise ex # Re-raise the exception after logging
    end

    # Deletes the note from the system.
    # This involves:
    # 1. Removing the note from its parent lane in the in-memory board.
    # 2. Deleting the note's source markdown file from `data/.notes/`.
    # 3. Saving the board, which will remove any symlinks pointing to the deleted note.
    def delete
      note_id_str = self.id.to_s

      # 1. Find and remove the note from its lane in the in-memory board state.
      find_result = ToCry::BOARD.note(note_id_str)
      if find_result
        note_in_lane, parent_lane = find_result
        parent_lane.notes.delete(note_in_lane)
        Log.info { "Removed note '#{self.title}' from in-memory lane '#{parent_lane.name}'." }
      else
        Log.warn { "Note '#{self.title}' (ID: #{note_id_str}) not found in any lane on the board during deletion." }
      end

      # 2. Delete the note's source file.
      note_file_path = File.join("data", ".notes", "#{note_id_str}.md")
      File.delete(note_file_path) if File.exists?(note_file_path)

      # 3. Save the board to persist the changes. This will remove the symlink.
      ToCry::BOARD.save
    rescue ex
      Log.error(exception: ex) { "An error occurred while deleting note '#{self.title}' (ID: #{note_id_str})." }
      raise ex
    end
  end
end
