require "spec"
require "../src/tocry"
require "../src/initialization"
require "../lib/tocry_api/src/openapi_client"
require "file_utils"

# API Test Configuration
TEST_PORT     = 3001
TEST_DATA_DIR = "/tmp/tocry-test-data"

# Clean up test data directory before tests
def cleanup_test_data
  return unless Dir.exists?(TEST_DATA_DIR)
  FileUtils.rm_rf(TEST_DATA_DIR)
end

# Clean up at the start
cleanup_test_data

# Configure the generated API client for tests
def configure_test_client
  OpenAPIClient.configure do |config|
    config.host = "localhost:#{TEST_PORT}"
    config.scheme = "http"
    config.debugging = false
  end
end

# Helper methods for API tests using generated client
module APITestHelpers
  @@boards_api : OpenAPIClient::BoardsApi?
  @@notes_api : OpenAPIClient::NotesApi?
  @@uploads_api : OpenAPIClient::UploadsApi?
  @@auth_api : OpenAPIClient::AuthenticationApi?

  def self.boards_api
    @@boards_api ||= OpenAPIClient::BoardsApi.new
  end

  def self.notes_api
    @@notes_api ||= OpenAPIClient::NotesApi.new
  end

  def self.uploads_api
    @@uploads_api ||= OpenAPIClient::UploadsApi.new
  end

  def self.auth_api
    @@auth_api ||= OpenAPIClient::AuthenticationApi.new
  end

  def self.get(url : String)
    # For GET requests, we'll handle them at the API level
    raise NotImplementedError.new("Use the specific API methods instead of generic GET")
  end

  def self.post(url : String, form = {} of String => String, **args)
    # For POST requests, we'll handle them at the API level
    raise NotImplementedError.new("Use the specific API methods instead of generic POST")
  end

  def self.put(url : String, form = {} of String => String, **args)
    # For PUT requests, we'll handle them at the API level
    raise NotImplementedError.new("Use the specific API methods instead of generic PUT")
  end

  def self.delete(url : String, **args)
    # For DELETE requests, we'll handle them at the API level
    raise NotImplementedError.new("Use the specific API methods instead of generic DELETE")
  end
end

# Configure the client for tests
configure_test_client
