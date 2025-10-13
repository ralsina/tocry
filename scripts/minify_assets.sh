#!/usr/bin/env bash
# Minify assets using esbuild (JS/CSS) and minify (HTML)
# Creates src/assets-min/ with minified files and source maps

set -e

ASSETS_SRC="src/assets"
ASSETS_MIN="src/assets-min"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Minifying Assets with Source Maps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for required tools
if ! command -v esbuild &> /dev/null; then
    echo "❌ Error: esbuild not found. Install with: sudo pacman -S esbuild"
    exit 1
fi

if ! command -v minify &> /dev/null; then
    echo "❌ Error: minify not found. Install with: sudo pacman -S minify"
    exit 1
fi

# Remove old minified assets
echo "🗑️  Cleaning old minified assets..."
rm -rf "$ASSETS_MIN"

# Create minified directory structure
echo "📁 Creating directory structure..."
mkdir -p "$ASSETS_MIN"

# Copy directory structure
cd "$ASSETS_SRC"
find . -type d | while read -r dir; do
    mkdir -p "../assets-min/$dir"
done
cd - > /dev/null

# Statistics
JS_COUNT=0
CSS_COUNT=0
HTML_COUNT=0
OTHER_COUNT=0
TOTAL_BEFORE=0
TOTAL_AFTER=0

echo ""
echo "🔧 Processing files..."
echo ""

# Process all files
while IFS= read -r src_file; do
    # Get relative path
    rel_path="${src_file#"$ASSETS_SRC"/}"
    dest_file="$ASSETS_MIN/$rel_path"

    # Get file extension
    ext="${src_file##*.}"

    # Get file size
    size_before=$(stat -c%s "$src_file" 2>/dev/null || stat -f%z "$src_file" 2>/dev/null)

    case "$ext" in
        js)
            # Minify JS with esbuild (with source maps)
            if esbuild "$src_file" \
                --minify \
                --sourcemap \
                --charset=utf8 \
                --target=es2020 \
                --outfile="$dest_file" 2>/dev/null; then

                size_after=$(stat -c%s "$dest_file" 2>/dev/null || stat -f%z "$dest_file" 2>/dev/null)
                if [ "$size_before" -gt 0 ]; then
                    reduction=$(( (size_before - size_after) * 100 / size_before ))
                else
                    reduction=0
                fi
                echo "  ✓ JS  $(basename "$src_file"): $size_before → $size_after bytes (-${reduction}%)"
                JS_COUNT=$((JS_COUNT + 1))
                TOTAL_BEFORE=$((TOTAL_BEFORE + size_before))
                TOTAL_AFTER=$((TOTAL_AFTER + size_after))
            else
                echo "  ✗ Failed to minify $src_file, copying original"
                cp "$src_file" "$dest_file"
            fi
            ;;

        css)
            # Minify CSS with esbuild (with source maps)
            if esbuild "$src_file" \
                --minify \
                --sourcemap \
                --charset=utf8 \
                --outfile="$dest_file" 2>/dev/null; then

                size_after=$(stat -c%s "$dest_file" 2>/dev/null || stat -f%z "$dest_file" 2>/dev/null)
                if [ "$size_before" -gt 0 ]; then
                    reduction=$(( (size_before - size_after) * 100 / size_before ))
                else
                    reduction=0
                fi
                echo "  ✓ CSS $(basename "$src_file"): $size_before → $size_after bytes (-${reduction}%)"
                CSS_COUNT=$((CSS_COUNT + 1))
                TOTAL_BEFORE=$((TOTAL_BEFORE + size_before))
                TOTAL_AFTER=$((TOTAL_AFTER + size_after))
            else
                echo "  ✗ Failed to minify $src_file, copying original"
                cp "$src_file" "$dest_file"
            fi
            ;;

        html|htm)
            # Minify HTML with minify tool (no source maps needed)
            if minify -o "$dest_file" "$src_file" 2>/dev/null; then
                size_after=$(stat -c%s "$dest_file" 2>/dev/null || stat -f%z "$dest_file" 2>/dev/null)
                if [ "$size_before" -gt 0 ]; then
                    reduction=$(( (size_before - size_after) * 100 / size_before ))
                else
                    reduction=0
                fi
                echo "  ✓ HTML $(basename "$src_file"): $size_before → $size_after bytes (-${reduction}%)"
                HTML_COUNT=$((HTML_COUNT + 1))
                TOTAL_BEFORE=$((TOTAL_BEFORE + size_before))
                TOTAL_AFTER=$((TOTAL_AFTER + size_after))
            else
                echo "  ✗ Failed to minify $src_file, copying original"
                cp "$src_file" "$dest_file"
            fi
            ;;

        *)
            # Copy other files as-is (images, fonts, etc.)
            cp "$src_file" "$dest_file"
            OTHER_COUNT=$((OTHER_COUNT + 1))
            ;;
    esac
done < <(find "$ASSETS_SRC" -type f)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Minification Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📊 Statistics:"
echo "     • JS files:    $JS_COUNT minified"
echo "     • CSS files:   $CSS_COUNT minified"
echo "     • HTML files:  $HTML_COUNT minified"
echo "     • Other files: $OTHER_COUNT copied"
echo ""

if [ "$TOTAL_BEFORE" -gt 0 ]; then
    TOTAL_REDUCTION=$(( (TOTAL_BEFORE - TOTAL_AFTER) * 100 / TOTAL_BEFORE ))
    echo "  💾 Total size: $(numfmt --to=iec "$TOTAL_BEFORE") → $(numfmt --to=iec "$TOTAL_AFTER") (-${TOTAL_REDUCTION}%)"
else
    echo "  💾 Total size: 0 bytes"
fi

echo ""
echo "  ✨ Minified assets ready in: $ASSETS_MIN/"
echo "  🗺️  Source maps included for JS/CSS debugging"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
