#!/bin/bash
set -e

docker run --rm --privileged \
  multiarch/qemu-user-static \
  --reset -p yes

shards install

# Build for AMD64
docker build . -f Dockerfile.static -t tocry-builder
docker run -ti --rm -v "$PWD":/app --user="$UID" tocry-builder \
  /bin/sh -c "cd /app && shards build --static --release && strip bin/tocry"
mv bin/tocry bin/tocry-static-linux-amd64

# Build for ARM64
docker build . -f Dockerfile.static --platform linux/arm64 -t tocry-builder
docker run -ti --rm -v "$PWD":/app --platform linux/arm64 --user="$UID" tocry-builder \
  /bin/sh -c "cd /app && shards build --static --release && strip bin/tocry"
v bin/tocry bin/tocry-static-linux-arm64
