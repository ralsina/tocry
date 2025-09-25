#!/bin/bash
set -e
shards build
fuser -k 3000/tcp || true # Kill any process using port 3000
sleep 1 # Give the port a moment to release
pushd integration-test || exit

# Clean testdata directories before each project
rm -rf testdata*
npx playwright test --project="No Auth"

rm -rf testdata*
npx playwright test --project="Simple Auth"

rm -rf testdata*
GOOGLE_CLIENT_ID=dummy GOOGLE_CLIENT_SECRET=dummy TOCRY_FAKE_AUTH_USER=test@example.com npx playwright test --project="Google Auth"
