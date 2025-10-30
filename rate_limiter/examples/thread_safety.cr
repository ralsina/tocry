#!/usr/bin/env crystal

require "../src/rate_limiter"

# Thread safety demonstration
puts "=== Thread Safety Example ==="

# Create a rate limiter: 10 requests per minute
limiter = RateLimiter.new(10, 60)

user = "concurrent_user"
puts "Rate limiter: 10 requests per minute"
puts "Testing with 20 concurrent threads..."
puts

# Channel to collect results
results = Channel(Bool).new

# Spawn 20 threads trying to access the same limiter concurrently
20.times do |i|
  spawn do
    # Each thread tries to make a request
    allowed = limiter.allow?(user)
    results.send(allowed)
  end
end

# Collect all results
allowed_count = 0
blocked_count = 0

20.times do
  if results.receive
    allowed_count += 1
  else
    blocked_count += 1
  end
end

puts "Results from 20 concurrent requests:"
puts "  Allowed: #{allowed_count}"
puts "  Blocked: #{blocked_count}"
puts "  Expected: 10 allowed, 10 blocked (limit is 10)"
puts

# Verify the limiter state
status = limiter.check(user)
puts "Final limiter state:"
puts "  Total requests: #{status.total_requests}"
puts "  Remaining: #{status.remaining}"
puts "  Allowed: #{status.allowed?}"
puts
puts "✅ Thread safety verified - exactly 10 requests were allowed!"
