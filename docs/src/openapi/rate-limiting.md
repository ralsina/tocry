# Rate Limiting

ToCry's API implements comprehensive rate limiting to ensure fair usage and prevent abuse. Rate limiting is enforced server-side and communicated through HTTP 429 responses when limits are exceeded.

## Rate Limits in OpenAPI Specification

The OpenAPI specification includes rate limit information for all endpoints. Each endpoint includes a `429` response that documents rate limit behavior.

### Rate Limit Schema

```json
{
  "description": "Rate limit exceeded",
  "content": {
    "application/json": {
      "schema": {
        "type": "object",
        "properties": {
          "error": {
            "type": "string",
            "description": "Error type"
          },
          "message": {
            "type": "string",
            "description": "Error message"
          },
          "retry_after": {
            "type": "integer",
            "description": "Seconds to wait before retrying"
          }
        }
      }
    }
  }
}
```

## Rate Limit Categories

Different API endpoints have different rate limits based on their resource usage:

### User Operations (500 requests/hour)
- `GET /api/v1/boards`
- `GET /api/v1/boards/{id}`
- `GET /api/v1/boards/{id}/lanes`
- `GET /api/v1/lanes/{id}/notes`
- `PUT /api/v1/notes/{id}`
- `DELETE /api/v1/notes/{id}`

### AI Operations (50 requests/hour)
- `POST /api/v1/ai/generate`
- `POST /api/v1/ai/edit`
- `POST /api/v1/ai/complete`

### Upload Operations (50 requests/hour)
- `POST /api/v1/uploads`
- `DELETE /api/v1/uploads/{id}`

### Authentication Operations (20 requests/15 minutes)
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

## Rate Limit Behavior

ToCry's rate limiting works silently - requests within limits proceed normally. Only when limits are exceeded does the API return a 429 response with details.

**Important**: ToCry does not currently expose rate limit status via HTTP headers. Clients only receive rate limit information when they exceed the limits.

## Rate Limit Responses

### HTTP 429 Response Format

When rate limits are exceeded, the API returns:

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

### Response Headers on 429

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
```

**Note**: Rate limit information is only available in the response body, not in headers.

## Client Integration

### JavaScript Client

```javascript
class RateLimitedAPIClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseURL}${endpoint}`, options);

        // Handle rate limiting
        if (response.status === 429) {
          const errorData = await response.json();
          const retryAfter = errorData.retry_after || 60;

          if (attempt === maxRetries) {
            throw new Error(`Rate limit exceeded. Try again after ${retryAfter} seconds.`);
          }

          console.log(`Rate limited. Waiting ${retryAfter} seconds...`);
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

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
}

// Usage
const client = new RateLimitedAPIClient('http://localhost:3000/api/v1');

// Simple request with automatic retry
const boards = await client.get('/boards');

// POST request with retry
const newBoard = await client.post('/boards', {
  name: 'My Board',
  color_scheme: 'Blue'
});
```

### Python Client

```python
import requests
import time
from datetime import datetime

class RateLimitedClient:
    def __init__(self, base_url):
        self.base_url = base_url
        self.session = requests.Session()

    def request(self, method, endpoint, max_retries=3, **kwargs):
        url = f"{self.base_url}{endpoint}"

        for attempt in range(1, max_retries + 1):
            try:
                response = self.session.request(method, url, **kwargs)

                # Handle rate limiting
                if response.status_code == 429:
                    error_data = response.json()
                    retry_after = error_data.get('retry_after', 60)

                    if attempt == max_retries:
                        raise Exception(f"Rate limit exceeded. Try again after {retry_after} seconds.")

                    print(f"Rate limited. Waiting {retry_after} seconds...")
                    time.sleep(retry_after)
                    continue

                return response

            except requests.exceptions.RequestException as e:
                if attempt == max_retries:
                    raise e

                # Exponential backoff for network errors
                backoff_time = 2 ** attempt
                print(f"Network error. Retrying in {backoff_time} seconds...")
                time.sleep(backoff_time)

    def get(self, endpoint, **kwargs):
        return self.request('GET', endpoint, **kwargs)

    def post(self, endpoint, data=None, **kwargs):
        return self.request('POST', endpoint, json=data, **kwargs)

# Usage
client = RateLimitedClient('http://localhost:3000/api/v1')

# GET request with automatic retry
response = client.get('/boards')
boards = response.json()

# POST request with automatic retry
new_board = client.post('/boards', data={
    'name': 'My Board',
    'color_scheme': 'Blue'
})
```

## Rate Limit Strategies

### Exponential Backoff

Implement exponential backoff for robust error handling:

```javascript
async function requestWithBackoff(url, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);

      if (response.status === 429) {
        const errorData = await response.json();
        const retryAfter = errorData.retry_after || 60;
        const backoffTime = retryAfter * Math.pow(2, attempt - 1);

        if (attempt === maxRetries) {
          throw new Error('Max retries exceeded');
        }

        await new Promise(resolve => setTimeout(resolve, backoffTime * 1000));
        continue;
      }

      return response;
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const backoffTime = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
  }
}
```

### Request Queuing

For batch operations, implement request queuing:

```javascript
class RequestQueue {
  constructor(rateLimitPerHour = 500) {
    this.queue = [];
    this.processing = false;
    this.interval = 3600000 / rateLimitPerHour; // milliseconds between requests
  }

  async add(requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const { requestFn, resolve, reject } = this.queue.shift();

      try {
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      }

      // Wait before next request
      if (this.queue.length > 0) {
        await new Promise(r => setTimeout(r, this.interval));
      }
    }

    this.processing = false;
  }
}
```

## Testing Rate Limits

### Load Testing

Use tools like `hey` or `wrk` to test rate limiting:

```bash
# Test with hey (100 requests, 10 concurrent)
hey -n 100 -c 10 -H "Content-Type: application/json" http://localhost:3000/api/v1/boards

# Test with wrk (30 seconds, 10 connections)
wrk -t12 -c400 -d30s http://localhost:3000/api/v1/boards
```

### Rate Limit Validation

Validate rate limit behavior in your tests:

```javascript
// Test rate limit behavior
describe('Rate Limiting', () => {
  it('should return 429 when rate limited', async () => {
    // Make many rapid requests to trigger rate limiting
    const requests = Array(100).fill().map(() => fetch('/api/v1/boards'));
    const responses = await Promise.all(requests);

    const rateLimited = responses.some(r => r.status === 429);
    expect(rateLimited).toBe(true);
  });

  it('should include retry_after in 429 response', async () => {
    // Make rapid requests until rate limited
    let response;
    for (let i = 0; i < 100; i++) {
      response = await fetch('/api/v1/boards');
      if (response.status === 429) break;
    }

    if (response.status === 429) {
      const errorData = await response.json();
      expect(errorData.retry_after).toBeDefined();
      expect(typeof errorData.retry_after).toBe('number');
    }
  });
});
```

## OpenAPI Specification

The complete rate limiting specification is available in the OpenAPI document at `/api/openapi.json`. Key sections include:

- **Responses**: `429` response schema for all endpoints
- **Examples**: Sample 429 responses with retry_after information

For configuration details, see the [configuration rate limiting documentation](../configuration/rate-limiting.md).
