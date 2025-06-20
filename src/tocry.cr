require "kemal"
require "file_utils" # For File.dirname, File.basename
require "yaml"       # For generating YAML frontmatter

require "uuid" # For generating UUIDs
module ToCry
  Log = ::Log.for(self)

  VERSION = {{ `shards version #{__DIR__}/../`.chomp.stringify }}

  # Forward declaration of Lane class might be used if Note needed it before Lane's full definition,
  # but with Note defined first, it's generally not required for this structure.
  # class Lane

  class Note
    property id : String
    property title : String
    property tags : Array(String)
    property content : String

    # Initialize a new Note with a generated UUID
    def initialize(
      @title : String,
      @tags : Array(String) = [] of String, # Default empty array for tags
      @content : String = "" # Default empty string for content
    )
      @id = UUID.random.to_s # Assign a random UUID as the ID
    end

    def save
      notes_dir = File.join("data", ".notes")
      FileUtils.mkdir_p(notes_dir)

      file_path = File.join(notes_dir, "#{self.id}.md")

      # Construct YAML frontmatter
      frontmatter_data = Hash(String, YAML::Any).new
      frontmatter_data["title"] = self.title

      if !self.tags.empty?
        frontmatter_data["tags"] = self.tags
      end
      frontmatter_section = "---\n#{frontmatter_data.to_yaml}\n---\n"

      full_content_to_write = frontmatter_section + self.content

      File.write(file_path, full_content_to_write)
      Log.info { "Note '#{self.title}' (ID: #{self.id}) saved to #{file_path}" }
    rescue ex
      Log.error(exception: ex) { "Failed to save note '#{self.title}' (ID: #{self.id}) to #{file_path}" }
      raise ex # Re-raise the exception after logging
    end
  end

  class Lane # Changed from struct to class
    property name : String
    property notes : Array(Note) # The new property

    def initialize(@name : String, @notes : Array(Note) = [] of Note)
    end

    def save
      lane_dir = File.join("data", self.name)
      FileUtils.mkdir_p(lane_dir)
      Log.info { "Lane directory '#{self.name}' created at #{lane_dir}" }

      self.notes.each do |note|
        note.save # This saves the note to data/.notes/note_id.md

        # Now create a symlink from data/.notes/note_id.md to data/lane_name/note_id.md
        source_note_path = File.join("data", ".notes", "#{note.id}.md")
        symlink_target_path = File.join(lane_dir, "#{note.id}.md")

        FileUtils.symlink(source_note_path, symlink_target_path)
        Log.info { "Symlink created for note '#{note.title}' (ID: #{note.id}) from #{source_note_path} to #{symlink_target_path}" }
      end
    rescue ex
      Log.error(exception: ex) { "Error saving lane '#{self.name}' at #{lane_dir}" }
      raise ex # Re-raise the exception after logging
    end
  end


  class Board
    property lanes : Array(Lane) = [] of Lane
  end
end
