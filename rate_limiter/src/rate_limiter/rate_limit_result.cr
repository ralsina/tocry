struct RateLimitResult
  property allowed : Bool
  property remaining : Int32
  property reset_time : Time
  property total_requests : Int32

  def initialize(@allowed : Bool, @remaining : Int32, @reset_time : Time, @total_requests : Int32)
  end

  # Convenience method to check if request is allowed
  def allowed?
    @allowed
  end

  # Convenience method to check if request is rate limited
  def rate_limited?
    !@allowed
  end

  # Convert to hash for JSON serialization
  def to_h
    {
      "allowed" => @allowed,
      "remaining" => @remaining,
      "reset_time" => @reset_time.to_unix,
      "total_requests" => @total_requests,
    }
  end
end
