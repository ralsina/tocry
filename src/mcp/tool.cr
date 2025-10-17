require "json"

# Base class for MCP tools
abstract class Tool
  getter name : String
  getter description : String
  getter input_schema : Hash(String, JSON::Any)

  def initialize(@name : String, @description : String, @input_schema : Hash(String, JSON::Any))
  end

  abstract def invoke(params : Hash(String, JSON::Any)) : Hash(String, JSON::Any)
  abstract def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : Hash(String, JSON::Any)
end
