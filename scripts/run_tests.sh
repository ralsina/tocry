#!/bin/bash

set -e

# Test configuration
TEST_PORT=3001
TEST_DATA_DIR="/tmp/tocry-test-data"

# Note: Client generation is handled by the Makefile
# If running this script directly, ensure clients are generated first

shards build
rm -rf $TEST_DATA_DIR
./bin/tocry --data-path=$TEST_DATA_DIR --port=$TEST_PORT &
TOCRY_PID=$!
sleep 2

# Run tests and capture exit status
crystal spec --error-trace
TEST_EXIT_CODE=$?

# Clean up the server process
kill $TOCRY_PID 2>/dev/null || true
wait $TOCRY_PID 2>/dev/null || true

# Exit with the test exit code
exit $TEST_EXIT_CODE
