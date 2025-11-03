# ToCry OpenAPI Specification and API Clients

This document provides comprehensive information about ToCry's OpenAPI specification, client libraries, and API integration patterns.

## Overview

ToCry provides a RESTful API with full OpenAPI 3.0 specification support. The API follows RESTful conventions and includes:

- **OpenAPI Specification**: Available at `/api/openapi.json`
- **Interactive Documentation**: Scalar UI at `/api/docs` (when enabled)
- **Multiple Client Libraries**: Crystal, TypeScript, and browser-compatible JavaScript
- **Real-time Updates**: WebSocket support for live collaboration
- **Authentication**: Google OAuth, Basic Auth, or no-auth modes

## OpenAPI Specification

### Accessing the Specification

The OpenAPI 3.0 specification is automatically generated and available at:

- **OpenAPI Spec**: `http://localhost:3000/api/openapi.json`
- **Interactive Documentation**: `http://localhost:3000/api/docs` (Scalar UI)

The specification includes:
- All API endpoints with request/response schemas
- Authentication requirements and methods
- Data models and validation rules
- Error response formats
- WebSocket event schemas

The interactive Scalar documentation provides a user-friendly interface to explore and test the API endpoints directly in your browser.

### Schema Management

ToCry uses a manual schema approach where each model class defines its OpenAPI schema:

- **Location**: Model files (`src/note.cr`, `src/lane.cr`, `src/board.cr`)
- **Methods**: `self.schema` for responses, `Note.data_schema` for request bodies
- **Synchronization**: Schemas are kept in sync with model properties
- **Generation**: `src/openapi_manual.cr` combines schemas into the complete spec

#### Schema Synchronization

When modifying model classes, immediately update the corresponding schema methods:

```crystal
# In src/note.cr
class Note
  # ... properties ...

  def self.schema
    {
      "type" => "object",
      "properties" => {
        "id" => {"type" => "string"},
        "title" => {"type" => "string"},
        "content" => {"type" => "string"},
        "priority" => {"type" => "string", "enum" => ["Low", "Medium", "High"]},
        # ... other properties
      }
    }
  end

  def self.data_schema
    # Same as schema but with required fields for request bodies
  end
end
```

### Validation

Validate the OpenAPI specification:

```bash
# Install OpenAPI Generator CLI
curl -L https://repo1.maven.org/maven2/org/openapitools/openapi-generator-cli/6.6.0/openapi-generator-cli-6.6.0.jar -o openapi-generator-cli.jar
java -jar openapi-generator-cli.jar validate -i openapi.json
```

## API Client Libraries

ToCry provides multiple client libraries for different use cases:

### 1. Generated Crystal Client

**Location**: `lib/tocry_api/`

**Features**:
- Type-safe Crystal client
- Automatic request/response mapping
- Built-in error handling
- Used in backend tests

**Usage**:
```crystal
require "tocry_api"

client = ToCryAPI::Client.new("http://localhost:3000")
boards = client.get_boards

board = client.get_board("board-id")
lane = client.create_lane("board-id", {"name" => "New Lane"})
note = client.create_note("board-id", "lane-id", {
  "title" => "New Note",
  "content" => "Note content"
})
```

### 2. TypeScript Client (Generated)

**Location**: `src/assets/api_client_ts/` (source) and `src/assets/api_client_ts_dist/` (compiled)

**Features**:
- Full TypeScript type definitions
- ESM and CommonJS support
- Zero dependencies (uses native fetch)
- Browser and Node.js compatible

**Usage**:
```typescript
import { ToCryClient } from '../assets/api_client_ts_dist/index.js';

const client = new ToCryClient('http://localhost:3000');
const boards = await client.getBoards();

const board = await client.getBoard('board-id');
const lane = await client.createLane('board-id', { name: 'New Lane' });
const note = await client.createNote('board-id', 'lane-id', {
  title: 'New Note',
  content: 'Note content'
});
```

### 3. Browser-Compatible JavaScript Client

**Location**: `src/js/api-client-adapter.js`

**Features**:
- Hand-written adapter for maximum compatibility
- No build step required
- Used directly by ToCry frontend
- Lightweight and focused
- Integrates with WebSocket client for real-time updates

**Usage**:
```javascript
// Client is automatically available in ToCry's Alpine.js store
// Access via store.apiClient or through store methods

// Get boards
const boards = await store.getBoards();

// Create a note
const note = await store.createNote(boardId, laneId, {
  title: 'New Note',
  content: 'Note content'
});

// The adapter handles authentication, WebSocket integration, and error handling
```

## Client Generation

### Automatic Generation

Generate all clients from the OpenAPI specification:

```bash
./generate_clients.sh
```

This script:
1. Generates Crystal client in `lib/tocry_api/`
2. Generates TypeScript client in `src/assets/api_client_ts/`
3. Compiles TypeScript to `src/assets/api_client_ts_dist/`
4. Validates the generated clients

### Manual Generation

**Crystal Client**:
```bash
# Install dependencies if needed
shards install

# Generate client
openapi-generator-cli generate \
  -i openapi.json \
  -g crystal \
  -o lib/tocry_api \
  --additional-properties=gemName=tocry_api,gemVersion=1.0.0
```

**TypeScript Client**:
```bash
# Generate TypeScript client
openapi-generator-cli generate \
  -i openapi.json \
  -g typescript-axios \
  -o src/assets/api_client_ts \
  --additional-properties=npmName=tocry-api-client,npmVersion=1.0.0,supportsES6=true

# Compile TypeScript
cd src/assets/api_client_ts
npm install
npm run build

# Copy compiled output to assets directory
cp -r dist/* ../api_client_ts_dist/
```

## API Endpoints

ToCry provides a comprehensive RESTful API for managing boards, lanes, notes, authentication, and file uploads. All endpoints follow RESTful conventions and use the `/api/v1/` prefix.

**For a complete, interactive list of all endpoints with request/response schemas and testing capabilities, visit the Scalar documentation at `http://localhost:3000/api/docs`.**

Key endpoint categories include:
- **Board Management**: CRUD operations for Kanban boards
- **Lane Management**: Create and manage board lanes
- **Note Management**: Full CRUD with support for markdown, attachments, and metadata
- **Version History**: Note versioning and rollback (when generations enabled)
- **Authentication**: Google OAuth, Basic Auth, and no-auth modes
- **File Uploads**: Image and file attachment handling

## Authentication

### Google OAuth (Priority 1)

```javascript
// Redirect to Google OAuth
window.location.href = '/api/v1/auth/login';

// After OAuth callback, user info available at
const user = await store.getAuthMe();
```

### Basic Auth (Priority 2)

```bash
# Using curl with basic auth
curl -u username:password http://localhost:3000/api/v1/boards
```

### No Authentication (Default)

```javascript
// Direct API access without authentication
const boards = await store.getBoards();
```

## WebSocket Integration

ToCry supports real-time updates via WebSocket. The frontend uses `src/js/websocket-client.js`:

```javascript
// WebSocket client is automatically initialized by ToCry
// It integrates with the Alpine.js store for real-time updates

// WebSocket events handled automatically:
store.on('note_created', (note) => {
  // Note appears in UI automatically
});

store.on('note_updated', (note) => {
  // Note updates in UI automatically
});

store.on('note_moved', (data) => {
  // Note moves between lanes automatically
});
```

## Error Handling

### Standard Error Response

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
- `409` - Conflict (generations version mismatch)
- `422` - Unprocessable Entity (validation errors)
- `500` - Internal Server Error

## Rate Limiting

API requests are rate-limited based on configuration:

```yaml
# config/rate_limits.yml
rate_limiting:
  enabled: true
  limits:
    user: "500/3600"    # 500 requests per hour
    ai: "50/3600"       # 50 AI requests per hour
    upload: "50/3600"   # 50 uploads per hour
    auth: "20/900"      # 20 auth requests per 15 minutes
```

### Rate Limit Headers

```http
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 499
X-RateLimit-Reset: 1640995200
```

## Development Workflow

### 1. Model Changes

When modifying model classes:

```crystal
# 1. Update model properties
class Note
  property new_field : String?
end

# 2. Update schema methods immediately
def self.schema
  # Add new_field to schema
end
```

### 2. Client Regeneration

```bash
# 3. Regenerate clients
./generate_clients.sh

# 4. Validate spec
openapi-generator-cli validate -i openapi.json

# 5. Update browser client if needed
# Edit src/js/api-client-adapter.js
```

### 3. Testing

```bash
# Backend tests use generated Crystal client automatically
make test

# Test specific client integration
cd src/js && npm test
```

## Examples

### Basic Board Management (using the browser client)

```javascript
// These methods are available in ToCry's Alpine.js store

// Create a new board
const board = await store.createBoard({
  name: 'My Project',
  color_scheme: 'Blue'
});

// Add lanes to the board
const backlog = await store.createLane(board.id, { name: 'Backlog' });
const inProgress = await store.createLane(board.id, { name: 'In Progress' });
const done = await store.createLane(board.id, { name: 'Done' });

// Create notes
const note = await store.createNote(board.id, backlog.id, {
  title: 'Setup project',
  content: 'Initial project setup and configuration',
  priority: 'High',
  tags: ['setup', 'important']
});

// Move note between lanes (real-time update happens automatically)
await store.moveNote(board.id, backlog.id, note.id, {
  target_lane_id: inProgress.id
});
```

### Version History Management

```javascript
// Get note version history
const versions = await store.getNoteVersions(boardId, laneId, noteId);

// Revert to previous version
await store.revertNoteVersion(boardId, laneId, noteId, versions[0].generation);
```

### File Uploads

```javascript
// Upload a file using the built-in method
const upload = await store.uploadFile(fileInput.files[0]);

// Reference uploaded file in note
await store.createNote(boardId, laneId, {
  title: 'Document',
  content: `![${upload.original_filename}](/api/v1/uploads/${upload.id})`
});
```

### Using the Generated TypeScript Client

```typescript
import { ToCryClient } from '../assets/api_client_ts_dist/index.js';

const client = new ToCryClient('http://localhost:3000');

// Direct API access without UI integration
const boards = await client.getBoards();
const board = await client.createBoard({
  name: 'API Test Board',
  color_scheme: 'Green'
});

console.log('Created board:', board);
```

## Troubleshooting

### Common Issues

1. **Schema Mismatch**: Error `Property 'x' not found in schema`
   - Update model schema methods after property changes
   - Regenerate clients with `./generate_clients.sh`

2. **Authentication Errors**: `401 Unauthorized`
   - Check environment variables for auth configuration
   - Verify OAuth redirect URIs match your deployment

3. **Rate Limiting**: `429 Too Many Requests`
   - Check rate limit configuration in `config/rate_limits.yml`
   - Monitor `X-RateLimit-*` headers in responses

4. **WebSocket Connection Issues**
   - Ensure WebSocket endpoint is accessible
   - Check for CORS issues in browser console
   - Verify `src/js/websocket-client.js` is loading properly

5. **Client Generation Failures**
   - Ensure OpenAPI spec is valid: `java -jar openapi-generator-cli.jar validate -i openapi.json`
   - Check that model schema methods are properly defined
   - Verify TypeScript dependencies in `src/assets/api_client_ts/`

### Debug Mode

Enable debug logging:

```bash
# Environment variables
export TOCRY_LOG_LEVEL=debug
export TOCRY_DEBUG_REQUESTS=true

# Run server
crystal run src/main.cr
```

### API Testing

For interactive API testing with request/response schemas and a user-friendly interface, visit the Scalar documentation at `http://localhost:3000/api/docs`. This allows you to:

- Explore all available endpoints with detailed schemas
- Test API requests directly in your browser
- View real-time response data
- Experiment with different authentication methods

For command-line testing, you can use curl with any of the API endpoints, but the Scalar documentation provides the most convenient testing experience.

## Best Practices

1. **Keep Schemas Updated**: Always update schema methods when changing model properties
2. **Use Appropriate Client**:
   - Use `src/js/api-client-adapter.js` for frontend development (integrates with UI)
   - Use generated TypeScript client for external applications
   - Use generated Crystal client for backend testing
3. **Handle Errors Gracefully**: Check HTTP status codes and error responses
4. **Respect Rate Limits**: Monitor rate limit headers and implement backoff
5. **Leverage WebSockets**: Use real-time updates for better user experience
6. **Version Compatibility**: Check API version compatibility when upgrading
7. **Test Integration**: Use the generated Crystal client in backend tests

## File Structure

```
├── openapi.json                    # Generated OpenAPI specification
├── src/
│   ├── openapi_manual.cr          # Manual OpenAPI spec generator
│   ├── js/
│   │   ├── api-client-adapter.js  # Browser client (used by frontend)
│   │   └── websocket-client.js    # WebSocket client
│   └── assets/
│       ├── api_client_ts/         # TypeScript client source
│       └── api_client_ts_dist/    # Compiled TypeScript client
├── lib/
│   └── tocry_api/                 # Generated Crystal client
└── generate_clients.sh            # Client generation script
```

## Reference Links

- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [OpenAPI Generator](https://openapi-generator.tech/)
- [ToCry WebSocket Documentation](./websocket.md)
- [ToCry Authentication Guide](./authentication.md)
- [ToCry Development Guide](./development.md)