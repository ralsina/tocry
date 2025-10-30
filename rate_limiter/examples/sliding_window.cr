#!/usr/bin/env crystal

require "../src/rate_limiter"

# Sliding window behavior demonstration
puts "=== Sliding Window Example ==="

# Create limiter: 3 requests per 2 seconds
limiter = RateLimiter.new(3, 2)

user = "charlie"
puts "Rate limiter: 3 requests per 2 seconds (sliding window)"
puts

# Make requests quickly to fill the window
puts "Phase 1: Fill the window quickly"
3.times do |i|
  allowed = limiter.allow?(user)
  puts "Request #{i + 1}: #{allowed ? "ALLOWED" : "BLOCKED"}"
  sleep(0.1) # Small delay between requests
end

# Try one more (should be blocked)
puts "\nPhase 2: Try to exceed limit"
extra_allowed = limiter.allow?(user)
puts "Extra request: #{extra_allowed ? "ALLOWED" : "BLOCKED"}"

# Wait for window to slide
puts "\nPhase 3: Wait for window to slide (1.5 seconds)..."
sleep(1.5)

# Try again - should still be blocked since we haven't waited enough
still_blocked = limiter.allow?(user)
puts "After 1.5s: #{still_blocked ? "BLOCKED" : "ALLOWED"}"

# Wait a bit more for window to slide more
puts "\nPhase 4: Wait another 1 second (total 2.5s)..."
sleep(1)

# Now should be allowed as window has slid
allowed_again = limiter.allow?(user)
puts "After 2.5s total: #{allowed_again ? "ALLOWED" : "BLOCKED"}"

# Check final status
final_status = limiter.check(user)
puts "\nFinal status:"
puts "  Allowed: #{final_status.allowed?}"
puts "  Remaining: #{final_status.remaining}"
puts "  Total requests in window: #{final_status.total_requests}"
