require "./spec_helper"
require "../src/config/rate_limit_config"

describe ToCry::RateLimitConfig do
  describe ".load" do
    context "with no config file and no environment variables" do
      it "uses built-in defaults" do
        # Clean environment
        ENV.delete("TOCRY_RATE_LIMITING_ENABLED")
        ENV.delete("TOCRY_RATE_LIMIT_USER")
        ENV.delete("TOCRY_RATE_LIMIT_AI")
        ENV.delete("TOCRY_RATE_LIMIT_UPLOAD")
        ENV.delete("TOCRY_RATE_LIMIT_AUTH")

        config = ToCry::RateLimitConfig.load("/nonexistent/config.yml")

        config.enabled?.should eq(ToCry::RateLimitConfig::DEFAULTS[:enabled])
        config.user_requests.should eq(ToCry::RateLimitConfig::DEFAULTS[:user_requests])
        config.user_window.should eq(ToCry::RateLimitConfig::DEFAULTS[:user_window])
        config.ai_requests.should eq(ToCry::RateLimitConfig::DEFAULTS[:ai_requests])
        config.ai_window.should eq(ToCry::RateLimitConfig::DEFAULTS[:ai_window])
        config.upload_requests.should eq(ToCry::RateLimitConfig::DEFAULTS[:upload_requests])
        config.upload_window.should eq(ToCry::RateLimitConfig::DEFAULTS[:upload_window])
        config.auth_requests.should eq(ToCry::RateLimitConfig::DEFAULTS[:auth_requests])
        config.auth_window.should eq(ToCry::RateLimitConfig::DEFAULTS[:auth_window])
      end
    end

    context "with environment variables" do
      it "overrides defaults with environment variables" do
        # Set environment variables
        ENV["TOCRY_RATE_LIMITING_ENABLED"] = "false"
        ENV["TOCRY_RATE_LIMIT_USER"] = "200/3600"
        ENV["TOCRY_RATE_LIMIT_AI"] = "15/1800"

        config = ToCry::RateLimitConfig.load

        # Environment variables should override defaults
        config.enabled?.should eq(false)
        config.user_requests.should eq(200)
        config.user_window.should eq(3600)
        config.ai_requests.should eq(15)
        config.ai_window.should eq(1800)

        # Non-overridden settings should use defaults
        config.upload_requests.should eq(ToCry::RateLimitConfig::DEFAULTS[:upload_requests])
        config.upload_window.should eq(ToCry::RateLimitConfig::DEFAULTS[:upload_window])
        config.auth_requests.should eq(ToCry::RateLimitConfig::DEFAULTS[:auth_requests])
        config.auth_window.should eq(ToCry::RateLimitConfig::DEFAULTS[:auth_window])

        # Clean environment
        ENV.delete("TOCRY_RATE_LIMITING_ENABLED")
        ENV.delete("TOCRY_RATE_LIMIT_USER")
        ENV.delete("TOCRY_RATE_LIMIT_AI")
      end
    end
  end

  describe "#to_h" do
    it "returns configuration as hash" do
      config = ToCry::RateLimitConfig.new(
        enabled: true,
        user_requests: 100,
        user_window: 1800,
        ai_requests: 25,
        ai_window: 3600,
        upload_requests: 30,
        upload_window: 1800,
        auth_requests: 10,
        auth_window: 600
      )

      hash = config.to_h

      hash["enabled"].should eq(true)
      hash["user_limit"].should eq("100/1800")
      hash["ai_limit"].should eq("25/3600")
      hash["upload_limit"].should eq("30/1800")
      hash["auth_limit"].should eq("10/600")
    end
  end

  describe "environment variable parsing" do
    it "parses valid rate limit strings" do
      ENV["TOCRY_RATE_LIMIT_USER"] = "500/3600"
      config = ToCry::RateLimitConfig.load

      config.user_requests.should eq(500)
      config.user_window.should eq(3600)

      ENV.delete("TOCRY_RATE_LIMIT_USER")
    end

    it "handles invalid rate limit strings gracefully" do
      # Invalid format should fall back to defaults
      ENV["TOCRY_RATE_LIMIT_USER"] = "invalid"
      config = ToCry::RateLimitConfig.load

      config.user_requests.should eq(ToCry::RateLimitConfig::DEFAULTS[:user_requests])
      config.user_window.should eq(ToCry::RateLimitConfig::DEFAULTS[:user_window])

      ENV.delete("TOCRY_RATE_LIMIT_USER")
    end
  end
end
