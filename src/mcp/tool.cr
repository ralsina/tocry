require "json"

# Base class for MCP tools
abstract class Tool
  getter name : String
  getter description : String
  getter input_schema : Hash(String, JSON::Any)

  # Class-level tool registry
  class_property registered_tools = {} of String => Tool

  # Class properties that can be overridden by subclasses
  class_property tool_name : String = "tool"
  class_property tool_description : String = "A generic tool"
  class_property tool_input_schema : Hash(String, JSON::Any) = {
    "type"       => JSON::Any.new("object"),
    "properties" => JSON::Any.new({} of String => JSON::Any),
  }

  def initialize
    @name = @@tool_name
    @description = @@tool_description
    @input_schema = @@tool_input_schema
  end

  abstract def invoke(params : Hash(String, JSON::Any)) : Hash(String, JSON::Any)
  abstract def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : String
end
