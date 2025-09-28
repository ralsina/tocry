require "uuid"
require "sepia"
require "json"

module ToCry
  # Message model for internal messaging system
  # Supports user-to-user messaging with different message types
  class Message < Sepia::Object
    include JSON::Serializable
    include Sepia::Container

    property id : String
    property from_user : String
    property to_user : String
    property subject : String
    property content : String
    property message_type : String # "direct", "share_request", "system"
    property status : String       # "unread", "read", "archived"
    property created_at : Time
    property read_at : Time?
    property metadata : JSON::Any?

    # Constructor for new messages
    def initialize(@from_user : String, @to_user : String, @subject : String,
                   @content : String, @message_type : String = "direct",
                   @metadata : JSON::Any? = nil)
      @id = UUID.random.to_s
      @status = "unread"
      @created_at = Time.utc
      @read_at = nil
    end

    # Default constructor for deserialization
    def initialize(@id : String = "", @from_user : String = "", @to_user : String = "",
                   @subject : String = "", @content : String = "", @message_type : String = "direct",
                   @status : String = "unread", @created_at : Time = Time.utc,
                   @read_at : Time? = nil, @metadata : JSON::Any? = nil)
    end

    # Mark message as read
    def mark_as_read
      @status = "read"
      @read_at = Time.utc
      save
    end

    # Archive message
    def archive
      @status = "archived"
      save
    end

    # Check if message is unread
    def unread? : Bool
      @status == "unread"
    end

    # Check if message is read
    def read? : Bool
      @status == "read"
    end

    # Check if message is archived
    def archived? : Bool
      @status == "archived"
    end

    # Find all messages for a user (recipient)
    def self.find_for_user(user_id : String, status : String? = nil) : Array(Message)
      results = [] of Message

      begin
        ids = Sepia::Storage.list_all(Message)
        ids.each do |message_id|
          begin
            message = Message.load(message_id)
            # Check if message is for this user and matches status filter
            if message.to_user == user_id
              if status.nil? || message.status == status
                results << message
              end
            end
          rescue ex
            Log.warn { "Failed to load Message #{message_id}: #{ex.message}" }
            next
          end
        end

        # Sort by created_at (newest first)
        results.sort_by!(&.created_at).reverse!
      rescue ex
        Log.warn { "Error in Message.find_for_user(#{user_id}): #{ex.message}" }
      end

      results
    end

    # Count unread messages for a user
    def self.unread_count(user_id : String) : Int32
      find_for_user(user_id, "unread").size
    end

    # Find messages sent by a user
    def self.sent_by_user(user_id : String) : Array(Message)
      results = [] of Message

      begin
        ids = Sepia::Storage.list_all(Message)
        ids.each do |message_id|
          begin
            message = Message.load(message_id)
            if message.from_user == user_id
              results << message
            end
          rescue
            next
          end
        end

        # Sort by created_at (newest first)
        results.sort_by!(&.created_at).reverse!
      rescue
        # Return empty array on error
      end

      results
    end

    # Send a new message
    def self.send_message(from_user : String, to_user : String, subject : String,
                          content : String, message_type : String = "direct",
                          metadata : JSON::Any? = nil) : Message
      message = Message.new(from_user, to_user, subject, content, message_type, metadata)
      message.save

      Log.info { "Message sent from #{from_user} to #{to_user}: #{subject}" }
      message
    end

    # Find a specific message by ID
    def self.find_by_id(message_id : String) : Message?
      Message.load(message_id)
    rescue
      nil
    end
  end
end
