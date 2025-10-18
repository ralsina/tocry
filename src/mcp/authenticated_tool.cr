# Mixin for MCP tools that require authentication
# Provides the common invoke() method that raises "Authentication required"
module AuthenticatedTool
  def invoke(params : Hash(String, JSON::Any)) : Hash(String, JSON::Any)
    # Not used - authentication required for all tools
    raise "Authentication required"
  end
end
