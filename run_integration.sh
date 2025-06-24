#!/bin/bash
set -e
pushd integration-test || exit
npm test
