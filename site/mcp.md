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
