require "deque"
require "./rate_limit_result"

class RateLimiter
  # Internal structure to track request timestamps for each key
  private struct KeyData
    property timestamps : Deque(Time)
    property last_cleanup : Time

    def initialize
      @timestamps = Deque(Time).new
      @last_cleanup = Time.utc
    end
  end

  def initialize(@max_requests : Int32, @window_seconds : Int32)
    @data = {} of String => KeyData
    @mutex = Mutex.new
  end

  # Main method: returns true if request is allowed, false if rate limited
  def allow?(key : String) : Bool
    check(key).allowed?
  end

  # Detailed method: returns comprehensive result information
  def check(key : String) : RateLimitResult
    @mutex.synchronize do
      now = Time.utc

      # Get or create data for this key
      key_data = @data[key] ||= KeyData.new

      # Clean up old timestamps (do this periodically)
      cleanup_old_timestamps(key_data, now) if now - key_data.last_cleanup > 60.seconds

      # Count requests within the window
      requests_in_window = count_requests_in_window(key_data, now)

      # Check if request is allowed
      if requests_in_window < @max_requests
        # Allow the request
        key_data.timestamps.push(now)
        total_requests = key_data.timestamps.size
        remaining = @max_requests - total_requests

        RateLimitResult.new(
          allowed: true,
          remaining: remaining,
          reset_time: calculate_reset_time(key_data.timestamps, now),
          total_requests: total_requests
        )
      else
        # Rate limit exceeded
        RateLimitResult.new(
          allowed: false,
          remaining: 0,
          reset_time: calculate_reset_time(key_data.timestamps, now),
          total_requests: requests_in_window
        )
      end
    end
  end

  # Get current status without consuming a request
  def status(key : String) : RateLimitResult
    @mutex.synchronize do
      now = Time.utc
      key_data = @data[key]?

      if key_data
        cleanup_old_timestamps(key_data, now)
        requests_in_window = count_requests_in_window(key_data, now)

        RateLimitResult.new(
          allowed: requests_in_window < @max_requests,
          remaining: Math.max(0, @max_requests - requests_in_window),
          reset_time: calculate_reset_time(key_data.timestamps, now),
          total_requests: requests_in_window
        )
      else
        # No data for this key yet
        RateLimitResult.new(
          allowed: true,
          remaining: @max_requests,
          reset_time: now + @window_seconds.seconds,
          total_requests: 0
        )
      end
    end
  end

  # Reset all rate limiting data
  def reset!
    @mutex.synchronize do
      @data.clear
    end
  end

  # Reset rate limiting data for a specific key
  def reset_key!(key : String)
    @mutex.synchronize do
      @data.delete(key)
    end
  end

  private def count_requests_in_window(key_data : KeyData, now : Time) : Int32
    window_start = now - @window_seconds.seconds

    # Remove timestamps that are outside the window
    while key_data.timestamps.any? && key_data.timestamps.first < window_start
      key_data.timestamps.shift
    end

    key_data.timestamps.size
  end

  # Clean up old timestamps periodically
  private def cleanup_old_timestamps(key_data : KeyData, now : Time)
    count_requests_in_window(key_data, now)
    key_data.last_cleanup = now
  end

  # Calculate when the rate limit will reset
  private def calculate_reset_time(timestamps : Deque(Time), now : Time) : Time
    if timestamps.empty?
      now + @window_seconds.seconds
    else
      # Reset when the oldest timestamp in the window expires
      oldest_in_window = timestamps.first
      oldest_in_window + @window_seconds.seconds
    end
  end
end
