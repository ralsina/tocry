# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

### Building
```bash
# Development mode
crystal run src/main.cr

# Production build (static binary)
shards build --release --progress

# Multi-architecture static builds (AMD64 + ARM64)
./build_static.sh

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
./run_integration.sh

# Both tests run automatically on commit (via pre-commit hooks)
```

### Linting and Code Quality
```bash
# Lint code
ameba

# Auto-fix linting issues
ameba --fix
```

### Release Management
```bash
# Full release process (version bump, changelog, Docker upload)
./do_release.sh

# Upload Docker images only
./upload_docker.sh
```

### Installation Script
```bash
# Install ToCry automatically (one-liner, system-wide)
curl -sSL https://tocry.ralsina.me/install.sh | sudo bash

# Install for current user only
curl -sSL https://tocry.ralsina.me/install.sh | bash

# Install with custom options
INSTALL_DIR=$HOME/.local/bin DATA_DIR=$HOME/.local/share/tocry ./install.sh

# Uninstall ToCry
curl -sSL https://tocry.ralsina.me/install.sh | bash -s -- --uninstall

# Show help
./install.sh --help
```

The install script provides:
- Automatic architecture detection (AMD64/ARM64)
- System-wide or user installation
- Systemd service creation (for root installations)
- Data directory setup
- Clean uninstallation
- Comprehensive error handling

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
- **src/board_manager.cr**: Handles multi-board management and persistence with UUID-based naming
- **src/endpoints/**: RESTful API endpoints (boards, lanes, notes, uploads, auth)
- **src/assets/**: Frontend JavaScript and CSS
- **templates/**: ECR templates for server-side rendering

### Domain Models

- **Board**: Kanban board containing lanes with sepia_id-based naming
- **Lane**: Column within a board containing ordered notes
- **Note**: Individual task items with support for Markdown, priority labels (High/Medium/Low), and file attachments

### Authentication Modes

The application supports three authentication modes (controlled by environment variables):

1. **Google OAuth** (priority 1): Requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
2. **Basic Auth** (priority 2): Requires `TOCRY_AUTH_USER` and `TOCRY_AUTH_PASS`
3. **No Authentication** (default): Open access

### Data Structure

```
data/
├── users/              # User-specific directories
│   ├── {user_id}/      # Sanitized email or "root" for basic/no auth
│   │   ├── boards/     # Symlink to global boards or user-specific boards
│   │   └── settings.json # User preferences
│   └── root/           # Default user directory (symlinks to global boards)
├── boards/             # Global boards directory with UUID naming
│   ├── {uuid}.{name}/  # Board directory with sepia_id and name
│   └── uploads/        # User-uploaded files and images
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
- Images published to GitHub Container Registry (ghcr.io)

### Release Process

- Version management using git-cliff for changelog generation
- Conventional commits for automated version bumping
- Automated multi-architecture Docker builds and uploads
- Static binary builds for both AMD64 and ARM64 architectures

### Common Pitfalls

- Always validate file paths to prevent directory traversal (use `validate_path_within_data_dir`)
- Use `File.expand_path` for path joining operations
- Check file existence before operations
- Handle user authentication in the correct order (Google OAuth → Basic Auth → None)
- Remember to run migrations after schema changes
- The `not_nil!` method is allowed only in specific files (see .ameba.yml)
- Boolean properties should use the `?` suffix (Naming/QueryBoolMethods rule)
- Use descriptive parameter names in blocks and follow existing patterns

### Development Workflow

- Pre-commit hooks require both unit and integration tests to pass
- Editor configuration uses 2-space indentation for Crystal files (see .editorconfig)
- Ameba linting has specific exclusions for certain files and rules (see .ameba.yml)
- CLI arguments use docopt with options: `--data-path`, `--safe-mode`, `--port`, `--bind`
- Kemal sessions configured for security with specific timeout and secret settings
