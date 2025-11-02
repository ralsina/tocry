#!/bin/sh
# Fast Docker upload script using pre-built static binaries

# Setup multi-platform support
docker run --rm --privileged \
        multiarch/qemu-user-static \
        --reset -p yes

# Get version for tagging
VERSION=$(shards version)

# Build ARM64 image using pre-built static binary (fast!)
echo "Building ARM64 Docker image..."
docker build . --platform=linux/arm64 -f Dockerfile.release-arm64 -t ghcr.io/ralsina/tocry-arm64:latest -t ghcr.io/ralsina/tocry-arm64:"${VERSION}"

# Build AMD64 image using pre-built static binary (fast!)
echo "Building AMD64 Docker image..."
docker build . --platform=linux/amd64 -f Dockerfile.release-amd64 -t ghcr.io/ralsina/tocry:latest -t ghcr.io/ralsina/tocry:"${VERSION}"

# Login to GitHub Container Registry
echo "Logging into GitHub Container Registry..."
pass github-registry | docker login ghcr.io -u ralsina --password-stdin

# Push all images
echo "Pushing images to registry..."
docker push ghcr.io/ralsina/tocry-arm64:latest
docker push ghcr.io/ralsina/tocry-arm64:"${VERSION}"
docker push ghcr.io/ralsina/tocry:latest
docker push ghcr.io/ralsina/tocry:"${VERSION}"

echo "All images pushed successfully!"
