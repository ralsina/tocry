#!/bin/bash
set -e
shards build
rm -rf integration-test/testdata
fuser -k 3000/tcp || true # Kill any process using port 3000
sleep 1 # Give the port a moment to release
pushd integration-test || exit
npx playwright test --project="No Auth"
npx playwright test --project="Simple Auth"
TOCRY_FAKE_AUTH_USER=test@example.com npx playwright test --project="Google Auth"
