#!/usr/bin/env crystal

require "../src/rate_limiter"

# AI vs regular endpoint rate limiting example
puts "=== AI vs Regular Endpoint Rate Limiting Example ==="

# Create rate limiters mimicking ToCry's setup
user_limiter = RateLimiter.new(500, 3600)  # 500 requests per hour (general usage)
ai_limiter = RateLimiter.new(50, 3600)     # 50 requests per hour (AI operations - expensive)

user = "test_user"
ai_endpoint = "/api/v1/z-ai/completions"
regular_endpoint = "/api/v1/boards"

puts "Rate limits configured:"
puts "  Regular endpoints: 500 requests/hour per user"
puts "  AI endpoint: 50 requests/hour per user (expensive operations)"
puts

def allow_request?(user_limiter, ai_limiter, user_id, endpoint)
  # Check if endpoint is AI-related
  is_ai = endpoint == "/api/v1/z-ai/completions"

  limits = [] of Bool

  # Always check general user rate limit
  limits << user_limiter.allow?(user_id)

  # For AI endpoints, also check AI rate limit
  if is_ai
    limits << ai_limiter.allow?(user_id)
  end

  # All applicable limiters must allow the request
  limits.all?
end

# Test regular endpoint usage
puts "Phase 1: Testing regular endpoint usage"
20.times do |i|
  allowed = allow_request?(user_limiter, ai_limiter, user, regular_endpoint)
  status = allowed ? "ALLOWED" : "BLOCKED"
  puts "Regular request #{i + 1}: #{status}"
end

# Check remaining limits
user_status = user_limiter.check(user)
ai_status = ai_limiter.check(user)

puts "\nAfter regular requests:"
puts "  User limiter remaining: #{user_status.remaining}/500"
puts "  AI limiter remaining: #{ai_status.remaining}/50"
puts

# Test AI endpoint usage
puts "Phase 2: Testing AI endpoint usage"
55.times do |i|
  allowed = allow_request?(user_limiter, ai_limiter, user, ai_endpoint)
  status = allowed ? "ALLOWED" : "BLOCKED"
  puts "AI request #{i + 1}: #{status}"
end

# Check final status
user_status_final = user_limiter.check(user)
ai_status_final = ai_limiter.check(user)

puts "\nFinal status:"
puts "  User limiter: #{user_status_final.allowed? ? "OK" : "EXHAUSTED"} (#{user_status_final.remaining}/500)"
puts "  AI limiter: #{ai_status_final.allowed? ? "OK" : "EXHAUSTED"} (#{ai_status_final.remaining}/50)"

# Test that regular requests still work after AI limiter is exhausted
puts "\nPhase 3: Testing regular requests after AI limiter exhausted"
regular_after_ai = allow_request?(user_limiter, ai_limiter, user, regular_endpoint)
ai_after_ai = allow_request?(user_limiter, ai_limiter, user, ai_endpoint)

puts "Regular request after AI exhausted: #{regular_after_ai ? "ALLOWED" : "BLOCKED"}"
puts "AI request after AI exhausted: #{ai_after_ai ? "ALLOWED" : "BLOCKED"}"

puts "\n✅ AI endpoint has stricter rate limiting while regular endpoints remain available!"
