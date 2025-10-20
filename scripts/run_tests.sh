#!/bin/bash

set -e

# Test configuration
TEST_PORT=3001
TEST_DATA_DIR="/tmp/tocry-test-data"
SKIP_JS_TESTS=${SKIP_JS_TESTS:-false}

# Note: Client generation is handled by the Makefile
# If running this script directly, ensure clients are generated first

echo "🔨 Building project..."
shards build

if [ "$SKIP_JS_TESTS" = "false" ]; then
    echo "🧪 Running Jest JavaScript tests..."
    cd src/js
    npm test
    cd ../..
else
    echo "⏭️  Skipping JavaScript tests (SKIP_JS_TESTS=true)"
fi

echo "🚀 Starting test server..."
rm -rf $TEST_DATA_DIR
./bin/tocry --data-path=$TEST_DATA_DIR --port=$TEST_PORT &
TOCRY_PID=$!
sleep 2

echo "🧪 Running Crystal unit tests..."
# Run tests and capture exit status
crystal spec --error-trace
TEST_EXIT_CODE=$?

# Clean up the server process
kill $TOCRY_PID 2>/dev/null || true
wait $TOCRY_PID 2>/dev/null || true

# Exit with the test exit code
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ Some tests failed!"
fi
exit $TEST_EXIT_CODE
