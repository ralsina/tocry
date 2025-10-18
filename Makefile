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

# Generate TypeScript and Crystal clients from OpenAPI spec
generate-clients: install
	@echo "Generating API clients..."
	./scripts/generate_clients.sh

# Always regenerate clients before building to ensure latest changes are included
generate-clients-force: install
	@echo "Generating API clients (forced)..."
	./scripts/generate_clients.sh

# Main build target - regenerates clients
build: generate-clients-force install
	@echo "Building ToCry..."
	shards build --release

# Development build (faster, no optimizations)
dev: generate-clients-force
	@echo "Building ToCry (development mode)..."
	shards build

# Run tests (also ensures clients are generated)
test: generate-clients-force
	@echo "Running tests..."
	./scripts/run_tests.sh

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@./scripts/clean_build.sh

# Static builds for distribution
build-static: generate-clients-force
	@echo "Building static binaries..."
	./scripts/build_static.sh

# Docker targets
docker: generate-clients-force
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
