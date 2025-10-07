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

crystal spec --error-trace || kill $TOCRY_PID
kill $TOCRY_PID
