require "rate_limiter"
require "../config/rate_limit_config"

module ToCry
  class RateLimitService
    # Singleton instance for easy access
    @@instance : RateLimitService?

    # Rate limiters for different purposes
    property user_limiter : RateLimiter   # Per user rate limiting (general usage)
    property ai_limiter : RateLimiter     # Per user AI operations (expensive)
    property auth_limiter : RateLimiter   # Authentication attempts
    property upload_limiter : RateLimiter # File uploads
    property config : RateLimitConfig     # Configuration settings

    def initialize(@config : RateLimitConfig = RateLimitConfig.load)
      # Configure rate limits from configuration
      @user_limiter = RateLimiter.new(@config.user_requests, @config.user_window)
      @ai_limiter = RateLimiter.new(@config.ai_requests, @config.ai_window)
      @upload_limiter = RateLimiter.new(@config.upload_requests, @config.upload_window)
      @auth_limiter = RateLimiter.new(@config.auth_requests, @config.auth_window)
    end

    # Get singleton instance
    def self.instance
      @@instance ||= new
    end

    # Check if a request is allowed based on user
    def allow_request?(user_id : String?, ip_address : String? = nil, endpoint : String? = nil) : Bool
      # If rate limiting is disabled, allow all requests
      return true unless @config.enabled

      return true unless user_id # No rate limiting for unauthenticated users if needed

      limits = [] of Bool

      # Always check general user rate limit
      limits << @user_limiter.allow?(user_id)

      # Check AI rate limit for expensive AI operations
      if endpoint && ai_endpoint?(endpoint)
        limits << @ai_limiter.allow?(user_id)
      end

      # Check upload rate limit for upload endpoints
      if endpoint && endpoint.includes?("upload")
        limits << @upload_limiter.allow?(user_id)
      end

      # Check authentication rate limit for auth endpoints
      if endpoint && (endpoint.includes?("login") || endpoint.includes?("auth"))
        limits << @auth_limiter.allow?(user_id)
      end

      # Apply short-circuit evaluation - request is allowed if ALL applicable limiters allow it
      # For non-AI: just user limiter needs to allow
      # For AI: both user and AI limiters need to allow
      limits.all?
    end

    # Check if endpoint is AI-related (expensive operations)
    private def ai_endpoint?(endpoint : String) : Bool
      # AI completion endpoint is expensive to run
      endpoint == "/api/v1/z-ai/completions"
    end
  end
end
