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

    property id : String

    def title=(value : String)
      stripped_value = value.strip
      @title = stripped_value.empty? ? "Untitled" : stripped_value
    end

    property title : String = ""                 # Provide a default initializer
    property tags : Array(String) = [] of String # Default empty array for tags
    property content : String = ""

    # Initialize a new Note with a generated UUID
    def initialize(
      title_param : String,
      tags_param : Array(String) = [] of String, # Default empty array for tags
      content_param : String = "",               # Default empty string for content
    )
      @id = UUID.random.to_s   # Assign a random UUID as the ID (UUIDs are strings)
      self.title = title_param # Use the setter to apply normalization
      @tags = tags_param
      @content = content_param
    end

    def save
      notes_dir = File.join("data", ".notes")
      FileUtils.mkdir_p(notes_dir)

      file_path = File.join(notes_dir, "#{self.id}.md")

      # Use the new FrontMatter struct for serialization
      frontmatter_struct = FrontMatter.new(title: self.title, tags: self.tags)
      frontmatter_data = frontmatter_struct.to_yaml

      frontmatter_section = "---\n#{frontmatter_data.to_yaml}\n---\n"

      File.write(file_path, frontmatter_section + self.content)
      Log.info { "Note '#{self.title}' (ID: #{self.id}) saved to #{file_path}" }
    rescue ex
      Log.error(exception: ex) { "Failed to save note '#{self.title}' (ID: #{self.id}) to #{file_path}" }
      raise ex # Re-raise the exception after logging
    end
  end
end
