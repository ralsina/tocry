# Rate Limiting

ToCry includes built-in rate limiting to protect against abuse and ensure fair usage. The rate limiting system is configurable and works across different types of API requests.

## Configuration

ToCry uses a unified configuration system that supports three sources with clear precedence:

1. **Command Line Arguments** (highest precedence)
2. **Environment Variables** (with `TOCRY_` prefix)
3. **Configuration File** (YAML or JSON, lowest precedence)

### Default Limits

```crystal
# Default rate limits in ToCry
limits = {
  "user" => "100/60",       # 100 requests per minute per user
  "ai" => "10/60",          # 10 AI requests per minute
  "upload" => "5/60",       # 5 file uploads per minute
  "auth" => "10/60"         # 10 authentication requests per minute
}
```

### Configuration Options

#### Command Line Interface

```bash
# Set custom rate limits via CLI
tocry --rate-limit-enabled=true \
      --rate-limit-user=150 \
      --rate-limit-ai=15 \
      --rate-limit-upload=10 \
      --rate-limit-auth=20

# Disable rate limiting
tocry --rate-limit-enabled=false
```

#### Environment Variables

```bash
# Set rate limits via environment variables
export TOCRY_RATE_LIMITING_ENABLED=true
export TOCRY_RATE_LIMIT_USER=150      # Requests per minute for general endpoints
export TOCRY_RATE_LIMIT_AI=15         # Requests per minute for AI endpoints
export TOCRY_RATE_LIMIT_UPLOAD=10     # Requests per minute for file uploads
export TOCRY_RATE_LIMIT_AUTH=20       # Requests per minute for authentication endpoints

# Disable rate limiting
export TOCRY_RATE_LIMITING_ENABLED=false
```

#### Configuration File

Create a `config.yml` or `config.json` file:

```yaml
# config.yml
rate_limit_enabled: true
rate_limit_user: 150      # Requests per minute per user for general endpoints
rate_limit_ai: 15         # Requests per minute per user for AI endpoints
rate_limit_upload: 10     # Requests per minute per user for file uploads
rate_limit_auth: 20       # Requests per minute per user for authentication endpoints
```

```json
// config.json
{
  "rate_limit_enabled": true,
  "rate_limit_user": 150,
  "rate_limit_ai": 15,
  "rate_limit_upload": 10,
  "rate_limit_auth": 20
}
```

#### Using Configuration Files

```bash
# Use with configuration file
tocry --config config.yml

# Override specific settings
tocry --config config.yml --rate-limit-user=200  # CLI overrides config file
```

### Rate Limit Categories

**User Requests (100/minute)**
- Standard API operations (boards, lanes, notes)
- Read operations and updates
- Navigation and browsing

**AI Requests (10/minute)**
- AI-powered content generation
- Smart editing features
- AI assistance functions

**Upload Requests (5/minute)**
- File uploads and attachments
- Image uploads
- Document imports

**Authentication Requests (10/minute)**
- Login attempts
- Token refresh
- OAuth operations

## Rate Limit Behavior

ToCry's rate limiting works silently in the background. When requests are within limits, they proceed normally. When limits are exceeded, ToCry returns an HTTP 429 response with error details.

**Note**: ToCry currently does not expose rate limit information via HTTP headers. Rate limiting is enforced server-side, and clients only learn about limits when they receive a 429 response.

## Rate Limit Responses

When limits are exceeded, ToCry returns HTTP 429 responses:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "details": "Rate limit exceeded. Try again in 60 seconds.",
    "retry_after": 60
  }
}
```

## Customizing Rate Limits

You can customize rate limits using any of the three configuration methods:

### For Self-Hosted Deployments

#### Using Command Line Arguments
```bash
# Higher limits for internal use
tocry --rate-limit-user=200 \
      --rate-limit-ai=30 \
      --rate-limit-upload=25 \
      --rate-limit-auth=30
```

#### Using Environment Variables
```bash
# More AI requests for power users
export TOCRY_RATE_LIMIT_USER=200
export TOCRY_RATE_LIMIT_AI=30
export TOCRY_RATE_LIMIT_UPLOAD=25
export TOCRY_RATE_LIMIT_AUTH=30
```

#### Using Configuration File
```yaml
# config.yml for enterprise deployment
rate_limit_enabled: true
rate_limit_user: 200       # Higher limit for internal use
rate_limit_ai: 30          # More AI requests for power users
rate_limit_upload: 25      # More uploads for content-heavy sites
rate_limit_auth: 30        # More auth attempts for enterprise
```

### Development Environment

For development, you may want to disable or increase limits:

#### Disable Rate Limiting
```bash
# Disable for development
tocry --rate-limit-enabled=false

# Or via environment variable
export TOCRY_RATE_LIMITING_ENABLED=false
```

#### Increase Development Limits
```bash
# Very high limits for testing
tocry --rate-limit-user=1000 \
      --rate-limit-ai=500 \
      --rate-limit-upload=200 \
      --rate-limit-auth=200
```

```yaml
# config-dev.yml
rate_limit_enabled: true
rate_limit_user: 1000      # Very high limit for testing
rate_limit_ai: 500
rate_limit_upload: 200
rate_limit_auth: 200
```

## Monitoring Rate Limits

### Check Current Status

Since ToCry doesn't expose rate limit headers, monitoring is done through:

1. **Server Logs**: Check application logs for rate limit events
2. **429 Responses**: Monitor for HTTP 429 responses in your client
3. **Request Patterns**: Track your request frequency to stay within limits

### Example Monitoring

```bash
# Test rate limiting behavior
for i in {1..600}; do
  curl -s -w "%{http_code}\n" http://localhost:3000/api/v1/boards | tail -1
done

# Look for 429 responses indicating rate limit activation
```

### Logging

ToCry logs rate limit events when enabled:

```bash
# Check logs for rate limit events
tail -f /var/log/tocry.log | grep "rate limit"
```

## Best Practices

### Client-Side Handling

1. **Handle 429 Responses**: Implement proper error handling for rate limit exceeded responses
2. **Exponential Backoff**: Implement backoff when receiving 429 responses
3. **Request Throttling**: For high-volume operations, implement client-side throttling
4. **Cache Responses**: Reduce unnecessary requests

### JavaScript Example

```javascript
async function makeRequestWithRetry(url, options = {}, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        const errorData = await response.json();
        const retryAfter = errorData.retry_after || 60;

        if (attempt === maxRetries) {
          throw new Error('Rate limit exceeded. Max retries reached.');
        }

        console.log(`Rate limited. Retrying after ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }

      return response;
    } catch (error) {
      if (attempt === maxRetries) throw error;

      // Exponential backoff for other errors
      const backoffTime = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
  }
}
```

### Server-Side Optimization

1. **Appropriate Limits**: Set limits based on expected usage patterns
2. **Different Categories**: Use separate limits for different operation types
3. **Monitor Usage**: Track rate limit hits to adjust limits as needed
4. **User-Based Limits**: Consider per-user limits for multi-tenant deployments

## Troubleshooting

### Common Issues

**Frequent 429 Errors:**
- Check if limits are appropriate for your usage
- Implement client-side rate limiting
- Consider increasing limits for legitimate use cases

**Rate Limit Not Working:**
- Verify the rate limiter shard is properly configured
- Check logs for rate limit configuration errors
- Ensure limits are being applied correctly

### Debug Mode

Enable debug logging to troubleshoot rate limiting:

```bash
# Start ToCry with debug logging and custom rate limits
tocry --debug --log-level=debug --rate-limit-user=10

# Check for rate limit debug messages
tail -f /var/log/tocry.log | grep -i "rate"

# Test with very low limits to see rate limiting in action
tocry --rate-limit-user=2 --rate-limit-ai=1
```

For API-specific rate limiting information, see the [OpenAPI rate limiting documentation](../openapi/rate-limiting.md).
