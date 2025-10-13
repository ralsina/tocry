require "../spec_helper"

describe "Authentication API using Generated Client" do
  describe "GET /api/v1/auth_mode" do
    it "should return authentication mode" do
      auth_response = APITestHelpers.auth_api.get_auth_mode

      auth_response.auth_mode.should_not be_nil
      ["google", "basic", "noauth"].should contain(auth_response.auth_mode.not_nil!)
    end

    it "should return consistent authentication mode across calls" do
      first_response = APITestHelpers.auth_api.get_auth_mode
      second_response = APITestHelpers.auth_api.get_auth_mode

      first_response.auth_mode.should eq(second_response.auth_mode)
    end
  end

  describe "Authentication Configuration" do
    it "should allow client configuration without errors" do
      # Test that we can reconfigure the auth client
      OpenAPIClient.configure do |config|
        config.host = "localhost:#{TEST_PORT}"
        config.scheme = "http"
        config.debugging = false
      end

      # This should not raise any errors
      response = APITestHelpers.auth_api.get_auth_mode
      response.auth_mode.should_not be_nil
    end
  end
end
