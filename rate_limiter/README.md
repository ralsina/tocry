# Rate Limiter

A simple, composable rate limiting library for Crystal applications.

## Features

- **Sliding window algorithm** for accurate rate limiting
- **Thread-safe** implementation with Mutex protection
- **In-memory storage** (resets on restart)
- **Flexible key-based identification** (any string)
- **Simple boolean API** with optional detailed results
- **Composable design** - create multiple independent limiters

## Installation

Add this to your application's `shard.yml`:

```yaml
dependencies:
  rate_limiter:
    github: your_username/rate_limiter
```

## Usage

### Basic Usage

```crystal
require "rate_limiter"

# Create a rate limiter: 30 requests per hour
rate_limiter = RateLimiter.new(30, 3600)

# Check if a request is allowed
if rate_limiter.allow?("user123")
  # Process the request
  puts "Request allowed"
else
  # Reject the request
  puts "Rate limit exceeded"
end
```

### Detailed Results

```crystal
rate_limiter = RateLimiter.new(10, 60)  # 10 requests per minute

result = rate_limiter.check("user123")

puts "Allowed: #{result.allowed?}"
puts "Remaining: #{result.remaining}"
puts "Total requests: #{result.total_requests}"
puts "Reset time: #{result.reset_time}"
```

### Your Use Case: Multiple Independent Rate Limiters

This is perfect for your use case of rate limiting per user, per IP, and per user+endpoint:

```crystal
require "rate_limiter"

# Create independent rate limiters for different purposes
user_rate_limiter = RateLimiter.new(30, 3600)      # 30 per hour per user
ip_rate_limiter = RateLimiter.new(100, 3600)      # 100 per hour per IP
endpoint_rate_limiter = RateLimiter.new(10, 60)   # 10 per minute per user+endpoint

# Check individual limits
username = "john_doe"
ip_address = "192.168.1.1"
endpoint = "/api/notes"

user_allowed = user_rate_limiter.allow?(username)
ip_allowed = ip_rate_limiter.allow?(ip_address)
endpoint_allowed = endpoint_rate_limiter.allow?("#{username}::#{endpoint}")

# Apply ALL limits with short-circuit evaluation
request_allowed = [user_allowed, ip_allowed, endpoint_allowed].any?

if request_allowed
  puts "Request allowed by all rate limiters"
else
  puts "Request blocked by one or more rate limiters"
end
```

### Advanced Usage: Different Strategies

```crystal
# Per user rate limiting
user_limiter = RateLimiter.new(50, 3600)  # 50 requests per hour per user

# Per IP rate limiting
ip_limiter = RateLimiter.new(200, 3600)  # 200 requests per hour per IP

# Per endpoint rate limiting
endpoint_limiter = RateLimiter.new(20, 60)  # 20 requests per minute per endpoint

# Per user + endpoint rate limiting
user_endpoint_limiter = RateLimiter.new(10, 60)  # 10 requests per minute per user+endpoint

# Check request (example: user trying to access API)
username = "alice"
ip = "10.0.0.1"
endpoint = "/api/create_note"

# Check all applicable rate limits
limits = [
  user_limiter.allow?(username),
  ip_limiter.allow?(ip),
  endpoint_limiter.allow?(endpoint),
  user_endpoint_limiter.allow?("#{username}::#{endpoint}")
]

if limits.any?
  # Request is allowed by all rate limiters
  process_request(username, ip, endpoint)
else
  # Request exceeds at least one rate limit
  render_error("Rate limit exceeded")
end
```

### Status Checking

```crystal
limiter = RateLimiter.new(5, 60)  # 5 requests per minute

# Check current status (note: check() does consume a request)
result = limiter.check("user123")

if result.allowed?
  puts "User has #{result.remaining} requests remaining"
else
  puts "User is rate limited until #{result.reset_time}"
end
```

### Reset Functions

```crystal
limiter = RateLimiter.new(10, 60)

# Reset all data
limiter.reset!

# Reset data for a specific key
limiter.reset_key!("user123")
```

## API Reference

### RateLimiter

- `new(max_requests : Int32, window_seconds : Int32)` - Create a new rate limiter
- `allow?(key : String) : Bool` - Check if request is allowed and consume one request
- `check(key : String) : RateLimitResult` - Get detailed status and consume one request
- `reset!` - Reset all rate limiting data
- `reset_key!(key : String)` - Reset data for a specific key

### RateLimitResult

- `allowed? : Bool` - Whether the request is allowed
- `rate_limited? : Bool` - Whether the request is rate limited
- `remaining : Int32` - Number of requests remaining
- `reset_time : Time` - When the rate limit will reset
- `total_requests : Int32` - Total requests in current window

## Thread Safety

The rate limiter is thread-safe and can be used concurrently from multiple fibers/threads. All internal state is protected by Mutex locks.

## Memory Management

The rate limiter automatically cleans up old timestamp data to prevent memory leaks. Each rate limiter maintains a sliding window of timestamps for each key, efficiently removing expired entries.

## Examples

See the `examples/` directory for comprehensive usage examples:

- `basic_usage.cr` - Simple rate limiting demonstration
- `composable_limiters.cr` - Multiple independent limiters with short-circuit evaluation
- `sliding_window.cr` - Sliding window behavior over time
- `thread_safety.cr` - Concurrent access demonstration
- `status_and_reset.cr` - Status checking and reset operations

Run examples with:
```bash
cd examples
crystal run basic_usage.cr
```

## License

MIT License - see LICENSE file for details.
