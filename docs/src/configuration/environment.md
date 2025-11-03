# Environment Variables

You can configure ToCry using environment variables. Environment variables take precedence over CLI defaults but are overridden by explicit CLI arguments.

## All Available Environment Variables

### Cache Settings

```bash
export TOCRY_CACHE_SIZE=1000          # Maximum number of objects to cache
export TOCRY_CACHE_TTL=0              # Cache TTL in seconds (0 = no expiration)
```

### Data and Server Settings

```bash
export TOCRY_DATA_PATH=/path/to/data   # Custom data directory
export TOCRY_PORT=3000                 # Server port
export TOCRY_BIND=127.0.0.1           # Bind address
```

### Authentication Settings

```bash
export GOOGLE_CLIENT_ID="your-id"
export GOOGLE_CLIENT_SECRET="your-secret"
export TOCRY_AUTH_USER="username"
export TOCRY_AUTH_PASS="password"
```

### AI Settings

```bash
export TOCRY_AI_MODEL=glm-4.5-flash   # AI model to use
```

## Usage Examples

### Cache Configuration

```bash
export TOCRY_CACHE_SIZE=500
export TOCRY_CACHE_TTL=60

# Cache will use 500 objects with 60-second TTL
tocry
```

### Development Environment

```bash
export TOCRY_PORT=8080
export TOCRY_BIND=0.0.0.0
export TOCRY_CACHE_SIZE=100

# Development-friendly configuration
tocry
```

### Production Environment

```bash
export TOCRY_CACHE_SIZE=5000
export TOCRY_CACHE_TTL=3600
export TOCRY_DATA_PATH=/var/lib/tocry

# Production-optimized configuration
tocry --port=80
```

## Configuration Priority

Environment variables have medium priority in the configuration hierarchy:

1. **Command Line Arguments** (highest priority)
2. **Environment Variables**
3. **Default Values** (lowest priority)

### Priority Example

```bash
# Environment variable sets cache size to 500
export TOCRY_CACHE_SIZE=500

# CLI argument overrides environment variable (cache will be 200)
tocry --cache-size=200 --cache-ttl=60
```

## Environment Files

For convenience, you can create environment files:

### .env file for development

```bash
# .env
TOCRY_CACHE_SIZE=500
TOCRY_CACHE_TTL=300
TOCRY_PORT=8080
TOCRY_AI_MODEL=glm-4.5-flash
```

Then load it before starting ToCry:

```bash
source .env && toCry
```

### Systemd Environment

For systemd services, you can set environment variables directly:

```ini
[Service]
Environment=TOCRY_CACHE_SIZE=2000
Environment=TOCRY_CACHE_TTL=1800
Environment=TOCRY_DATA_PATH=/var/lib/tocry
ExecStart=/usr/local/bin/tocry
```

## Security Considerations

### Authentication Credentials

Never commit authentication credentials to version control:

```bash
# ✅ Good: Load from secure source
export GOOGLE_CLIENT_ID=$(cat /etc/tocry/google_client_id)
export GOOGLE_CLIENT_SECRET=$(cat /etc/tocry/google_client_secret)

# ❌ Bad: Hard-coded credentials
export GOOGLE_CLIENT_ID="123456789.apps.googleusercontent.com"
```

### File Permissions

Secure your environment files:

```bash
# Restrict permissions to owner only
chmod 600 .env
chmod 600 /etc/tocry/credentials
```

## Troubleshooting

### Check Environment Variables

Verify that environment variables are set correctly:

```bash
# Check specific variable
echo $TOCRY_CACHE_SIZE

# Check all ToCry environment variables
env | grep TOCRY
```

### Debug Environment Loading

Start ToCry with debug logging to see configuration values:

```bash
# Environment variables will be shown in startup logs
tocry --demo | head -20
```

### Common Issues

**Variable not being used:**
- Check spelling and case (TOCRY_CACHE_SIZE vs tocry_cache_size)
- Ensure variable is exported, not just set
- Verify no CLI argument is overriding the environment variable

**Permission denied:**
- Check file permissions on credential files
- Ensure the ToCry process can read the environment file

**Variable not taking effect:**
- Restart the ToCry service after changing environment variables
- Check if systemd service needs to be reloaded: `systemctl daemon-reload`

For more configuration options, see the [main configuration guide](README.md).
