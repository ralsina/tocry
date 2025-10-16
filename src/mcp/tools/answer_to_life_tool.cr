require "json"

class AnswerToLifeTool < ModelContextProtocol::Server::Tool
  def initialize
    super(
      name: "answer_to_life",
      description: "Returns the answer to life, the universe, and everything",
      parameters: {
        "type" => JSON::Any.new("object"),
        "properties" => JSON::Any.new({} of String => JSON::Any),
      },
      required_parameters: [] of String
    )
  end

  def invoke(params : Hash(String, JSON::Any)) : Hash(String, JSON::Any)
    # The answer to life, the universe, and everything
    {
      "answer" => JSON::Any.new(42),
      "question" => JSON::Any.new("What do you get if you multiply six by nine?"),
      "explanation" => JSON::Any.new("Though the question was never properly understood, the answer remains 42.")
    }
  end
end
