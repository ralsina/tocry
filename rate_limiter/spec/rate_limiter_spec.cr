require "spec"
require "../src/rate_limiter/rate_limiter"
require "../src/rate_limiter/rate_limit_result"

describe RateLimiter do
  describe "basic functionality" do
    it "allows requests within limit" do
      limiter = RateLimiter.new(5, 60)  # 5 requests per minute

      5.times do |i|
        limiter.allow?("user1").should be_true
      end
    end

    it "rejects requests exceeding limit" do
      limiter = RateLimiter.new(3, 60)  # 3 requests per minute

      # First 3 should be allowed
      3.times { limiter.allow?("user1").should be_true }

      # 4th should be rejected
      limiter.allow?("user1").should be_false
    end

    it "handles different keys independently" do
      limiter = RateLimiter.new(2, 60)  # 2 requests per minute

      # User1 can make 2 requests
      2.times { limiter.allow?("user1").should be_true }
      limiter.allow?("user1").should be_false

      # User2 can still make 2 requests
      2.times { limiter.allow?("user2").should be_true }
      limiter.allow?("user2").should be_false
    end

    it "provides detailed result information" do
      limiter = RateLimiter.new(3, 60)

      result = limiter.check("user1")
      result.allowed?.should be_true
      result.remaining.should eq(2)
      result.total_requests.should eq(1)

      # Make 2 more requests
      limiter.allow?("user1")
      limiter.allow?("user1")

      result = limiter.check("user1")
      result.allowed?.should be_false
      result.remaining.should eq(0)
      result.total_requests.should eq(3)
    end

    it "resets after window expires" do
      limiter = RateLimiter.new(2, 1)  # 2 requests per 1 second

      # Use up the limit
      2.times { limiter.allow?("user1").should be_true }
      limiter.allow?("user1").should be_false

      # Wait for window to reset (in real tests you'd mock Time)
      sleep(1.1)

      # Should be allowed again
      limiter.allow?("user1").should be_true
    end

    it "provides status while consuming requests" do
      limiter = RateLimiter.new(2, 60)

      # Check status (check method does consume a request)
      result = limiter.check("user1")
      result.allowed?.should be_true
      result.remaining.should eq(1)  # 1 remaining after consuming 1
      result.total_requests.should eq(1)

      # Now have only 1 request available (since check consumed 1)
      limiter.allow?("user1").should be_true
      limiter.allow?("user1").should be_false
    end

    it "can reset individual keys" do
      limiter = RateLimiter.new(2, 60)

      # Use up limit
      2.times { limiter.allow?("user1").should be_true }
      limiter.allow?("user1").should be_false

      # Reset key
      limiter.reset_key!("user1")

      # Should be allowed again
      limiter.allow?("user1").should be_true
    end

    it "can reset all data" do
      limiter = RateLimiter.new(2, 60)

      # Use up limit for multiple users
      2.times { limiter.allow?("user1").should be_true }
      limiter.allow?("user1").should be_false

      2.times { limiter.allow?("user2").should be_true }
      limiter.allow?("user2").should be_false

      # Reset all
      limiter.reset!

      # Both should be allowed again
      limiter.allow?("user1").should be_true
      limiter.allow?("user2").should be_true
    end
  end

  describe "your use case pattern" do
    it "works with multiple independent limiters" do
      # Create rate limiters for different purposes
      user_limiter = RateLimiter.new(3, 60)     # 3 per minute per user
      ip_limiter = RateLimiter.new(5, 60)       # 5 per minute per IP
      endpoint_limiter = RateLimiter.new(2, 60)  # 2 per minute per endpoint

      username = "test_user"
      ip = "192.168.1.1"
      endpoint = "api::notes"
      user_endpoint_key = "#{username}::#{endpoint}"

      # All requests should be allowed initially
      user_allowed = user_limiter.allow?(username)
      ip_allowed = ip_limiter.allow?(ip)
      endpoint_allowed = endpoint_limiter.allow?(endpoint)
      user_endpoint_allowed = endpoint_limiter.allow?(user_endpoint_key)

      [user_allowed, ip_allowed, endpoint_allowed, user_endpoint_allowed].any?.should be_true

      # Use up user limiter
      user_limiter.allow?(username)
      user_limiter.allow?(username)

      # Now user_limiter should be false, but others might still be true
      user_allowed = user_limiter.allow?(username)
      ip_allowed = ip_limiter.allow?(ip)
      endpoint_allowed = endpoint_limiter.allow?(endpoint)
      user_endpoint_allowed = endpoint_limiter.allow?(user_endpoint_key)

      # Overall should still be true because other limiters allow it
      [user_allowed, ip_allowed, endpoint_allowed, user_endpoint_allowed].any?.should be_true

      # But individual user limiter is now false
      user_allowed.should be_false
    end
  end

  describe "edge cases" do
    it "handles zero requests limit" do
      limiter = RateLimiter.new(0, 60)
      limiter.allow?("user1").should be_false
    end

    it "handles very short windows" do
      limiter = RateLimiter.new(2, 1) # 2 requests per 1 second

      limiter.allow?("user1").should be_true
      limiter.allow?("user1").should be_true
      limiter.allow?("user1").should be_false

      sleep(1.1)
      limiter.allow?("user1").should be_true
    end

    it "handles many different keys efficiently" do
      limiter = RateLimiter.new(1, 60)

      # Test with 100 different keys
      (1..100).each do |i|
        key = "user#{i}"
        limiter.allow?(key).should be_true
        limiter.allow?(key).should be_false
      end
    end

    it "provides accurate remaining counts" do
      limiter = RateLimiter.new(5, 60)

      result = limiter.check("user1")
      result.remaining.should eq(4)  # 4 remaining after consuming 1

      limiter.allow?("user1")
      result = limiter.check("user1")
      result.remaining.should eq(2)  # 2 remaining after consuming another

      limiter.allow?("user1")
      limiter.allow?("user1")
      result = limiter.check("user1")
      result.remaining.should eq(0)  # 0 remaining after consuming another
    end
  end

  describe "thread safety" do
    it "handles concurrent access safely" do
      limiter = RateLimiter.new(10, 60)
      results = Channel(Bool).new

      # Spawn 20 threads trying to access the same key
      20.times do
        spawn do
          result = limiter.allow?("concurrent_user")
          results.send(result)
        end
      end

      # Collect results
      allowed_count = 0
      20.times do
        allowed_count += 1 if results.receive
      end

      # Should allow exactly 10 requests (the limit)
      allowed_count.should eq(10)
    end

    it "handles concurrent access to different keys" do
      limiter = RateLimiter.new(5, 60)
      results = Channel(Bool).new

      # Spawn 10 threads each accessing different keys
      10.times do |i|
        spawn do
          key = "user#{i}"
          result = limiter.allow?(key)
          results.send(result)
        end
      end

      # Collect results
      allowed_count = 0
      10.times do
        allowed_count += 1 if results.receive
      end

      # All should be allowed since they're different keys
      allowed_count.should eq(10)
    end
  end

  describe "sliding window behavior" do
    it "implements sliding window correctly" do
      limiter = RateLimiter.new(3, 2) # 3 requests per 2 seconds

      # Make 3 requests quickly
      limiter.allow?("sliding_user").should be_true
      limiter.allow?("sliding_user").should be_true
      limiter.allow?("sliding_user").should be_true

      # Should be blocked now
      limiter.allow?("sliding_user").should be_false

      # Wait 1 second (still within window)
      sleep(1)
      limiter.allow?("sliding_user").should be_false

      # Wait another 1.2 seconds (window should slide)
      sleep(1.2)
      limiter.allow?("sliding_user").should be_true
    end

    it "gradually recovers capacity in sliding window" do
      limiter = RateLimiter.new(5, 3) # 5 requests per 3 seconds

      # Use up all requests
      5.times { limiter.allow?("recovery_user").should be_true }
      limiter.allow?("recovery_user").should be_false

      # Wait 1 second (about 1/3 of window)
      sleep(1)

      # Should still be blocked since we need more time
      limiter.allow?("recovery_user").should be_false

      # Wait another 2.2 seconds (total 3.2 seconds, more than full window)
      sleep(2.2)

      # Should allow at least 1 request now since window has fully reset
      limiter.allow?("recovery_user").should be_true

      # And should allow another since we have a fresh window
      limiter.allow?("recovery_user").should be_true
    end
  end
end
