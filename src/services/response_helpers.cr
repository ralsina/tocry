require "../tocry"

module ToCry::Services
  # Shared response helper methods for service layer
  # Provides consistent response structure across all services
  module ResponseHelpers
    # Helper method for consistent success responses
    def self.success_response(message : String)
      {
        success: true,
        message: message,
      }
    end

    # Helper method for consistent error responses
    def self.error_response(message : String)
      {
        success: false,
        message: message,
      }
    end
  end
end
