.PHONY: all build test clean generate-clients generate-spec install dev watch help
.PHONY: build-static docker release deploy-site docker-upload build-js test-js test-js-coverage test-coverage
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
	@echo "Installing Crystal dependencies..."
	shards install
	@echo "Installing JavaScript dependencies..."
	cd src/js && npm install

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

# Build JavaScript application only (for development)
build-js:
	@echo "Building JavaScript application..."
	cd src/js && npm run build

# Run JavaScript tests only
test-js:
	@echo "Running JavaScript tests..."
	cd src/js && npm test

# Run JavaScript tests with coverage
test-js-coverage:
	@echo "Running JavaScript tests with coverage..."
	cd src/js && npm run test:coverage

# Main build target - regenerates clients and builds everything
build: generate-clients-force build-js install
	@echo "Building ToCry..."
	shards build --release

# Development build (faster, no optimizations)
dev: generate-clients-force build-js
	@echo "Building ToCry (development mode)..."
	shards build

# Watch and auto-rebuild server during development
watch:
	@echo "Watching for changes and running ToCry on port 3000..."
	@echo "Data path: ./data"
	@echo "Press Ctrl+C to stop"
	@find src | entr -rn ./scripts/run_server.sh

# Run all tests (Crystal and JavaScript)
test: generate-clients-force test-js
	@echo "Running all tests..."
	./scripts/run_tests.sh

# Run tests with coverage
test-coverage: test-js-coverage
	@echo "Running tests with coverage..."
	./scripts/run_tests.sh

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@./scripts/clean_build.sh
	@echo "Cleaning JavaScript artifacts..."
	cd src/js && rm -rf node_modules .parcel-cache

# Static builds for distribution
build-static: generate-clients-force build-js
	@echo "Building static binaries..."
	./scripts/build_static.sh

# Docker targets
docker: generate-clients-force build-js
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
