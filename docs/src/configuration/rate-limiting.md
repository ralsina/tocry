# Rate Limiting

ToCry includes built-in rate limiting to protect against abuse and ensure fair usage. The rate limiting system is configurable and works across different types of API requests.

## Configuration

Rate limiting is controlled via the standalone `rate_limiter` shard. The limits are configured in the application code and can be customized based on your deployment needs.

### Default Limits

```crystal
# Default rate limits in ToCry
limits = {
  "user" => "500/3600",     # 500 requests per hour per user
  "ai" => "50/3600",        # 50 AI requests per hour
  "upload" => "50/3600",    # 50 file uploads per hour
  "auth" => "20/900"        # 20 authentication requests per 15 minutes
}
```

### Rate Limit Categories

**User Requests (500/hour)**
- Standard API operations (boards, lanes, notes)
- Read operations and updates
- Navigation and browsing

**AI Requests (50/hour)**
- AI-powered content generation
- Smart editing features
- AI assistance functions

**Upload Requests (50/hour)**
- File uploads and attachments
- Image uploads
- Document imports

**Authentication Requests (20/15 minutes)**
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

You can customize rate limits by modifying the application configuration:

### For Self-Hosted Deployments

Edit the rate limit configuration in your ToCry instance:

```crystal
# Custom rate limits example
limits = {
  "user" => "1000/3600",    # Higher limit for internal use
  "ai" => "100/3600",       # More AI requests for power users
  "upload" => "200/3600",   # More uploads for content-heavy sites
  "auth" => "50/900"        # More auth attempts for enterprise
}
```

### Development Environment

For development, you may want to disable or increase limits:

```crystal
# Development configuration
limits = {
  "user" => "10000/3600",   # Very high limit for testing
  "ai" => "1000/3600",
  "upload" => "1000/3600",
  "auth" => "1000/900"
}
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
# Start ToCry with debug logging
tocry --debug --log-level=debug

# Check for rate limit debug messages
tail -f /var/log/tocry.log | grep -i "rate"
```

For API-specific rate limiting information, see the [OpenAPI rate limiting documentation](../openapi/rate-limiting.md).
