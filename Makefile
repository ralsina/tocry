.PHONY: all build test clean generate-clients generate-spec install dev help
.PHONY: build-static docker release deploy-site docker-upload
.PHONY: format lint check

# Default target
all: build

# Help target
help:
	@echo "ToCry Build System"
	@echo ""
	@echo "Available targets:"
	@./scripts/print_help.sh

# Install dependencies
install:
	shards install

# Generate OpenAPI spec from Crystal models
generate-spec:
	@echo "Generating OpenAPI specification..."
	crystal run src/openapi_manual.cr -- openapi.json

# Generate JSON Schema files for validation from OpenAPI spec
generate-schemas: generate-spec
	@echo "Generating JSON Schema files..."
	crystal run scripts/generate_validation_schemas.cr

# Generate TypeScript and Crystal clients from OpenAPI spec
generate-clients: generate-schemas
	@echo "Generating API clients..."
	./scripts/generate_clients.sh

# Ensure clients are generated before building
src/assets/api_client_ts_dist/index.js: openapi.json
	@echo "TypeScript client not found or outdated, generating..."
	./scripts/generate_clients.sh

# Main build target - ensures clients exist
build: src/assets/api_client_ts_dist/index.js
	@echo "Building ToCry..."
	shards build --release

# Development build (faster, no optimizations)
dev: src/assets/api_client_ts_dist/index.js
	@echo "Building ToCry (development mode)..."
	shards build

# Run tests (also ensures clients are generated)
test: src/assets/api_client_ts_dist/index.js
	@echo "Running tests..."
	./scripts/run_tests.sh

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@./scripts/clean_build.sh

# Static builds for distribution
build-static: src/assets/api_client_ts_dist/index.js
	@echo "Building static binaries..."
	./scripts/build_static.sh

# Docker targets
docker: src/assets/api_client_ts_dist/index.js
	@echo "Building Docker images..."
	./scripts/upload_docker.sh

docker-upload: docker
	@echo "Docker images built and pushed"

# Release management
release: build-static
	@echo "Creating release..."
	./scripts/do_release.sh

# Deploy website
deploy-site:
	@echo "Deploying website..."
	./scripts/deploy_site.sh

# Code quality targets
format:
	@echo "Formatting Crystal code..."
	crystal tool format

lint:
	@echo "Linting Crystal code..."
	@./scripts/run_lint.sh

check: lint test
	@echo "All checks passed!"
