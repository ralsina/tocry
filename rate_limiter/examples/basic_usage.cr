#!/usr/bin/env crystal

require "../src/rate_limiter"

# Basic rate limiting example
puts "=== Basic Rate Limiting Example ==="

# Create a rate limiter: 5 requests per minute
limiter = RateLimiter.new(5, 60)

user = "alice"
puts "Rate limiter configured: 5 requests per minute for user '#{user}'"
puts

# Make some requests
6.times do |i|
  allowed = limiter.allow?(user)
  status = allowed ? "ALLOWED" : "BLOCKED"
  puts "Request #{i + 1}: #{status}"

  # Get detailed status
  result = limiter.check(user) # Note: check() consumes a request
  puts "  Remaining: #{result.remaining}/#{5}"
  puts "  Total requests: #{result.total_requests}"
  puts
end

# Wait and show recovery
puts "Waiting 2 seconds for window to slide..."
sleep 2

result = limiter.check(user)
puts "After 2 seconds - Request: #{result.allowed? ? "ALLOWED" : "BLOCKED"}"
puts "Remaining: #{result.remaining}/#{5}"
