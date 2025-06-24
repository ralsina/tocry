#!/bin/bash
set -e
shards build
rm -rf integration-test/testdata
pushd integration-test || exit
npm test
