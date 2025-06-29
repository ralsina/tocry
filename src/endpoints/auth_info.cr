require "kemal"

module ToCry::Endpoints::AuthInfo
  get "/auth_mode" do |env|
    env.response.content_type = "application/json"

    use_google_auth = ENV["GOOGLE_CLIENT_ID"]? && ENV["GOOGLE_CLIENT_SECRET"]?
    use_basic_auth = ENV["TOCRY_AUTH_USER"]? && ENV["TOCRY_AUTH_PASS"]?

    auth_mode = if use_google_auth
                  "google"
                elsif use_basic_auth
                  "basic"
                else
                  "noauth"
                end

    {auth_mode: auth_mode}.to_json
  end
end
