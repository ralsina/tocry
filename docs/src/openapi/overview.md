# API Overview

ToCry provides a comprehensive RESTful API with full OpenAPI 3.0 specification support. The API follows RESTful conventions and is designed to be intuitive, well-documented, and easy to integrate with other applications.

## API Architecture

### RESTful Design

ToCry's API follows RESTful principles:

- **Resource-based**: Everything in ToCry is a resource (boards, lanes, notes, files)
- **HTTP Methods**: Standard HTTP verbs for operations (GET, POST, PUT, DELETE)
- **Status Codes**: Proper HTTP status codes for responses
- **JSON Format**: All data exchange uses JSON
- **Resource URLs**: Clean, hierarchical URL structure

### API Structure

```
/api/v1/
├── boards/          # Board management
├── lanes/           # Lane management (nested under boards)
├── notes/           # Note management (nested under boards/lanes)
├── uploads/         # File upload management
├── auth/           # Authentication endpoints
└── openapi.json    # OpenAPI specification
```

### Key Features

- **Automatic Discovery**: Complete OpenAPI 3.0 specification
- **Interactive Documentation**: Scalar UI for API exploration
- **Real-time Updates**: WebSocket support for live collaboration
- **Authentication**: Multiple authentication methods
- **Rate Limiting**: Built-in rate limiting with proper headers
- **Error Handling**: Consistent error response format

## Getting Started

### Quick Access

1. **OpenAPI Specification**: `/api/openapi.json`
2. **Interactive Documentation**: `/api/docs`
3. **Base URL**: `http://localhost:3000/api/v1`

### Authentication

ToCry supports three authentication modes (priority-based):

1. **Google OAuth** (highest priority)
2. **Basic Authentication**
3. **No Authentication** (default)

### Basic Request Example

```bash
# Get all boards
curl http://localhost:3000/api/v1/boards

# Create a new board
curl -X POST http://localhost:3000/api/v1/boards \
  -H "Content-Type: application/json" \
  -d '{"name": "My Project", "color_scheme": "Blue"}'

# Get specific board
curl http://localhost:3000/api/v1/boards/board-id
```

## Data Models

### Core Resources

- **Boards**: Top-level Kanban boards
- **Lanes**: Columns within boards containing notes
- **Notes**: Individual task items with rich content
- **Uploads**: File attachments and images

### Data Flow

1. **Request**: Client sends HTTP request with JSON payload
2. **Validation**: Server validates and processes request
3. **Response**: Server returns JSON response with data or error
4. **Real-time**: WebSocket events notify other clients of changes

## Rate Limiting

### Implementation

- **Multiple Limits**: Different limits per endpoint type
- **Headers**: Rate limit information in HTTP headers
- **429 Responses**: Proper HTTP 429 responses when exceeded

### Rate Limit Headers

```http
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 499
X-RateLimit-Reset: 1640995200
```

## Error Handling

### Standard Error Format

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Board not found",
    "details": "Board with ID 'xxx' does not exist"
  }
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (version conflicts)
- `422` - Unprocessable Entity (validation errors)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## WebSocket Integration

### Real-time Updates

ToCry supports WebSocket connections for real-time collaboration:

- **Live Updates**: Automatic updates when other users make changes
- **Event Types**: Create, update, delete, move operations
- **Authentication**: Same authentication as REST API
- **Efficient**: Minimal data transfer for updates

### WebSocket Events

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3000/board-id');

// Listen for events
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Event:', data.type, data.payload);
};
```

## Development Tools

### Interactive Documentation

Visit `/api/docs` for:
- **API Exploration**: Try endpoints directly in browser
- **Schema Viewing**: Understand data structures
- **Authentication**: Test different auth methods
- **Real-time Testing**: See live API responses

### Client Generation

Use the OpenAPI specification to generate clients:
- **Crystal**: `./generate_clients.sh`
- **TypeScript**: Generated from OpenAPI spec
- **Other Languages**: Use OpenAPI Generator

## Best Practices

### API Usage

1. **Use Appropriate Authentication**: Set up auth for production
2. **Handle Errors Gracefully**: Check status codes and error responses
3. **Monitor Rate Limits**: Respect rate limit headers
4. **Use WebSockets**: Leverage real-time updates for better UX
5. **Validate Input**: Client-side validation improves user experience

### Integration Tips

1. **Cache Data**: Cache board/lane structures for performance
2. **Batch Operations**: Use bulk operations when possible
3. **Error Recovery**: Implement retry logic for network issues
4. **Version Compatibility**: Check API version compatibility

## Next Steps

- [Client Libraries](clients.md) - Learn about generated clients
- [Rate Limiting](rate-limiting.md) - Understand rate limiting details
- [Authentication](../configuration/authentication.md) - Set up authentication
- [WebSocket Documentation](../mcp/websocket.md) - Real-time integration details
