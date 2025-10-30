#!/usr/bin/env crystal

require "../src/rate_limiter"

# Composable rate limiters example - your exact use case
puts "=== Composable Rate Limiters Example ==="

# Create multiple independent rate limiters
user_limiter = RateLimiter.new(3, 60)      # 3 per minute per user
ip_limiter = RateLimiter.new(5, 60)        # 5 per minute per IP
api_limiter = RateLimiter.new(10, 60)      # 10 per minute general API

username = "bob"
ip = "192.168.1.100"
endpoint = "/api/notes"

puts "Rate limiters configured:"
puts "  User limiter: 3 requests/minute"
puts "  IP limiter: 5 requests/minute"
puts "  API limiter: 10 requests/minute"
puts

# Helper function to check all limiters with short-circuit evaluation
def allow_request?(user_limiter, ip_limiter, api_limiter, username, ip, endpoint)
  limits = [] of Bool

  # Check each limiter
  limits << user_limiter.allow?(username)
  limits << ip_limiter.allow?(ip)
  limits << api_limiter.allow?(endpoint)

  # Short-circuit evaluation: allowed if ANY limiter allows it
  limits.any?
end

# Make requests and see the behavior
10.times do |i|
  allowed = allow_request?(user_limiter, ip_limiter, api_limiter, username, ip, endpoint)
  status = allowed ? "ALLOWED" : "BLOCKED"
  puts "Request #{i + 1}: #{status}"

  # Show individual limiter states
  user_status = user_limiter.check(username) # Note: consumes a request
  ip_status = ip_limiter.check(ip)           # Note: consumes a request
  api_status = api_limiter.check(endpoint)   # Note: consumes a request

  puts "  User limiter: #{user_status.allowed? ? "OK" : "EXHAUSTED"} (#{user_status.remaining}/3)"
  puts "  IP limiter: #{ip_status.allowed? ? "OK" : "EXHAUSTED"} (#{ip_status.remaining}/5)"
  puts "  API limiter: #{api_status.allowed? ? "OK" : "EXHAUSTED"} (#{api_status.remaining}/10)"
  puts
end

puts "Notice how requests are still allowed even when individual limiters are exhausted,"
puts "because we use short-circuit evaluation (any? method)."
