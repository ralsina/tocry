#!/bin/bash
set -e

echo "=== Building static ToCry binaries ==="

# Step 1: Generate OpenAPI clients (must be done before building)
echo "Step 1: Generating OpenAPI clients..."
./scripts/generate_clients.sh

# Step 2: Install dependencies
echo "Step 2: Installing Crystal dependencies..."
shards install

# Step 3: Setup QEMU for multi-arch builds
echo "Step 3: Setting up QEMU for multi-architecture builds..."
docker run --rm --privileged \
  multiarch/qemu-user-static \
  --reset -p yes

# Step 4: Build for AMD64
echo "Step 4: Building for AMD64..."
docker build . -f Dockerfile.static -t tocry-builder
docker run -ti --rm -v "$PWD":/app --user="$UID" tocry-builder \
  /bin/sh -c "cd /app && shards build --static --release -Dno_fswatch -Dpreview_mt && strip bin/tocry && upx bin/tocry"
mv bin/tocry bin/tocry-static-linux-amd64
echo "✓ AMD64 build complete: bin/tocry-static-linux-amd64"

# Step 5: Build for ARM64
echo "Step 5: Building for ARM64..."
docker build . -f Dockerfile.static --platform linux/arm64 -t tocry-builder
docker run -ti --rm -v "$PWD":/app --platform linux/arm64 --user="$UID" tocry-builder \
  /bin/sh -c "cd /app && shards build --static --release -Dno_fswatch -Dpreview_mt && strip bin/tocry && upx bin/tocry"
mv bin/tocry bin/tocry-static-linux-arm64
echo "✓ ARM64 build complete: bin/tocry-static-linux-arm64"

echo ""
echo "=== Build complete! ==="
echo "AMD64 binary: bin/tocry-static-linux-amd64"
echo "ARM64 binary: bin/tocry-static-linux-arm64"
