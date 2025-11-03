# Systemd Service

Running ToCry as a systemd service ensures it starts automatically on boot and restarts if it crashes.

## Automatic Service Creation

The installation script automatically creates and enables systemd services when you use the system-wide install:

```bash
curl -sSL https://tocry.ralsina.me/install.sh | sudo bash
```

This creates:
- Service file: `/etc/systemd/system/tocry.service`
- Data directory: `/var/lib/tocry`
- Automatic start on boot
- Restart on failure

## Manual Service Setup

If you prefer to set up the service manually:

### 1. Create Service File

Create `/etc/systemd/system/tocry.service`:

```ini
[Unit]
Description=ToCry Kanban Board
After=network.target

[Service]
Type=simple
User=tocry
Group=tocry
WorkingDirectory=/var/lib/tocry
ExecStart=/usr/local/bin/tocry --port 3000 --data-path /var/lib/tocry
Restart=always
RestartSec=5
SyslogIdentifier=tocry

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/tocry

[Install]
WantedBy=multi-user.target
```

### 2. Create User and Directories

```bash
# Create dedicated user
sudo useradd -r -s /bin/false -d /var/lib/tocry tocry

# Create data directory
sudo mkdir -p /var/lib/tocry
sudo chown tocry:tocry /var/lib/tocry
sudo chmod 750 /var/lib/tocry
```

### 3. Enable and Start Service

```bash
# Reload systemd configuration
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable tocry

# Start service now
sudo systemctl start tocry
```

## Service Management

### Basic Commands

```bash
# Check service status
sudo systemctl status tocry

# Start service
sudo systemctl start tocry

# Stop service
sudo systemctl stop tocry

# Restart service
sudo systemctl restart tocry

# Reload configuration
sudo systemctl reload tocry
```

### Viewing Logs

```bash
# View service logs
sudo journalctl -u tocry

# Follow logs in real-time
sudo journalctl -u tocry -f

# View last 100 lines
sudo journalctl -u tocry -n 100

# View logs since specific time
sudo journalctl -u tocry --since "2024-01-01"
```

## Service Configuration

### Custom Service File

For custom configurations, create an override file:

```bash
# Create override directory
sudo systemctl edit tocry

# This opens an editor for custom configuration
```

Example override content:

```ini
[Service]
# Custom port
ExecStart=
ExecStart=/usr/local/bin/tocry --port 8080 --data-path /var/lib/tocry

# Environment variables
Environment="TOCRY_AUTH_USER=admin"
Environment="TOCRY_AUTH_PASS=password"
Environment="TOCRY_LOG_LEVEL=debug"

# Resource limits
MemoryLimit=512M
CPUQuota=50%
```

### Multiple Service Instances

For multiple ToCry instances on different ports:

```bash
# Copy service file
sudo cp /etc/systemd/system/tocry.service /etc/systemd/system/tocry-8080.service

# Edit the new service file
sudo nano /etc/systemd/system/tocry-8080.service
```

Modify the service file:

```ini
[Unit]
Description=ToCry Kanban Board (Port 8080)

[Service]
ExecStart=/usr/local/bin/tocry --port 8080 --data-path /var/lib/tocry-8080
```

```bash
# Create separate data directory
sudo mkdir -p /var/lib/tocry-8080
sudo chown tocry:tocry /var/lib/tocry-8080

# Enable and start
sudo systemctl enable tocry-8080
sudo systemctl start tocry-8080
```

## User Service

For per-user services (without root):

### 1. Create User Service

```bash
mkdir -p ~/.config/systemd/user
```

Create `~/.config/systemd/user/tocry.service`:

```ini
[Unit]
Description=ToCry Kanban Board

[Service]
Type=simple
ExecStart=/home/user/.local/bin/tocry --port 3000 --data-path /home/user/.local/share/tocry
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
```

### 2. Enable User Service

```bash
# Reload user systemd
systemctl --user daemon-reload

# Enable service (starts on login)
systemctl --user enable tocry

# Start service now
systemctl --user start tocry

# Enable lingering to keep service running after logout
loginctl enable-linger $(whoami)
```

## Troubleshooting

### Service Won't Start

```bash
# Check service status for errors
sudo systemctl status tocry

# View detailed logs
sudo journalctl -u tocry -n 50

# Check if port is already in use
sudo netstat -tlnp | grep :3000
```

### Permission Issues

```bash
# Check file permissions
ls -la /var/lib/tocry

# Fix ownership
sudo chown -R tocry:tocry /var/lib/tocry

# Check binary permissions
ls -la /usr/local/bin/tocry
```

### Performance Issues

Monitor service resource usage:

```bash
# Check memory usage
systemctl status tocry

# Monitor resources
htop -u tocry

# Check file descriptor usage
sudo lsof -u tocry
```

## Security Considerations

### Service Hardening

Enhanced security configuration:

```ini
[Service]
# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictRealtime=true
RestrictSUIDSGID=true
RemoveIPC=true
PrivateDevices=true

# Network restrictions
# RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX

# File system restrictions
ReadWritePaths=/var/lib/tocry
ReadOnlyPaths=/usr/local/bin/tocry
```

### Log Management

Configure log rotation:

```bash
# Create logrotate config
sudo nano /etc/logrotate.d/tocry
```

Content:

```
/var/log/tocry/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}
```

## Integration with Other Services

### Reverse Proxy

When using with Nginx or Apache:

```ini
[Service]
# Ensure service starts after web server
After=nginx.service

# Bind to localhost only
ExecStart=/usr/local/bin/tocry --bind 127.0.0.1 --port 3000
```

### Monitoring

Integrate with monitoring tools:

```ini
[Service]
# Health check endpoint
ExecStartPost=/usr/bin/curl -f http://localhost:3000/api/v1/health
```

## Backup Integration

Add backup script to service:

```bash
# Create backup script
sudo nano /usr/local/bin/tocry-backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backup/tocry"
DATA_DIR="/var/lib/tocry"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"
tar czf "$BACKUP_DIR/tocry-$DATE.tar.gz" -C "$DATA_DIR" .

# Keep last 7 days
find "$BACKUP_DIR" -name "tocry-*.tar.gz" -mtime +7 -delete
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/tocry-backup.sh

# Add to service timer
sudo nano /etc/systemd/system/tocry-backup.timer
```

```ini
[Unit]
Description=Backup ToCry data

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
# Enable backup timer
sudo systemctl enable tocry-backup.timer
sudo systemctl start tocry-backup.timer
```
