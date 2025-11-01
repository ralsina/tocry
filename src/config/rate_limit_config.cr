require "yaml"
require "file_utils"

module ToCry
  class RateLimitConfig
    property enabled : Bool

    def enabled? : Bool
      @enabled
    end

    property user_requests : Int32
    property user_window : Int32
    property ai_requests : Int32
    property ai_window : Int32
    property upload_requests : Int32
    property upload_window : Int32
    property auth_requests : Int32
    property auth_window : Int32

    # Default values matching current hardcoded limits
    DEFAULTS = {
      enabled:         true,
      user_requests:   500,
      user_window:     3600, # 1 hour
      ai_requests:     50,
      ai_window:       3600, # 1 hour
      upload_requests: 50,
      upload_window:   3600, # 1 hour
      auth_requests:   20,
      auth_window:     900, # 15 minutes
    }

    def initialize(
      @enabled = DEFAULTS[:enabled],
      @user_requests = DEFAULTS[:user_requests],
      @user_window = DEFAULTS[:user_window],
      @ai_requests = DEFAULTS[:ai_requests],
      @ai_window = DEFAULTS[:ai_window],
      @upload_requests = DEFAULTS[:upload_requests],
      @upload_window = DEFAULTS[:upload_window],
      @auth_requests = DEFAULTS[:auth_requests],
      @auth_window = DEFAULTS[:auth_window]
    )
    end

    # Parse a rate limit string in format "requests/window_seconds"
    # e.g., "500/3600" means 500 requests per 3600 seconds (1 hour)
    private def self.parse_rate_limit_string(limit_str : String) : Tuple(Int32, Int32)?
      return nil if limit_str.empty?

      parts = limit_str.split("/")
      return nil unless parts.size == 2

      requests = parts[0].to_i?
      window = parts[1].to_i?

      return nil unless requests && window && requests > 0 && window > 0

      {requests, window}
    end

    # Load configuration from file and environment variables
    def self.load(config_path : String? = nil) : RateLimitConfig
      config = RateLimitConfig.new

      # Load from config file if provided and exists
      if config_path && File.exists?(config_path)
        load_from_file(config, config_path)
      else
        # Try default config file location
        default_path = File.join("config", "rate_limits.yml")
        if File.exists?(default_path)
          load_from_file(config, default_path)
        end
      end

      # Override with environment variables
      load_from_environment(config)

      # Validate configuration
      validate_config(config)

      config
    end

    # Load configuration from YAML file
    private def self.load_from_file(config : RateLimitConfig, file_path : String)
      yaml_content = File.read(file_path)
      data = YAML.parse(yaml_content)

      if rate_limiting = data["rate_limiting"]?
        if enabled = rate_limiting["enabled"]?
          config.enabled = enabled.as_bool
        end

        if limits = rate_limiting["limits"]?
          if user_limit = limits["user"]?
            if parsed = parse_rate_limit_string(user_limit.as_s)
              config.user_requests, config.user_window = parsed
            end
          end

          if ai_limit = limits["ai"]?
            if parsed = parse_rate_limit_string(ai_limit.as_s)
              config.ai_requests, config.ai_window = parsed
            end
          end

          if upload_limit = limits["upload"]?
            if parsed = parse_rate_limit_string(upload_limit.as_s)
              config.upload_requests, config.upload_window = parsed
            end
          end

          if auth_limit = limits["auth"]?
            if parsed = parse_rate_limit_string(auth_limit.as_s)
              config.auth_requests, config.auth_window = parsed
            end
          end
        end
      end
    rescue ex
      Log.warn(exception: ex) { "Failed to load rate limit config from #{file_path}, using defaults" }
    end

    # Load configuration overrides from environment variables
    private def self.load_from_environment(config : RateLimitConfig)
      # Main enable/disable flag
      if enabled_env = ENV["TOCRY_RATE_LIMITING_ENABLED"]?
        config.enabled = enabled_env.downcase == "true"
      end

      # Individual rate limits
      if user_env = ENV["TOCRY_RATE_LIMIT_USER"]?
        if parsed = parse_rate_limit_string(user_env)
          config.user_requests, config.user_window = parsed
        else
          Log.warn { "Invalid TOCRY_RATE_LIMIT_USER format: #{user_env}, using config file value" }
        end
      end

      if ai_env = ENV["TOCRY_RATE_LIMIT_AI"]?
        if parsed = parse_rate_limit_string(ai_env)
          config.ai_requests, config.ai_window = parsed
        else
          Log.warn { "Invalid TOCRY_RATE_LIMIT_AI format: #{ai_env}, using config file value" }
        end
      end

      if upload_env = ENV["TOCRY_RATE_LIMIT_UPLOAD"]?
        if parsed = parse_rate_limit_string(upload_env)
          config.upload_requests, config.upload_window = parsed
        else
          Log.warn { "Invalid TOCRY_RATE_LIMIT_UPLOAD format: #{upload_env}, using config file value" }
        end
      end

      if auth_env = ENV["TOCRY_RATE_LIMIT_AUTH"]?
        if parsed = parse_rate_limit_string(auth_env)
          config.auth_requests, config.auth_window = parsed
        else
          Log.warn { "Invalid TOCRY_RATE_LIMIT_AUTH format: #{auth_env}, using config file value" }
        end
      end
    end

    # Validate configuration and apply defaults if needed
    private def self.validate_config(config : RateLimitConfig)
      has_errors = false

      # Check for invalid values and apply defaults
      if config.user_requests <= 0 || config.user_window <= 0
        Log.warn { "Invalid user rate limit (#{config.user_requests}/#{config.user_window}), using default (#{DEFAULTS[:user_requests]}/#{DEFAULTS[:user_window]})" }
        config.user_requests = DEFAULTS[:user_requests]
        config.user_window = DEFAULTS[:user_window]
        has_errors = true
      end

      if config.ai_requests <= 0 || config.ai_window <= 0
        Log.warn { "Invalid AI rate limit (#{config.ai_requests}/#{config.ai_window}), using default (#{DEFAULTS[:ai_requests]}/#{DEFAULTS[:ai_window]})" }
        config.ai_requests = DEFAULTS[:ai_requests]
        config.ai_window = DEFAULTS[:ai_window]
        has_errors = true
      end

      if config.upload_requests <= 0 || config.upload_window <= 0
        Log.warn { "Invalid upload rate limit (#{config.upload_requests}/#{config.upload_window}), using default (#{DEFAULTS[:upload_requests]}/#{DEFAULTS[:upload_window]})" }
        config.upload_requests = DEFAULTS[:upload_requests]
        config.upload_window = DEFAULTS[:upload_window]
        has_errors = true
      end

      if config.auth_requests <= 0 || config.auth_window <= 0
        Log.warn { "Invalid auth rate limit (#{config.auth_requests}/#{config.auth_window}), using default (#{DEFAULTS[:auth_requests]}/#{DEFAULTS[:auth_window]})" }
        config.auth_requests = DEFAULTS[:auth_requests]
        config.auth_window = DEFAULTS[:auth_window]
        has_errors = true
      end

      if has_errors
        Log.warn { "Rate limiting configuration had errors, using defaults for invalid values" }
      end

      # If rate limiting is completely misconfigured, disable it for safety
      if has_errors && config.enabled
        Log.info { "Rate limiting enabled but with some default values applied" }
      end
    end

    # Get configuration as a hash for logging
    def to_h : Hash(String, String | Bool)
      {
        "enabled"      => enabled?,
        "user_limit"   => "#{@user_requests}/#{@user_window}",
        "ai_limit"     => "#{@ai_requests}/#{@ai_window}",
        "upload_limit" => "#{@upload_requests}/#{@upload_window}",
        "auth_limit"   => "#{@auth_requests}/#{@auth_window}",
      }
    end
  end
end
