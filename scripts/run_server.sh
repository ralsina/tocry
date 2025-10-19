#!/bin/bash

# Self-rebuilding ToCry server script
# This script builds and runs the ToCry server

echo "=== Rebuilding and restarting ToCry ==="
echo "Building Crystal binary..."
if shards build; then
    echo "Build successful, starting server..."
    echo "Server will run on http://localhost:3000"
    echo "Data path: ./data"
    echo "Press Ctrl+C to stop the server"
    echo ""
    ./bin/tocry --port 3000 --data-path ./data
else
    echo "Build failed, not starting server"
    exit 1
fi
