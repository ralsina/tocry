require "json"
require "../tool"

class AnswerToLifeTool < Tool
  def initialize
    super(
      name: "answer_to_life",
      description: "Returns the answer to life, the universe, and everything",
      input_schema: {
        "type"       => JSON::Any.new("object"),
        "properties" => JSON::Any.new({} of String => JSON::Any),
      }
    )
  end

  def invoke(params : Hash(String, JSON::Any)) : Hash(String, JSON::Any)
    # Not used - authentication required for all tools
    raise "Authentication required"
  end

  def invoke_with_user(params : Hash(String, JSON::Any), user_id : String) : Hash(String, JSON::Any)
    # The answer to life, the universe, and everything
    {
      "answer"      => JSON::Any.new(42),
      "question"    => JSON::Any.new("What do you get if you multiply six by nine?"),
      "explanation" => JSON::Any.new("Though the question was never properly understood, the answer remains 42."),
      "user"        => JSON::Any.new(user_id),
    }
  end
end
