# Docker Installation

Docker provides a clean, isolated environment for running ToCry without needing to install Crystal or manage system dependencies.

## Quick Docker Setup

### Using Docker Run

1. **Create data directory:**
   ```bash
   mkdir -p /path/to/your/data
   ```

2. **Run the container:**
   ```bash
   docker run -d --restart unless-stopped --name tocry -p 3000:3000 -v /path/to/your/data:/data ghcr.io/ralsina/tocry:latest
   ```

3. **Access ToCry:**
   Open http://localhost:3000 in your browser.

### Using Docker Compose

1. **Create docker-compose.yml:**
   ```yaml
   services:
     tocry:
       image: ghcr.io/ralsina/tocry:latest
       # For arm64, use: ghcr.io/ralsina/tocry-arm64:latest
       container_name: tocry
       restart: unless-stopped
       ports:
         - "3000:3000"
       volumes:
         - ./data:/data
   ```

2. **Start the service:**
   ```bash
   docker compose up -d
   ```

## Docker Images

### Available Images

- **AMD64**: `ghcr.io/ralsina/tocry:latest` - For Intel/AMD systems
- **ARM64**: `ghcr.io/ralsina/tocry-arm64:latest` - For ARM systems (Apple Silicon, ARM servers)

### Version Tags

- `latest` - Latest stable release
- `v1.x.x` - Specific version tags
- `main` - Latest development build (not recommended for production)

## Container Configuration

### Environment Variables

Configure ToCry using environment variables:

```bash
docker run -d --name tocry \
  -p 3000:3000 \
  -v /path/to/data:/data \
  -e TOCRY_AUTH_USER=admin \
  -e TOCRY_AUTH_PASS=password \
  -e GOOGLE_CLIENT_ID=your-client-id \
  -e GOOGLE_CLIENT_SECRET=your-client-secret \
  ghcr.io/ralsina/tocry:latest
```

Common environment variables:

- `TOCRY_AUTH_USER` / `TOCRY_AUTH_PASS` - Basic authentication
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth
- `TOCRY_PORT` - Port to listen on (default: 3000)
- `TOCRY_HOST` - Host to bind to (default: 0.0.0.0)

### Volume Mounts

ToCry uses the `/data` directory inside the container for persistence:

```bash
-v /host/path:/data
```

**What gets stored in /data:**
- Board definitions and notes
- User uploads and attachments
- User settings and preferences
- Version history (if enabled)

### Port Configuration

Change the external port mapping:

```bash
# Use port 8080 externally
docker run -d --name tocry -p 8080:3000 -v ./data:/data ghcr.io/ralsina/tocry:latest
```

## Advanced Docker Setup

### Custom Docker Compose

```yaml
services:
  tocry:
    image: ghcr.io/ralsina/tocry:latest
    container_name: tocry
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/data
      - ./config:/config
    environment:
      - TOCRY_AUTH_USER=admin
      - TOCRY_AUTH_PASS=${TOCRY_PASSWORD}
      - TOCRY_LOG_LEVEL=info
    networks:
      - tocry-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  tocry-network:
    driver: bridge
```

### Reverse Proxy Setup

#### With Nginx

```yaml
services:
  tocry:
    image: ghcr.io/ralsina/tocry:latest
    container_name: tocry
    restart: unless-stopped
    volumes:
      - ./data:/data
    networks:
      - tocry-network

  nginx:
    image: nginx:alpine
    container_name: tocry-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - tocry
    networks:
      - tocry-network

networks:
  tocry-network:
    driver: bridge
```

### Multi-Architecture Support

Docker automatically pulls the correct architecture:

```bash
# This works on both AMD64 and ARM64
docker run -d --name tocry -p 3000:3000 -v ./data:/data ghcr.io/ralsina/tocry:latest
```

For explicit architecture selection:

```bash
# Force AMD64 on ARM64 ( emulation, slower )
docker run --platform linux/amd64 -d --name tocry -p 3000:3000 -v ./data:/data ghcr.io/ralsina/tocry:latest

# Force ARM64 on AMD64 ( emulation, slower )
docker run --platform linux/arm64 -d --name tocry -p 3000:3000 -v ./data:/data ghcr.io/ralsina/tocry-arm64:latest
```

## Container Management

### Viewing Logs

```bash
# View container logs
docker logs tocry

# Follow logs in real-time
docker logs -f tocry

# View last 100 lines
docker logs --tail 100 tocry
```

### Container Operations

```bash
# Stop container
docker stop tocry

# Start container
docker start tocry

# Restart container
docker restart tocry

# Remove container
docker rm tocry

# Execute commands inside container
docker exec -it tocry /bin/sh
```

### Updates

```bash
# Pull latest image
docker pull ghcr.io/ralsina/tocry:latest

# Recreate container with new image
docker stop tocry
docker rm tocry
docker run -d --name tocry -p 3000:3000 -v ./data:/data ghcr.io/ralsina/tocry:latest
```

Or with Docker Compose:

```bash
# Pull and recreate
docker compose pull
docker compose up -d
```

## Troubleshooting

### Container Won't Start

```bash
# Check container logs
docker logs tocry

# Check container status
docker ps -a
```

### Permission Issues

```bash
# Fix data directory permissions
sudo chown -R 1000:1000 /path/to/your/data
```

### Port Conflicts

```bash
# Use different external port
docker run -d --name tocry -p 8080:3000 -v ./data:/data ghcr.io/ralsina/tocry:latest
```

### Volume Issues

```bash
# Check volume mounts
docker inspect tocry | grep -A 10 "Mounts"

# Verify data directory
docker exec tocry ls -la /data
```

## Production Considerations

### Resource Limits

```yaml
services:
  tocry:
    image: ghcr.io/ralsina/tocry:latest
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

### Security

- Use read-only filesystem where possible
- Run as non-root user (container runs as user 1000)
- Use specific image tags instead of `latest` in production
- Regularly update to the latest security patches

### Backup Strategy

```bash
# Backup data directory
tar -czf tocry-backup-$(date +%Y%m%d).tar.gz /path/to/your/data

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATA_DIR="/path/to/your/data"
DATE=$(date +%Y%m%d_%H%M%S)

docker run --rm -v $DATA_DIR:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/tocry-$DATE.tar.gz -C /data .
```

## Next Steps

After deploying with Docker:

- [Configure authentication](../configuration/authentication.md)
- [Set up reverse proxy](../deployment/reverse-proxy.md)
- [Enable SSL/TLS](../deployment/security.md)
- [Monitor performance](../deployment/monitoring.md)