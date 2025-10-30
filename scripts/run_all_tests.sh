#!/bin/bash

set -e

echo "🧪 Running ToCry Test Suite"
echo "=========================="

# Test configuration
TEST_PORT=3001
TEST_DATA_DIR="/tmp/tocry-test-data"

# Ensure we're in the project root
cd "$(dirname "$0")/.."

echo "🔨 Building project..."
shards build

echo ""
echo "📋 JavaScript Unit Tests"
echo "========================"
cd src/js
npm test
cd ../..

echo ""
echo "🧪 Crystal Backend Tests"
echo "========================"
# Clean up any existing test data
rm -rf $TEST_DATA_DIR

# Start test server in background
./bin/tocry --data-path=$TEST_DATA_DIR --port=$TEST_PORT &
TOCRY_PID=$!
sleep 2

# Run Crystal tests
crystal spec --error-trace
CRYSTAL_EXIT_CODE=$?

# Clean up the server process
kill $TOCRY_PID 2>/dev/null || true
wait $TOCRY_PID 2>/dev/null || true

if [ $CRYSTAL_EXIT_CODE -ne 0 ]; then
    echo "❌ Crystal tests failed!"
    exit $CRYSTAL_EXIT_CODE
fi

echo ""
echo "🌐 E2E Tests"
echo "============"
cd src/js
npm run test:e2e
E2E_EXIT_CODE=$?
cd ../..

if [ $E2E_EXIT_CODE -ne 0 ]; then
    echo "❌ E2E tests failed!"
    exit $E2E_EXIT_CODE
fi

echo ""
echo "✅ All tests passed!"
echo "=================="
