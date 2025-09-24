#!/bin/bash
set -e

echo "Building ToCry Demo Version..."

# Install dependencies if needed
if [ ! -d "lib" ]; then
    shards install
fi

# Build the demo version with the -Ddemo flag
echo "Building demo binary..."
crystal build -Ddemo --static --release --progress src/main.cr -o bin/tocry-demo

# Strip binary to reduce size
if command -v strip &> /dev/null; then
    strip bin/tocry-demo
fi

# Compress binary if UPX is available
if command -v upx &> /dev/null; then
    upx bin/tocry-demo
fi

echo "Demo binary built successfully: bin/tocry-demo"
echo ""
echo "To run the demo version:"
echo "  ./bin/tocry-demo --port 3000"
echo ""
echo "The demo version includes:"
echo "- Sample boards with realistic data"
echo "- Read-only mode (modifications are disabled)"
echo "- Demo banner and notifications"
echo "- Mobile-optimized interface"