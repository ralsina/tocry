require "file_utils" # For File.join, mkdir_p, symlink, Dir.glob, File.delete
require "./note"     # Lane contains Notes
require "json"       # For JSON serialization

module ToCry
  class Lane
    include JSON::Serializable

    property name : String
    property notes : Array(Note)

    @[JSON::Field(ignore: true)]
    property board_data_dir : String = ""

    def initialize(@name : String, @board_data_dir : String, @notes : Array(Note) = [] of Note)
    end

    def note_add(title : String, tags : Array(String) = [] of String, content : String = "", position : Int = 0) : Note
      new_note = Note.new(title: title, tags: tags, content: content, board_data_dir: @board_data_dir) # Pass board_data_dir
      actual_position = position.clamp(0, self.notes.size)

      self.notes.insert(actual_position, new_note)
      Log.info { "Note '#{new_note.title}' (ID: #{new_note.id}) added to lane '#{self.name}' at position #{actual_position}." }
      new_note
    rescue ex
      Log.error(exception: ex) { "Failed to add note '#{title}' to lane '#{self.name}'" }
      raise ex
    end

    def save(position : Int, board_data_dir : String)
      # Format position with leading zeros (e.g., 1 -> "0001")
      padded_position = position.to_s.rjust(4, '0')
      # Create the directory name using the position and lane name
      lane_directory_name = "#{padded_position}_#{self.name}"
      lane_dir = File.join(board_data_dir, lane_directory_name)
      FileUtils.mkdir_p(lane_dir)
      Log.info { "Lane directory '#{lane_directory_name}' created at #{lane_dir}" }

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

      self.notes.each_with_index do |note, index| # Changed to each_with_index to get the index
        note.save                                 # This saves the note to data/.notes/note_id.md

        padded_index = index.to_s.rjust(4, '0')
        sanitized_title = note.slug # Note instance method for slug

        symlink_filename = "#{padded_index}_#{sanitized_title}.md"
        source_note_path = File.join("..", ".notes", "#{note.id}.md") # Relative path for symlink
        symlink_target_path = File.join(lane_dir, symlink_filename)

        File.symlink(source_note_path, symlink_target_path)
        Log.info { "Symlink created for note '#{note.title}' (ID: #{note.id}) from #{source_note_path} to #{symlink_target_path}" }
      end
    rescue ex
      Log.error(exception: ex) { "Error saving lane '#{self.name}' (directory: #{lane_directory_name}) at #{lane_dir}" }
      raise ex # Re-raise the exception after logging
    end

    # Loads a Lane from a directory on the filesystem.
    #
    # The directory name is expected to be in the format "NNNN_lane_name".
    # It finds all note symlinks within the directory, which are expected
    # to be in the format "MMMM_note_slug.md", sorted by MMMM.
    # It follows each symlink to load the corresponding Note.
    #
    # Returns a new `Lane` instance.
    # Raises `RuntimeError` if the directory doesn't exist or has an invalid name format.
    def self.load(folder : String, board_data_dir : String)
      # TODO: normalize numbers so notes are all consecutive and whatnot like lanes
      # in Board.load
      unless Dir.exists?(folder)
        raise "Lane directory not found: #{folder}"
      end

      folder_basename = File.basename(folder)
      # Regex to extract lane name from "NNNN_lane_name"
      match = folder_basename.match(/^\d{4,}_(.*)$/)
      unless match
        raise "Invalid lane folder name format: #{folder_basename}. Expected 'NNNN_lane_name'."
      end
      lane_name = match[1]

      # Find all markdown symlinks, sort them to maintain order
      symlink_paths = Dir.glob(File.join(folder, "*.md")).sort

      notes = symlink_paths.compact_map do |symlink_path|
        begin
          next nil unless File.symlink?(symlink_path)
          target_path = File.readlink(symlink_path)
          note_id = File.basename(target_path, ".md")
          Log.info { "Loading note from symlink: #{symlink_path} -> #{target_path} (ID: #{note_id}) for board_data_dir: #{board_data_dir}" }
          Note.load(note_id, board_data_dir) # Pass board_data_dir to Note.load
        rescue ex
          Log.warn(exception: ex) { "Skipping note: Failed to load from symlink '#{symlink_path}'" }
          nil
        end
      end

      Lane.new(name: lane_name, notes: notes, board_data_dir: board_data_dir)
    end
  end
end
