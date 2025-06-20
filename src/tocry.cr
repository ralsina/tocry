require "file_utils" # For File.dirname, File.basename
require "kemal"
require "uuid" # For generating UUIDs
require "yaml" # For generating YAML frontmatter

module ToCry
  Log = ::Log.for(self)

  VERSION = {{ `shards version #{__DIR__}/../`.chomp.stringify }}

  class Note
    def self.slug(text : String) : String
      # Replace characters that are typically invalid or problematic in filenames
      # Keep alphanumeric, underscore, hyphen, space. Replace others with underscore.
      sanitized = text.gsub(/[^\w\s-]/, "_").gsub(/\s+/, "_")
      # Also handle potential leading/trailing spaces or dots/hyphens/underscores which can be problematic
      sanitized = sanitized.gsub(/^\.+|\.+$/, "").gsub(/^-+|-+$/, "").gsub(/^_|_$/, "")

      sanitized.empty? ? "untitled" : sanitized # Provide a fallback if title becomes empty after cleaning
    end

    property id : String

    def title=(value : String)
      @title = value.strip.empty? ? "Untitled" : value
    end

    property title : String
    property tags : Array(String)
    property content : String

    # Initialize a new Note with a generated UUID
    def initialize(
      @title : String,
      @tags : Array(String) = [] of String, # Default empty array for tags
      @content : String = ""                # Default empty string for content
    )
      @id = UUID.random.to_s # Assign a random UUID as the ID (UUIDs are strings)
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

  class Lane
    property name : String
    property notes : Array(Note)

    def initialize(@name : String, @notes : Array(Note) = [] of Note)
    end

    def save
      lane_dir = File.join("data", self.name)
      FileUtils.mkdir_p(lane_dir)
      Log.info { "Lane directory '#{self.name}' created at #{lane_dir}" }

      # Before creating new symlinks, clean up old note symlinks in this directory
      Dir.glob(File.join(lane_dir, "*.md")).each do |existing_symlink_path|
        if File.symlink?(existing_symlink_path)
          begin
            File.delete(existing_symlink_path)
            Log.info { "Deleted old note symlink: #{existing_symlink_path}" }
          rescue ex
            Log.warn(exception: ex) { "Failed to delete old note symlink: #{existing_symlink_path}" }
          end
        end
      end

      self.notes.each do |note|
        note.save # This saves the note to data/.notes/note_id.md

        # Construct the new symlink filename with index and title
        # Pad index with leading zeros, e.g., 0000, 0001, ...
        padded_index = index.to_s.rjust(4, '0') # Use 4 digits for padding

        sanitized_title = Note.slug(note.title) # Use the new slug function

        # Construct the symlink filename: index_sanitized_title.md
        symlink_filename = "#{padded_index}_#{sanitized_title}.md"

        # Now create a symlink from data/.notes/note_id.md to data/lane_name/index_sanitized_title.md
        source_note_path = File.join("data", ".notes", "#{note.id}.md")
        symlink_target_path = File.join(lane_dir, symlink_filename) # Use the new filename
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

    def save
      # Ensure the base data directory exists
      base_data_dir = "data"
      FileUtils.mkdir_p(base_data_dir)
      Log.info { "Base data directory '#{base_data_dir}' ensured." }

      # Save each lane
      self.lanes.each do |lane|
        lane.save
      end
      Log.info { "All lanes in the board have been processed for saving." }
    rescue ex
      Log.error(exception: ex) { "Error saving board" }
      raise ex # Re-raise the exception after logging
    end
  end
end
