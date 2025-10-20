#!/bin/bash
set -e

# Generate OpenAPI spec directly (bypass Swagger library limitations)
crystal run src/openapi_manual.cr -- openapi.json

# Validate and generate clients
openapi-generator-cli validate -i openapi.json
openapi-generator-cli generate -i openapi.json -g crystal -o lib/tocry_api
openapi-generator-cli generate -i openapi.json -g typescript-fetch -o src/assets/api_client_ts --additional-properties=supportsES6=true,npmName=tocry-api,typescriptThreePlus=true

# Fix known issues in generated Crystal client
echo "Fixing generated Crystal client syntax issues..."

# Fix empty Hash syntax in configuration.cr (multiline)
# The generator creates "Hash{\n      }" which needs to be replaced with "{} of String => String"
sed -i ':a;N;$!ba;s/Hash{\n\s*}/{} of String => String/g' lib/tocry_api/src/openapi_client/configuration.cr

# Fix auth_settings access in api_client.cr - the generated code uses Ruby-style symbol hash access
# which doesn't work in Crystal. Since we don't use auth, make it safe to call.
# Replace the update_params_for_auth! method implementation with a no-op
sed -i '/def update_params_for_auth!/,/^    end$/{
  /def update_params_for_auth!/!{
    /^    end$/!d
  }
  /def update_params_for_auth!/a\      # Authentication not used - no-op
}' lib/tocry_api/src/openapi_client/api_client.cr

echo "Crystal client fixes applied successfully"

# Build TypeScript client to JavaScript
echo "Building TypeScript client..."
cd src/assets/api_client_ts
npm install
npm run build
cd ../../..

echo "TypeScript client built successfully"
echo "Compiled JavaScript available at: src/assets/api_client_ts/dist/"

# Copy ESM build to assets for BakedFileSystem
echo "Copying ESM build to assets directory..."
rm -rf src/assets/api_client_ts_dist
cp -r src/assets/api_client_ts/dist/esm src/assets/api_client_ts_dist

# Fix ESM imports to include .js extensions (required for browser modules)
echo "Fixing ESM import paths..."
find src/assets/api_client_ts_dist -name "*.js" -type f -exec sed -i "s|from '\./\([^']*\)';|from './\1.js';|g" {} \;
find src/assets/api_client_ts_dist -name "*.js" -type f -exec sed -i "s|from '\.\./\([^']*\)';|from '../\1.js';|g" {} \;

echo "ESM build copied and fixed at: src/assets/api_client_ts_dist/"

# Build the main JavaScript application with Parcel
echo "Building main JavaScript application with Parcel..."
cd src/js

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing JavaScript dependencies..."
    npm install
fi

# Build the application
echo "Bundling JavaScript with Parcel..."
npm run build

cd ../..

echo "JavaScript application built successfully!"
echo "Bundled application available at: src/assets/app.js"
