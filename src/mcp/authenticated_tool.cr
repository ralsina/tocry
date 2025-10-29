# Mixin for MCP tools that require authentication
# Provides the common invoke() method that extracts user_id from env and calls invoke_with_user
module AuthenticatedTool
  def invoke(params : Hash(String, JSON::Any), env : HTTP::Server::Context? = nil)
    if env
      # Extract user_id using ToCry's authentication system
      user_id = ToCry.get_current_user_id(env)
      # Call the tool's invoke_with_user method that returns a Hash directly
      invoke_with_user(params, user_id)
    else
      # No environment context available, authentication not possible
      raise "Authentication required: No context available"
    end
  end

  # ToCry tools should implement this method and return Hash directly
  abstract def invoke_with_user(params : Hash(String, JSON::Any), user_id : String)
end
