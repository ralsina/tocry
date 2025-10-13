#!/bin/bash
# Pre-build hook to ensure generated clients exist
set -e

DIST_DIR="src/assets/api_client_ts_dist"
OPENAPI_SPEC="openapi.json"

echo "🔍 Checking if API clients need generation..."

# Check if the generated client directory exists and has files
if [ ! -d "$DIST_DIR" ] || [ ! -f "$DIST_DIR/index.js" ]; then
    echo "⚠️  Generated TypeScript client not found!"
    echo "🔧 Generating API clients..."
    ./generate_clients.sh
    echo "✅ API clients generated successfully"
elif [ "$OPENAPI_SPEC" -nt "$DIST_DIR/index.js" ]; then
    echo "⚠️  OpenAPI spec is newer than generated client!"
    echo "🔧 Regenerating API clients..."
    ./generate_clients.sh
    echo "✅ API clients regenerated successfully"
else
    echo "✅ API clients are up to date"
fi
