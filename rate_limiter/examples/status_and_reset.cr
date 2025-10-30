#!/usr/bin/env crystal

require "../src/rate_limiter"

# Status checking and reset operations example
puts "=== Status and Reset Example ==="

# Create rate limiter: 5 requests per minute
limiter = RateLimiter.new(5, 60)

user = "diana"
puts "Rate limiter: 5 requests per minute for user '#{user}'"
puts

# Make some requests to consume the limit
puts "Making 5 requests..."
5.times do |i|
  allowed = limiter.allow?(user)
  puts "Request #{i + 1}: #{allowed ? "ALLOWED" : "BLOCKED"}"
end

# Check detailed status
puts "\nDetailed status after consuming limit:"
status = limiter.check(user) # Note: this will consume another request
puts "  Allowed: #{status.allowed?}"
puts "  Remaining: #{status.remaining}"
puts "  Total requests: #{status.total_requests}"
puts "  Reset time: #{status.reset_time}"

# Try one more request (should be blocked)
puts "\nTrying one more request..."
extra_allowed = limiter.allow?(user)
puts "Extra request: #{extra_allowed ? "ALLOWED" : "BLOCKED"}"

# Reset the specific user
puts "\nResetting rate limit for user '#{user}'..."
limiter.reset_key!(user)

# Try again after reset
puts "Making request after reset..."
after_reset_allowed = limiter.allow?(user)
puts "Request after reset: #{after_reset_allowed ? "ALLOWED" : "BLOCKED"}"

# Check status again
status_after_reset = limiter.check(user)
puts "\nStatus after reset and one request:"
puts "  Allowed: #{status_after_reset.allowed?}"
puts "  Remaining: #{status_after_reset.remaining}"
puts "  Total requests: #{status_after_reset.total_requests}"

# Add another user to show independent behavior
puts "\nAdding another user to show independent behavior..."
user2 = "eve"
limiter.allow?(user2)
limiter.allow?(user2)

status_user1 = limiter.check(user)
status_user2 = limiter.check(user2)

puts "User '#{user}' status: allowed=#{status_user1.allowed?}, remaining=#{status_user1.remaining}"
puts "User '#{user2}' status: allowed=#{status_user2.allowed?}, remaining=#{status_user2.remaining}"

# Reset all data
puts "\nResetting ALL rate limit data..."
limiter.reset!

puts "After global reset - both users should have full limits:"
status_user1_after = limiter.check(user)
status_user2_after = limiter.check(user2)

puts "User '#{user}' after global reset: remaining=#{status_user1_after.remaining}"
puts "User '#{user2}' after global reset: remaining=#{status_user2_after.remaining}"
