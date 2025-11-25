require "sepia"
require "./board_manager"

module ToCry
  # Provides conflict resolution for multi-instance deployments
  #
  # This module implements optimistic locking with version tracking to handle
  # concurrent modifications to the same objects across multiple instances.
  #
  # Key features:
  # - Version tracking on Sepia objects
  # - Conflict detection on save operations
  # - Automatic merge strategies where possible
  # - Manual conflict resolution for complex cases
  #
  class ConflictResolver
    Log = ::Log.for(self)

    # Conflict types that can occur during concurrent operations
    enum ConflictType
      VERSION_MISMATCH
      CONCURRENT_DELETE
      DATA_CORRUPTION
      LOCK_FAILURE
    end

    # Represents a conflict that occurred during an operation
    struct Conflict
      property type : ConflictType
      property object_class : String
      property object_id : String
      property expected_version : Int32?
      property actual_version : Int32?
      property message : String

      def initialize(@type : ConflictType, @object_class : String, @object_id : String, @message : String, @expected_version : Int32? = nil, @actual_version : Int32? = nil)
      end
    end

    # Exception raised when a conflict is detected
    class ConflictException < Exception
      getter conflict : Conflict

      def initialize(@conflict : Conflict)
        super("Conflict detected: #{@conflict.message}")
      end
    end

    # Initialize the conflict resolver
    def self.initialize
      Log.info { "Initializing conflict resolver for multi-instance deployments" }
    end

    # Save an object with optimistic locking
    #
    # This method wraps Sepia's save operations with version checking
    # to detect and handle concurrent modifications.
    #
    # ### Parameters
    #
    # - *object* : The Sepia object to save
    # - *expected_version* : Optional expected version (for explicit version checking)
    #
    # ### Returns
    #
    # The saved object with updated version
    #
    # ### Raises
    #
    # - *ConflictException* : If a conflict is detected
    #
    # ### Example
    #
    # ```
    # board = Board.load("board-123")
    # ConflictResolver.save_with_versioning(board)
    # ```
    def self.save_with_versioning(object : Sepia::Serializable | Sepia::Container, expected_version : Int32? = nil)
      object_class = object.class.name
      object_id = object.sepia_id

      begin
        # Get current version before save
        current_version = get_object_version(object)

        # Check for version conflict if expected version is provided
        if expected_version && current_version && current_version != expected_version
          conflict = Conflict.new(
            ConflictType::VERSION_MISMATCH,
            object_class,
            object_id,
            "Version mismatch: expected #{expected_version}, got #{current_version}",
            expected_version,
            current_version
          )
          raise ConflictException.new(conflict)
        end

        # Mark this as an internal operation to prevent echo loops
        operation_key = "#{object_class}:#{object_id}:save"
        FileChangeHandler.mark_internal_operation(operation_key)

        # Save the object
        object.save

        # Update version metadata
        new_version = (current_version || 0) + 1
        set_object_version(object, new_version)

        Log.debug { "Saved #{object_class}:#{object_id} with version #{new_version}" }
        object

      rescue ex : ConflictException
        # Re-raise conflict exceptions
        raise ex
      rescue ex
        # Handle other save errors
        conflict = Conflict.new(
          ConflictType::DATA_CORRUPTION,
          object_class,
          object_id,
          "Save failed: #{ex.message}"
        )
        raise ConflictException.new(conflict)
      end
    end

    # Delete an object with conflict checking
    #
    # This method checks if the object has been modified by another instance
    # before proceeding with deletion.
    #
    # ### Parameters
    #
    # - *object* : The Sepia object to delete
    # - *expected_version* : Optional expected version to check
    #
    # ### Raises
    #
    # - *ConflictException* : If a conflict is detected
    def self.delete_with_versioning(object : Sepia::Serializable | Sepia::Container, expected_version : Int32? = nil)
      object_class = object.class.name
      object_id = object.sepia_id

      begin
        # Check current version if expected version is provided
        if expected_version
          current_version = get_object_version(object)
          if current_version && current_version != expected_version
            conflict = Conflict.new(
              ConflictType::VERSION_MISMATCH,
              object_class,
              object_id,
              "Cannot delete: object was modified. Expected version #{expected_version}, got #{current_version}",
              expected_version,
              current_version
            )
            raise ConflictException.new(conflict)
          end
        end

        # Mark as internal operation
        operation_key = "#{object_class}:#{object_id}:delete"
        FileChangeHandler.mark_internal_operation(operation_key)

        # Delete the object
        object.delete

        # Clean up version metadata
        clear_object_version(object)

        Log.debug { "Deleted #{object_class}:#{object_id}" }

      rescue ex : ConflictException
        # Re-raise conflict exceptions
        raise ex
      rescue ex
        # Handle other delete errors
        conflict = Conflict.new(
          ConflictType::CONCURRENT_DELETE,
          object_class,
          object_id,
          "Delete failed: #{ex.message}"
        )
        raise ConflictException.new(conflict)
      end
    end

    # Get the version of an object
    #
    # Versions are stored as separate metadata files alongside the main object files.
    # This allows version tracking without modifying the object serialization format.
    private def self.get_object_version(object : Sepia::Serializable | Sepia::Container) : Int32?
      storage = Sepia::Storage.backend
      unless storage.is_a?(Sepia::FileStorage)
        return nil # Version tracking only available with FileStorage
      end

      version_file = get_version_file_path(storage, object)
      return nil unless File.exists?(version_file)

      begin
        content = File.read(version_file)
        content.strip.to_i?
      rescue ex
        Log.warn { "Failed to read version for #{object.class.name}:#{object.sepia_id}: #{ex.message}" }
        nil
      end
    end

    # Set the version of an object
    private def self.set_object_version(object : Sepia::Serializable | Sepia::Container, version : Int32)
      storage = Sepia::Storage.backend
      return unless storage.is_a?(Sepia::FileStorage)

      version_file = get_version_file_path(storage, object)
      FileUtils.mkdir_p(File.dirname(version_file))

      File.write(version_file, version.to_s)
    end

    # Clear version metadata for an object
    private def self.clear_object_version(object : Sepia::Serializable | Sepia::Container)
      storage = Sepia::Storage.backend
      return unless storage.is_a?(Sepia::FileStorage)

      version_file = get_version_file_path(storage, object)
      File.delete(version_file) if File.exists?(version_file)
    end

    # Get the path to the version metadata file for an object
    private def self.get_version_file_path(storage : Sepia::FileStorage, object : Sepia::Serializable | Sepia::Container) : String
      object_path = File.join(storage.path, object.class.name, object.sepia_id)
      if object.is_a?(Sepia::Container)
        # For containers, store version in a .version file inside the directory
        File.join(object_path, ".version")
      else
        # For serializable objects, store version in a .version file alongside the object file
        object_path + ".version"
      end
    end

    # Attempt to merge conflicting changes
    #
    # This method provides basic merge strategies for common conflict scenarios.
    # For complex conflicts, manual intervention may be required.
    #
    # ### Parameters
    #
    # - *conflict* : The conflict that occurred
    # - *local_object* : The object from the current instance
    # - *remote_object* : The object from the other instance (if available)
    #
    # ### Returns
    #
    # The merged object if successful, nil if manual resolution is needed
    #
    # ### Example
    #
    # ```
    # conflict = Conflict.new(...)
    # merged = ConflictResolver.attempt_merge(conflict, local_board, remote_board)
    # if merged
    #   ConflictResolver.save_with_versioning(merged)
    # else
    #   # Prompt user for manual resolution
    # end
    # ```
    def self.attempt_merge(conflict : Conflict, local_object : Sepia::Serializable | Sepia::Container?, remote_object : Sepia::Serializable | Sepia::Container?) : Sepia::Serializable | Sepia::Container?
      case conflict.type
      when ConflictType::VERSION_MISMATCH
        attempt_version_merge(local_object, remote_object)
      when ConflictType::CONCURRENT_DELETE
        # For concurrent deletes, prefer the delete operation
        Log.info { "Resolving concurrent delete by preferring delete operation" }
        return nil
      else
        Log.warn { "Cannot auto-resolve conflict type: #{conflict.type}" }
        nil
      end
    end

    # Attempt to merge version conflicts
    private def self.attempt_merge(local_object : Sepia::Serializable | Sepia::Container?, remote_object : Sepia::Serializable | Sepia::Container?) : Sepia::Serializable | Sepia::Container?
      return nil unless local_object && remote_object

      # For now, implement a simple "last write wins" strategy
      # In the future, this could be enhanced with field-level merging

      object_class = local_object.class.name

      # Simple heuristic: use the object with more recent modification time
      # (This would require adding modification time tracking to objects)

      Log.info { "Merging #{object_class} using 'last write wins' strategy" }

      # For now, just return the local object (last write wins)
      local_object
    end

    # Get conflict resolution statistics
    def self.stats : Hash(String, Int32)
      # This could track conflict statistics over time
      # For now, return placeholder data
      {
        "conflicts_detected" => 0,
        "conflicts_resolved" => 0,
        "conflicts_failed"   => 0
      }
    end
  end
end
