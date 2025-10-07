# Building ToCry

ToCry uses a **Makefile-based build system** to ensure generated API clients are always up-to-date before compilation.

## Why Use Make?

Crystal's `shards` tool does **not** support pre-build hooks or lifecycle scripts. Since the TypeScript API client must be generated before building (it gets baked into the binary via `BakedFileSystem`), we use Make to orchestrate the build process.

## Quick Start

```bash
# First time setup
make install          # Install Crystal dependencies

# Development
make dev             # Build in development mode (generates clients if needed)
make test            # Run tests (generates clients if needed)

# Production
make build           # Build release binary (generates clients if needed)
make build-static    # Build static binaries for distribution
```

## Available Commands

### Building

| Command | Description |
|---------|-------------|
| `make build` | Build release binary (auto-generates clients) |
| `make dev` | Build in development mode (faster, no optimizations) |
| `make build-static` | Build static binaries for AMD64 and ARM64 |
| `make install` | Install Crystal dependencies |

### Testing & Quality

| Command | Description |
|---------|-------------|
| `make test` | Run all tests |
| `make check` | Run linter and tests |
| `make format` | Format Crystal code |
| `make lint` | Run ameba linter |

### Client Generation

| Command | Description |
|---------|-------------|
| `make generate-clients` | Force regenerate OpenAPI spec and clients |
| `make generate-spec` | Regenerate only the OpenAPI spec |

### Release & Deployment

| Command | Description |
|---------|-------------|
| `make release` | Create a new release (bumps version, builds, tags, uploads to GitHub) |
| `make docker` | Build and push Docker images |
| `make deploy-site` | Deploy website to server |

### Maintenance

| Command | Description |
|---------|-------------|
| `make clean` | Remove all build artifacts |
| `make help` | Show all available commands |

## Build Process Flow

```text
make build
    ↓
Check if src/assets/api_client_ts_dist/index.js exists
    ↓ (missing)
generate-clients
    ↓
generate-spec (crystal run src/openapi_manual.cr)
    ↓
./generate_clients.sh
    ↓
    • Generate OpenAPI spec from Crystal models
    • Validate spec with openapi-generator
    • Generate Crystal client (for tests)
    • Generate TypeScript client
    • Build TypeScript → JavaScript (ESM)
    • Copy ESM build to src/assets/api_client_ts_dist/
    • Fix ESM imports to include .js extensions
    ↓
shards build --release
```

## Direct Build (Without Make)

If you must use `shards build` directly:

```bash
# You MUST generate clients first!
./generate_clients.sh

# Then you can build
shards build --release
```

**⚠️ Warning:** Using `shards build` directly will fail if clients haven't been generated, because `BakedFileSystem` expects the files to exist at compile time.

## CI/CD Integration

In CI/CD pipelines, use the Makefile targets:

```yaml
# GitHub Actions example
- name: Build
  run: make build

# GitLab CI example
build:
  script:
    - make build
```

## Docker Builds

The Dockerfile should also use Make:

```dockerfile
RUN make build
```

Or ensure clients are generated:

```dockerfile
RUN ./generate_clients.sh && shards build --release
```

## Why Not Commit Generated Clients?

Generated clients are **NOT committed** to the repository because:

1. **Single Source of Truth**: The OpenAPI spec is generated from Crystal models, avoiding drift
2. **Cleaner Git History**: Generated code creates noise in diffs
3. **Automatic Regeneration**: Make ensures clients are always in sync with the spec
4. **Smaller Repository**: Saves ~2MB of generated TypeScript/JavaScript

## Troubleshooting

### Build fails with "baked file not found"

**Cause**: Clients weren't generated before build.

**Solution**: Use `make build` instead of `shards build`, or run `./generate_clients.sh` first.

### Clients are outdated after model changes

**Cause**: Spec was regenerated but clients weren't rebuilt.

**Solution**: Run `make generate-clients` to force regeneration, or delete `src/assets/api_client_ts_dist/` and rebuild.

### npm install fails during client generation

**Cause**: Node.js dependencies issue.

**Solution:**

```bash
cd src/assets/api_client_ts
rm -rf node_modules package-lock.json
npm install
cd ../../..
make build
```
