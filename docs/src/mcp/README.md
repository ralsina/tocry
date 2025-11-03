# Model Context Protocol (MCP) Integration

ToCry integrates with AI agents through the standardized Model Context Protocol (MCP), enabling AI-powered task management workflows.

## Features

- **Access your boards and notes** from any MCP-compatible AI assistant
- **Full CRUD operations** for notes, lanes, and boards
- **Secure authentication integration** (OAuth, Basic Auth, or No Auth)
- **Real-time search** across all your tasks and content
- **JSON-RPC 2.0 based protocol** for reliable communication
- **AI-powered task management** workflows

## How it Works

The MCP server allows AI assistants to:
- Create, read, update, and delete tasks
- Search through your existing tasks and content
- Organize tasks across different boards and lanes
- Integrate with your existing authentication setup

This makes ToCry perfect for AI-assisted project management, where you can have an AI help you organize, prioritize, and manage your tasks through natural language conversations.

## Security

The MCP integration respects your existing authentication configuration:
- If using Google OAuth, users authenticate through their Google accounts
- If using Basic Auth, the same credentials protect MCP access
- If using no authentication, MCP access is open (use with caution)

All MCP communications happen over the same secure channel as the web interface.

## Configuration with AI Agents

ToCry provides MCP (Model Context Protocol) endpoints that work with any MCP-compatible AI agent.

### MCP Server Details

- **POST Endpoint**: `http://localhost:3000/mcp` (JSON-RPC 2.0 requests)
- **GET Endpoint**: `http://localhost:3000/mcp` (Server-Sent Events for real-time updates)
- **Protocol**: JSON-RPC 2.0 over HTTP
- **Authentication**: Follows your ToCry authentication setup (OAuth, Basic Auth, or None)

### Agent Configuration

Different AI agents have their own MCP configuration methods. Here are some popular options:

#### Claude Code
See the [Claude Code MCP documentation](https://docs.claude.ai/claude-code/mcp) for configuration instructions.

#### Continue.dev
See the [Continue.dev MCP configuration guide](https://docs.continue.dev/reference/model-context-protocol).

#### Custom MCP Clients
For custom implementations, connect directly to:
- **JSON-RPC**: `POST http://localhost:3000/mcp`
- **SSE Updates**: `GET http://localhost:3000/mcp`

### Docker Setup

If running ToCry in Docker, ensure the port is accessible:

```yaml
services:
  tocry:
    image: tocry:latest
    ports:
      - "3000:3000"  # Expose port for MCP access
    environment:
      - TOCRY_AUTH_USER=your-user
      - TOCRY_AUTH_PASS=your-password
```

Configure your AI agent to connect to `http://localhost:3000/mcp`.

### Usage Examples

Once configured, you can interact with ToCry through natural language:

**Task Management**:
- "Show me all tasks in the 'Development' board"
- "Create a new high-priority task for 'Deploy to production'"
- "Move 'Fix login bug' to the 'Done' lane"

**Content Management**:
- "Add a note about the team meeting to the 'Planning' board"
- "Update the task 'Write tests' with progress details"
- "Search for all tasks containing 'urgent'"

**Board Organization**:
- "Create a new board called 'Q2 Projects'"
- "Add a 'Review' lane between 'In Progress' and 'Done'"
- "Show me statistics for the current sprint"
