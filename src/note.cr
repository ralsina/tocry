require "file_utils" # For File.dirname, File.basename
require "json"       # For JSON serialization
require "uuid"       # For generating UUIDs
require "yaml"       # For generating YAML frontmatter
require "sepia"

module ToCry
  # Represents the YAML frontmatter structure for a Note.
  struct FrontMatter
    include YAML::Serializable
    property title : String
    property tags : Array(String) = [] of String        # Default to empty array
    property expanded : Bool = false                    # Default to false
    property public : Bool = false                      # Default to false
    property attachments : Array(String) = [] of String # New: Default to empty array

    def initialize(@title : String, @tags : Array(String) = [] of String, @expanded : Bool = false, @public : Bool = false, @attachments : Array(String) = [] of String)
    end
  end

  class Note
    include JSON::Serializable
    include Sepia::Serializable

    def slug : String
      # Replace characters that are typically invalid or problematic in filenames
      # Keep alphanumeric, underscore, hyphen, space. Replace others with underscore.
      sanitized = title.gsub(/[^\w\s-]/, "_").gsub(/\s+/, "_")
      # Also handle potential leading/trailing spaces or dots/hyphens/underscores which can be problematic
      sanitized = sanitized.gsub(/^\.+|\.+$/, "").gsub(/^-+|-+$/, "").gsub(/^_|_$/, "")
      sanitized.empty? ? "untitled" : sanitized # Provide a fallback if title becomes empty after cleaning
    end

    def title=(value : String)
      stripped_value = value.strip
      @title = stripped_value.empty? ? "Untitled" : stripped_value
    end

    property id : String = UUID.random.to_s      # Default to a random UUID
    property title : String = ""                 # Provide a default initializer
    property tags : Array(String) = [] of String # Default empty array for tags
    property content : String = ""
    property expanded : Bool = false
    property public : Bool = false
    property attachments : Array(String) = [] of String # New: Default to empty array

    # Reimplement sepia_id to use the id property
    def sepia_id
      @id
    end

    def sepia_id=(value : String)
      @id = value
    end

    # Initialize a new Note with a generated UUID.
    # board_data_dir is not part of the JSON payload, it's set by the backend context.
    def initialize(
      title : String,
      tags : Array(String) = [] of String,
      content : String = "",
      expanded : Bool = false,
      public : Bool = false,
      attachments : Array(String) = [] of String,
    )
      @sepia_id = UUID.random.to_s # Assign a random UUID as the ID (UUIDs are strings)
      self.title = title
      @tags = tags
      @content = content
      @expanded = expanded
      @public = public
      @attachments = attachments
    end

    # Loads a Note from a string containing a markdown file with YAML frontmatter.
    def self.from_sepia(data : String)
      # Regex to parse frontmatter and content.
      # It captures the YAML block and the content block separately.
      match = data.match(/\A---\s*\n(.*?)\n---\s*\n?(.*)\z/m)

      unless match
        raise "Invalid note format in provided data. Could not parse frontmatter."
      end

      yaml_content = match[1]
      note_content = match[2]

      frontmatter = begin
        FrontMatter.from_yaml(yaml_content)
      rescue ex : YAML::ParseException
        raise "Invalid YAML frontmatter in provided data: #{ex.message}"
      end

      note = Note.new(frontmatter.title, frontmatter.tags, note_content, frontmatter.expanded, frontmatter.public, frontmatter.attachments)
      note
    end

    # Serializes the Note to a string containing a markdown file with YAML frontmatter.
    def to_sepia
      data = String.build do |builder|
        # Use the new FrontMatter struct for serialization
        frontmatter_struct = FrontMatter.new(title: self.title, tags: self.tags, expanded: self.expanded, public: self.public, attachments: self.attachments)
        builder << frontmatter_struct.to_yaml
        builder << "---\n\n" # YAML frontmatter separator
        builder << self.content
      end
      data
    end

    # Deletes the note from the system.
    # This involves:
    # 1. Removing the note from its parent lane in the in-memory board.
    # 2. Deleting the note's source markdown file from `data/.notes/`.
    # 3. Saving the board, which will remove any symlinks pointing to the deleted note.
    def delete(board : ToCry::Board)
      note_id_str = self.id

      # 1. Find and remove the note from its lane in the provided board's state.
      find_result = board.note(note_id_str)
      if find_result
        note_in_lane, parent_lane = find_result
        parent_lane.notes.delete(note_in_lane)
        Log.info { "Removed note '#{self.title}' from in-memory lane '#{parent_lane.name}'." }
      else
        Log.warn { "Note '#{self.title}' (ID: #{note_id_str}) not found in any lane on board '#{board}' during deletion." }
      end

      # 2. Delete the note itself
      self.delete

      # 3. Save the board to persist the changes. This will remove the symlink.
      board.save
    rescue ex
      Log.error(exception: ex) { "An error occurred while deleting note '#{self.title}' (ID: #{note_id_str})." }
      raise ex
    end

    # Adds an attachment filename to the note's attachments list.
    def add_attachment(filename : String)
      @attachments << filename
      Log.info { "Added attachment '#{filename}' to note '#{self.id}'." }
    end

    # Removes an attachment filename from the note's attachments list.
    def remove_attachment(filename : String) : Nil
      if @attachments.delete(filename)
        Log.info { "Removed attachment '#{filename}' from note '#{self.id}'." }
      else
        Log.warn { "Attempted to remove non-existent attachment '#{filename}' from note '#{self.id}'." }
      end
      nil
    end
  end
end
