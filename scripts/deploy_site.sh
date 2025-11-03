#!/bin/bash
set -e

echo "🚀 Starting ToCry site deployment..."

# Step 1: Take fresh screenshot of demo site
echo "📸 Taking fresh screenshot from demo site..."
cd src/js
if ! node screenshot-demo.js; then
    echo "❌ Failed to take screenshot"
    exit 1
fi
echo "✅ Screenshot taken successfully"

# Step 2: Build mdbook documentation
echo "📚 Building mdbook documentation..."
cd ../../docs
if ! mdbook build; then
    echo "❌ Failed to build mdbook"
    exit 1
fi
echo "✅ mdbook built successfully"

# Step 3: Deploy the documentation
echo "📤 Deploying documentation to server..."

# Deploy the mdbook content (entire book directory)
rsync -rav --delete book/ root@rocky:/data/stacks/web/websites/tocry.ralsina.me/

# Copy supporting files that were in the original script
cp ../src/assets/favicon.ico .
cp ../install.sh .
cp ../docs/src/screenshot.png .

# Upload supporting files
rsync -av favicon.ico install.sh screenshot.png root@rocky:/data/stacks/web/websites/tocry.ralsina.me/

echo "✅ Documentation deployed successfully!"
echo "🌐 Site available at: https://tocry.ralsina.me"
echo ""
echo "📋 Deployment summary:"
echo "   - Fresh screenshot from demo site"
echo "   - mdbook documentation built and deployed"
echo "   - Supporting files (favicon, install.sh) uploaded"
