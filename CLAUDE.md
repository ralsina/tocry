# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

### Building
```bash
# Development mode
crystal run src/main.cr

# Production build (static binary)
shards build --release --progress

# Docker build (multi-arch)
docker buildx build --platform linux/amd64,linux/arm64 -t tocry .
```

### Testing
```bash
# Run unit tests
crystal spec
# or use convenience script
./run_unit.sh

# Run integration tests (requires Playwright)
cd integration-test && npm test
```

### Linting and Code Quality
```bash
# Lint code
ameba

# Auto-fix linting issues
ameba --fix
```

## Architecture Overview

ToCry is a Kanban-style TODO application built in Crystal using the Kemal web framework. It's designed as a single-binary, self-hosted application with file-based persistence.

### Core Architecture

1. **Multi-board System**: Users can have multiple Kanban boards, each containing lanes and notes
2. **File-based Storage**: Uses JSON files for persistence (no database required)
3. **User Isolation**: Each user gets their own data directory for multi-tenant support
4. **Static Asset Bundling**: All CSS, JS, and assets are compiled into the binary using BakedFileSystem

### Key Components

- **src/tocry.cr**: Main application module and configuration
- **src/main.cr**: Application entry point and server setup
- **src/board_manager.cr**: Handles multi-board management and persistence
- **src/endpoints/**: RESTful API endpoints (boards, lanes, notes, uploads, auth)
- **src/assets/**: Frontend JavaScript and CSS
- **templates/**: ECR templates for server-side rendering

### Authentication Modes

The application supports three authentication modes (controlled by environment variables):

1. **Google OAuth** (priority 1): Requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
2. **Basic Auth** (priority 2): Requires `AUTH_USER` and `AUTH_PASSWORD`
3. **No Authentication** (default): Open access

### Data Structure

```
data/
├── {user_id}/          # User-specific directory
│   ├── boards/         # Individual board JSON files
│   └── settings.json   # User preferences
└── global/             # Shared data (if any)
```

## Development Notes

### Code Style and Conventions

- The codebase follows Crystal naming conventions
- Use docopt for command-line interfaces (per user preference)
- Avoid `not_nil!` and excessive `.to_s` calls
- Use descriptive parameter names in blocks
- Follow existing patterns for API endpoints

### Testing Strategy

- Unit tests in `spec/` use Crystal's built-in testing framework
- Integration tests in `integration-test/` use Playwright for E2E testing
- Test coverage includes core domain models (Board, Lane, Note, BoardManager)

### Frontend Architecture

- Single-page application with server-side rendering
- Vanilla JavaScript (no frameworks)
- Pico.css for styling
- Drag-and-drop functionality using HTML5 drag API
- WebSocket support for real-time updates (when available)

### Migration System

- Data migrations are stored in `src/migrations/`
- Migrations run automatically on startup if needed
- Versioning ensures backward compatibility

### Docker Deployment

- Multi-architecture support (AMD64, ARM64)
- Static binary compilation
- Volume mounting for data persistence at `/data`
- Environment variable configuration for auth and settings

### Common Pitfalls

- Always validate file paths to prevent directory traversal
- Use `File.expand_path` for path joining operations
- Check file existence before operations
- Handle user authentication in the correct order (Google OAuth → Basic Auth → None)
- Remember to run migrations after schema changes
