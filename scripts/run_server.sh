#!/bin/bash

# Self-rebuilding ToCry server script
# This script builds and runs the ToCry server

make build
./bin/tocry --port 3000 --data-path ./data
