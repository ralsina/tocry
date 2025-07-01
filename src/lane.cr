require "file_utils" # For File.join, mkdir_p, symlink, Dir.glob, File.delete
require "./note"     # Lane contains Notes
require "json"       # For JSON serialization
require "sepia"      # For Sepia::Container

module ToCry
  class Lane
    include JSON::Serializable
    include Sepia::Container

    property name : String
    property notes : Array(Note)

    # Override sepia_id getter to return the lane's name
    def sepia_id : String
      @name
    end

    # Override sepia_id= setter to set the lane's name
    def sepia_id=(value : String)
      @name = value
    end

    # Constructor that accepts a name, which will be used as sepia_id.
    def initialize(@name : String, @notes : Array(Note) = [] of Note)
      @sepia_id = @name # Set the sepia_id to the lane's name
    end

    # Default constructor for deserialization (Sepia needs this)
    def initialize(@notes : Array(Note) = [] of Note)
      @sepia_id = @name = "Untitled Lane" # Default name if not provided
    end

    def note_add(title : String, tags : Array(String) = [] of String, content : String = "", position : Int = 0, public : Bool = false) : Note
      new_note = Note.new(title: title, tags: tags, content: content, public: public)
      actual_position = position.clamp(0, self.notes.size)

      self.notes.insert(actual_position, new_note)
      Log.info { "Note '#{new_note.title}' (ID: #{new_note.id}) added to lane '#{self.name}' at position #{actual_position}." }
      new_note
    rescue ex
      Log.error(exception: ex) { "Failed to add note '#{title}' to lane '#{self.name}'" }
      raise ex
    end
  end
end
