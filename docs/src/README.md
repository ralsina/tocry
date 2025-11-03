# ToCry - A Simple, Self-Hosted Kanban Board

Are you going ToDo or ToCry?

ToCry is a lightweight, self-hosted task management application that helps you organize your work with an intuitive Kanban interface. Built with Crystal for performance and reliability, it runs as a single binary with zero external dependencies - perfect for personal productivity or team collaboration.

## Try the Demo!

Visit [tocry-demo.ralsina.me](https://tocry-demo.ralsina.me) with user `demo` and password `tocry` to see it in action.

![ToCry Screenshot](/screenshot.png)

## Key Features

- **Simple Kanban Interface**: Intuitive drag-and-drop task management
- **Real-time Updates**: WebSocket-powered collaboration
- **File Attachments**: Upload images and files to your tasks
- **AI-Powered Editing**: Optional AI integration for smart task management
- **Multiple Authentication**: Google OAuth, Basic Auth, or no-auth modes
- **Self-Hosted**: Complete control over your data
- **High Performance**: Built with Crystal for speed and efficiency
- **Zero Dependencies**: Single binary deployment

## Quick Start

```bash
# Install ToCry (one-liner)
curl -sSL https://tocry.ralsina.me/install.sh | sudo bash

# Or download and run manually
curl -L https://github.com/ralsina/tocry/releases/latest/download/tocry-linux-amd64 -o tocry
chmod +x tocry
./tocry --port 3000
```

Then open http://localhost:3000 in your browser.

## Documentation Structure

This book provides comprehensive documentation for ToCry, organized into logical sections:

### Getting Started
- [Installation Guide](installation/) - Various installation methods
- [Features Overview](features/) - Complete feature documentation

### User Guide
- [Configuration](configuration/) - Environment variables and settings
- [AI Integration](ai-editing/) - Using AI features
- [Version History](versioning/) - Note versioning and rollback

### Developer Guide
- [OpenAPI & API](openapi/) - REST API documentation and clients
- [MCP Integration](mcp/) - Model Context Protocol support
- [Development](development/) - Building from source and contributing

### Advanced Topics
- [Performance Optimization](performance/) - Tuning and scaling

### About
- [Project Information](about/) - Philosophy, changelog, and support
