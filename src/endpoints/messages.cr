require "kemal"
require "../tocry"
require "./helpers"

module ToCry::Endpoints::Messages
  # API Endpoint to get messages for the current user
  # Supports query parameters:
  # - status: filter by status (unread, read, archived)
  # - type: filter by message_type
  get "/messages" do |env|
    user = ToCry.get_current_user_id(env)

    # Get query parameters
    status_filter = env.params.query["status"]?
    type_filter = env.params.query["type"]?

    # Get messages for user
    messages = ToCry::Message.find_for_user(user, status_filter)

    # Filter by type if specified
    if type_filter
      messages = messages.select { |message| message.message_type == type_filter }
    end

    # Return message data without full content for list view
    message_data = messages.map do |message|
      {
        id: message.id,
        from_user: message.from_user,
        subject: message.subject,
        preview: message.content[0..100] + (message.content.size > 100 ? "..." : ""),
        message_type: message.message_type,
        status: message.status,
        created_at: message.created_at.to_rfc3339,
        read_at: message.read_at.try(&.to_rfc3339),
        metadata: message.metadata
      }
    end

    ToCry::Endpoints::Helpers.success_response(env, message_data)
  end

  # API Endpoint to get unread message count
  get "/messages/unread-count" do |env|
    user = ToCry.get_current_user_id(env)
    count = ToCry::Message.unread_count(user)

    ToCry::Endpoints::Helpers.success_response(env, {count: count})
  end

  # API Endpoint to get a specific message
  get "/messages/:id" do |env|
    user = ToCry.get_current_user_id(env)
    message_id = env.params.url["id"].as(String)

    message = ToCry::Message.find_by_id(message_id)

    unless message
      env.response.status_code = 404
      next ToCry::Endpoints::Helpers.error_response(env, "Message not found", 404)
    end

    # Check if user is authorized to view this message
    unless message.to_user == user || message.from_user == user
      env.response.status_code = 403
      next ToCry::Endpoints::Helpers.error_response(env, "Access denied", 403)
    end

    # Mark as read if recipient is viewing
    if message.to_user == user && message.unread?
      message.mark_as_read
    end

    ToCry::Endpoints::Helpers.success_response(env, message)
  end

  # API Endpoint to send a new message
  post "/messages" do |env|
    json_body = ToCry::Endpoints::Helpers.get_json_body(env)
    payload = SendMessagePayload.from_json(json_body)

    from_user = ToCry.get_current_user_id(env)

    # Validate required fields
    if payload.to_user.empty? || payload.subject.empty? || payload.content.empty?
      env.response.status_code = 400
      next ToCry::Endpoints::Helpers.error_response(env, "to_user, subject, and content are required", 400)
    end

    # Send the message
    message = ToCry::Message.send_message(
      from_user,
      payload.to_user,
      payload.subject,
      payload.content,
      payload.message_type || "direct",
      payload.metadata
    )

    ToCry::Endpoints::Helpers.created_response(env, {success: "Message sent", message_id: message.id})
  end

  # API Endpoint to mark a message as read
  put "/messages/:id/read" do |env|
    user = ToCry.get_current_user_id(env)
    message_id = env.params.url["id"].as(String)

    message = ToCry::Message.find_by_id(message_id)

    unless message
      env.response.status_code = 404
      next ToCry::Endpoints::Helpers.error_response(env, "Message not found", 404)
    end

    # Check if user is authorized (only recipient can mark as read)
    unless message.to_user == user
      env.response.status_code = 403
      next ToCry::Endpoints::Helpers.error_response(env, "Access denied", 403)
    end

    message.mark_as_read

    ToCry::Endpoints::Helpers.success_response(env, {success: "Message marked as read"})
  end

  # API Endpoint to archive/delete a message
  delete "/messages/:id" do |env|
    user = ToCry.get_current_user_id(env)
    message_id = env.params.url["id"].as(String)

    message = ToCry::Message.find_by_id(message_id)

    unless message
      env.response.status_code = 404
      next ToCry::Endpoints::Helpers.error_response(env, "Message not found", 404)
    end

    # Check if user is authorized (recipient or sender can archive)
    unless message.to_user == user || message.from_user == user
      env.response.status_code = 403
      next ToCry::Endpoints::Helpers.error_response(env, "Access denied", 403)
    end

    message.archive

    ToCry::Endpoints::Helpers.success_response(env, {success: "Message archived"})
  end

  # Payload Structs
  struct SendMessagePayload
    include JSON::Serializable
    property to_user : String
    property subject : String
    property content : String
    property message_type : String?
    property metadata : JSON::Any?
  end
end
