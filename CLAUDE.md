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
# Run all tests (unit + integration)
make test

# Run unit tests only
crystal spec
# or use convenience script
./run_unit.sh

# Run integration tests only (requires Playwright)
./run_integration.sh

# Run E2E tests (requires Playwright)
cd src/js && npm run test:e2e

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
- **Note**: Individual task items with support for Markdown, priority labels (High/Medium/Low), file attachments, start/end dates, and collapsible content

### Configuration System

ToCry uses a unified configuration system that supports three sources with clear precedence:

1. **Command Line Arguments** (highest precedence)
2. **Environment Variables** (with `TOCRY_` prefix)
3. **Configuration File** (YAML or JSON, lowest precedence)

#### Configuration Examples

**Using a configuration file:**
```bash
# Create config.yml
cat > config.yml << EOF
port: 8080
data_path: "/custom/data/path"
safe_mode: true
ai_model: "glm-4-plus"
cache_size: 2000
EOF

# Run with config file
tocry --config config.yml
```

**Using environment variables:**
```bash
export TOCRY_PORT=8080
export TOCRY_DATA_PATH="/custom/data/path"
export TOCRY_SAFE_MODE=true
export TOCRY_AI_MODEL="glm-4-plus"
tocry
```

**Using command line arguments:**
```bash
tocry --port=8080 --data-path="/custom/data/path" --safe-mode --ai-model="glm-4-plus"
```

**Mixed configuration (precedence: CLI > env > config file):**
```bash
# config.yml has port: 8080
export TOCRY_PORT=9000
tocry --config config.yml --port=9999  # Final port will be 9999 (CLI wins)
```

**Configuration file format (YAML):**
See `config-example.yml` for a complete example configuration file.

### Authentication Modes

The application supports three authentication modes (determined automatically based on available credentials):

1. **Google OAuth** (priority 1): Configure via CLI, environment variables, or config file:
   ```bash
   # CLI
   tocry --google-client-id="your-client-id" --google-client-secret="your-secret"

   # Environment variables
   export GOOGLE_CLIENT_ID="your-client-id"
   export GOOGLE_CLIENT_SECRET="your-secret"
   tocry

   # Config file
   google_client_id: "your-client-id"
   google_client_secret: "your-secret"
   ```

2. **Basic Auth** (priority 2): Configure via CLI, environment variables, or config file:
   ```bash
   # CLI
   tocry --auth-user="admin" --auth-pass="password"

   # Environment variables
   export TOCRY_AUTH_USER="admin"
   export TOCRY_AUTH_PASS="password"
   tocry

   # Config file
   auth_user: "admin"
   auth_pass: "password"
   ```

3. **No Authentication** (default): Open access when no auth credentials are provided

**Session Management:**
- Session secret can be configured via `--session-secret`, `SESSION_SECRET` environment variable, or config file
- Auto-generated session secret is used if not specified

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
- ToastUI Editor for rich Markdown editing
- Smart collapsible notes that only show dates when expanded
- Copy-to-install functionality for easy deployment

### OpenAPI Schema Management

**IMPORTANT**: OpenAPI schemas must be kept in sync with model classes!

The project uses a manual approach for OpenAPI schema generation where each model class (`Note`, `Lane`, `Board`) has a `self.schema` class method that defines its OpenAPI schema. These schemas live directly in the model files for better locality and maintainability.

**When modifying models:**
1. If you add/remove/modify a property in a model class, **immediately update** the corresponding `self.schema` method
2. Schema methods are located at the bottom of each model file (`src/note.cr`, `src/lane.cr`, `src/board.cr`)
3. For `Note` models, update both `Note.schema` (for responses) and `Note.data_schema` (for request bodies with required fields)
4. After schema changes, regenerate clients: `./generate_clients.sh`
5. Validate the spec: `openapi-generator-cli validate -i openapi.json`
6. **See `SCHEMA_SYNC_EXAMPLE.md` for a detailed example and checklist**

**Why manual schemas?**
- Crystal's macro system cannot access instance variables at the right time for automatic generation
- Manual schemas provide explicit API contracts and are easy to customize
- The overhead is minimal (~3 lines per property) and ensures type safety
- See `ANNOTATION_INVESTIGATION.md` and `FINAL_VERDICT.md` for detailed investigation

**Schema locations:**
- `src/note.cr`: `Note.schema` and `Note.data_schema`
- `src/lane.cr`: `Lane.schema`
- `src/board.cr`: `Board.schema`
- `src/openapi_manual.cr`: Main OpenAPI spec generator that references these schemas

### Migration System

- Data migrations are stored in `src/migrations/`
- Migrations run automatically on startup if needed
- Versioning ensures backward compatibility

### API Client Libraries

**Generated Clients:**

- **Crystal client**: `lib/tocry_api/` - Used in backend tests with automatic bug fixes
- **TypeScript client**: `src/assets/api_client_ts/` - Type-safe client with native fetch API
  - Source: `src/assets/api_client_ts/src/`
  - Compiled output: `src/assets/api_client_ts/dist/` (CommonJS and ESM)
  - Zero dependencies, uses native browser fetch API
- **Generation script**: `./generate_clients.sh` - Generates both clients and compiles TypeScript

**Browser API Client:**

- Hand-written client: `src/assets/api-client.js`
- Browser-compatible (no build step required)
- Should be kept in sync with OpenAPI spec manually
- Used directly by the frontend application

**When making API changes:**

1. Update OpenAPI schemas in model classes (e.g., `Note.schema`, `Lane.schema`)
2. Run `./generate_clients.sh` to regenerate and compile clients
3. Update `src/assets/api-client.js` if endpoints changed
4. Backend tests automatically use generated Crystal client
5. Frontend currently uses hand-written browser-compatible client
6. TypeScript client available for future frontend migration (provides type safety)

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
- Never commit without an explicit request from the user
- The server is constantly being rebuilt on demand on every saved change, no need to kill it and start it to test it

### Important Notes

- remember the openapi spec is at <http://localhost:3000/v3/swagger.json>
- There is often a self-rebuilding server in port 3000
- to build the project, use "make" because you need to generate API clients
- to run the tests, run "make test"
