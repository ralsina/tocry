# Configuration

ToCry supports various configuration options to customize its behavior, including performance settings, data paths, and authentication modes.

## Command Line Options

You can configure ToCry using command line arguments. Run `tocry --help` to see all available options:

```bash
tocry --help
```

### Cache Configuration

ToCry uses intelligent caching to improve performance. You can control cache behavior with these options:

```bash
# Set cache size to 500 objects (default: 1000)
tocry --cache-size=500

# Set cache TTL to 60 seconds (default: 0 = no expiration)
tocry --cache-ttl=60

# Disable caching entirely (for debugging or low-memory systems)
tocry --no-cache
```

#### Cache Configuration Examples

**High Performance System:**
```bash
tocry --cache-size=5000 --cache-ttl=3600
```
*Large cache with 1-hour expiration for maximum performance*

**Low Memory System:**
```bash
tocry --cache-size=100 --cache-ttl=300
```
*Smaller cache with 5-minute expiration to conserve memory*

**Development/Debugging:**
```bash
tocry --no-cache
```
*Disables caching entirely to ensure fresh data on every request*

### Basic Configuration

```bash
# Run on different port
tocry --port=8080

# Use custom data directory
tocry --data-path=/path/to/data

# Bind to all interfaces (instead of localhost only)
tocry --bind=0.0.0.0

# Use Unix socket instead of TCP
tocry --unix-socket=/tmp/tocry.sock
```

### AI Configuration

```bash
# Use different AI model
tocry --ai-model=glm-4.5

# Disable MCP (Model Context Protocol) support
tocry --no-mcp
```

## Environment Variables

You can also configure ToCry using environment variables. Environment variables take precedence over CLI defaults but are overridden by explicit CLI arguments.

### Cache Environment Variables

```bash
export TOCRY_CACHE_SIZE=500
export TOCRY_CACHE_TTL=60

# Cache will use 500 objects with 60-second TTL
tocry
```

### All Available Environment Variables

```bash
# Cache settings
export TOCRY_CACHE_SIZE=1000          # Maximum number of objects to cache
export TOCRY_CACHE_TTL=0              # Cache TTL in seconds (0 = no expiration)

# Data and server settings
export TOCRY_DATA_PATH=/path/to/data   # Custom data directory
export TOCRY_PORT=3000                 # Server port
export TOCRY_BIND=127.0.0.1           # Bind address

# Authentication settings
export GOOGLE_CLIENT_ID="your-id"
export GOOGLE_CLIENT_SECRET="your-secret"
export TOCRY_AUTH_USER="username"
export TOCRY_AUTH_PASS="password"

# AI settings
export TOCRY_AI_MODEL=glm-4.5-flash   # AI model to use
```

## Configuration Priority

Configuration is applied in this order (highest priority first):

1. **Command Line Arguments** - Explicitly specified options
2. **Environment Variables** - Set via export or in shell profile
3. **Default Values** - Built-in defaults when no other config provided

### Example Priority Demonstration

```bash
# Environment variable sets cache size to 500
export TOCRY_CACHE_SIZE=500

# CLI argument overrides environment variable (cache will be 200)
tocry --cache-size=200 --cache-ttl=60
```

## Cache Performance Tuning

### Choosing Cache Size

- **Small systems** (Raspberry Pi, low RAM): 100-500 objects
- **Typical desktop**: 1000-2000 objects (default)
- **High-performance servers**: 5000+ objects

### Choosing Cache TTL

- **Short-lived data**: 60-300 seconds (1-5 minutes)
- **Typical work sessions**: 900-3600 seconds (15-60 minutes)
- **Long-running servers**: 0 (no expiration)

### Memory Usage Estimation

Cache memory usage is approximately 1KB per cached object:

```bash
# 1000 objects ≈ 1MB RAM
# 5000 objects ≈ 5MB RAM
```

## Configuration Files

While ToCry primarily uses CLI and environment variables for configuration, you can create shell scripts or systemd service files for persistent configuration.

### Systemd Service Example

```ini
[Unit]
Description=ToCry Kanban Application
After=network.target

[Service]
Type=simple
User=tocry
Group=tocry
ExecStart=/usr/local/bin/tocry --cache-size=2000 --cache-ttl=1800
WorkingDirectory=/var/lib/tocry
Environment=TOCRY_CACHE_SIZE=2000
Environment=TOCRY_CACHE_TTL=1800
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Shell Wrapper Script

```bash
#!/bin/bash
# /usr/local/bin/tocry-configured

# Set your preferred configuration
export TOCRY_CACHE_SIZE=1500
export TOCRY_CACHE_TTL=900
export TOCRY_AI_MODEL=glm-4.5

# Run ToCry
exec /usr/local/bin/tocry "$@"
```

## Troubleshooting Configuration

### Check Current Configuration

ToCry logs the cache configuration on startup:

```bash
tocry --demo | grep "Cache"
```

Output will show:
```
Cache size set to 1000 objects
Cache TTL: no expiration (objects cached indefinitely)
Cache configured: size=1000, ttl=0s, disabled=false
Initial cache stats: {hits: 0, misses: 0, evictions: 0, invalidations: 0, size: 0, max_size: 1000}
```

### Common Issues

**Cache not working:**
- Ensure you're not using `--no-cache` flag
- Check if cache size is too small for your workload
- Verify cache hit rates in the logs

**Memory issues:**
- Reduce cache size with `--cache-size`
- Set shorter TTL with `--cache-ttl`
- Use `--no-cache` on very low-memory systems

**Performance problems:**
- Increase cache size for frequently accessed boards
- Check cache hit rates in startup logs
- Consider using longer TTL for stable data

For more help with configuration, see the [installation guide](installation.md) or [features documentation](features.md).
