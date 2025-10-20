require "crest"
require "json"

post "/api/v1/z-ai/completions" do |env|
  body = env.request.body.try(&.gets_to_end) || ""
  if body.empty?
    env.response.status_code = 400
    next {error: "Request body is empty."}.to_json
  end

  # Log the raw request for debugging
  ToCry::Log.info { "Z.AI Request body: #{body}" }

  begin
    json_body = JSON.parse(body)
    text = json_body["text"]?.try(&.as_s)
    prompt = json_body["prompt"]?.try(&.as_s)

    # Log parsed values
    ToCry::Log.info { "Z.AI Parsed - text: #{text}, prompt: #{prompt}" }

    if text.nil? && prompt.nil?
      env.response.status_code = 400
      next {error: "Both 'text' and 'prompt' parameters are missing or empty."}.to_json
    end

    api_key = ENV["Z_AI_API_KEY"]?
    unless api_key
      env.response.status_code = 500
      next {error: "Z_AI_API_KEY environment variable not set."}.to_json
    end

    # Log API key (masked) for debugging
    ToCry::Log.info { "Z.AI Using API key: #{api_key[0..8]}...#{api_key[-4..-1]}" }

    headers = HTTP::Headers{
      "Authorization"   => "Bearer #{api_key}",
      "Content-Type"    => "application/json",
      "Accept-Language" => "en-US,en",
    }
    ToCry::Log.info { "Z.AI Request headers: #{headers}" }

    # Construct the user message based on prompt and text
    user_content = if prompt && text
                     "#{prompt}\n\nText to process:\n#{text}"
                   elsif prompt
                     prompt
                   elsif text
                     "Please process this text:\n#{text}"
                   else
                     "Hello, please introduce yourself."
                   end

    z_ai_body = {
      "model"    => ToCry.ai_model,
      "messages" => [
        {"role" => "system", "content" => "You are a helpful AI assistant. IMPORTANT: Always provide your response as a replacement for the original text. If the original text is already perfect and needs no changes, return the original text unchanged. Your response must be valid markdown that can directly replace the original text."},
        {"role" => "user", "content" => user_content},
      ],
    }

    # Log the constructed request
    request_json = z_ai_body.to_json
    ToCry::Log.info { "Z.AI Sending request body: #{request_json}" }
    ToCry::Log.info { "Z.AI Request JSON length: #{request_json.bytesize} bytes" }

    # Try using HTTP::Client instead of Crest to match curl behavior
    uri = URI.parse("https://api.z.ai/api/paas/v4/chat/completions")
    client = HTTP::Client.new(uri)

    # Create headers explicitly for the POST request
    request_headers = HTTP::Headers{
      "Authorization"   => "Bearer #{api_key}",
      "Content-Type"    => "application/json",
      "Accept-Language" => "en-US,en",
    }

    ToCry::Log.info { "Z.AI Making request with HTTP::Client to: #{uri}" }
    response = client.post(uri.path, request_headers, request_json)

    ToCry::Log.info { "Z.AI Response status: #{response.status_code}" }
    ToCry::Log.info { "Z.AI Response body: #{response.body}" }

    # If we get a 400/500 error from z.ai, log the full response for debugging
    if response.status_code >= 400
      ToCry::Log.error { "Z.AI API Error Response - Status: #{response.status_code}, Body: #{response.body}" }
    end

    env.response.content_type = "application/json"
    env.response.status_code = response.status_code
    response.body
  rescue ex : Crest::BadRequest
    # Handle 400 errors specifically to get more details
    ToCry::Log.error { "Z.AI API 400 Bad Request - likely invalid request format or API key issue" }
    env.response.status_code = 400
    {error: "z.ai API returned Bad Request - check API key and request format"}.to_json
  rescue ex : JSON::ParseException
    env.response.status_code = 400
    ToCry::Log.error { "Z.AI JSON parse error: #{ex.message}" }
    {error: "Invalid JSON in request body: #{ex.message}"}.to_json
  rescue ex : Exception
    env.response.status_code = 500
    ToCry::Log.error(exception: ex) { "Error calling z.ai API: #{ex.message}" }
    {error: "Error calling z.ai API: #{ex.message}"}.to_json
  end
end
