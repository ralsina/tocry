# Quick Start

Get ToCry running in minutes with these simple installation methods.

## Automated Installation Script

The installation script handles everything automatically:

- **Architecture Detection**: Automatically detects AMD64 or ARM64
- **Latest Version**: Downloads the latest stable release
- **System Integration**: Sets up systemd service (for system installs)
- **Clean Uninstall**: Easy removal if needed

### System-wide Installation

```bash
curl -sSL https://tocry.ralsina.me/install.sh | sudo bash
```

**What this does:**
- Downloads the appropriate binary for your system
- Installs to `/usr/local/bin/tocry`
- Creates and enables a systemd service
- Sets up data directory at `/var/lib/tocry`
- Starts the service on port 3000

**After installation:**
- ToCry runs automatically as a service
- Access at `http://localhost:3000`
- Service managed with: `sudo systemctl {start|stop|restart|status} tocry`

### User Installation

```bash
curl -sSL https://tocry.ralsina.me/install.sh | bash
```

**What this does:**
- Downloads the appropriate binary for your system
- Installs to `~/.local/bin/tocry`
- Adds `~/.local/bin` to PATH if needed
- Sets up data directory at `~/.local/share/tocry`
- Creates a user systemd service (if supported)

**After installation:**
- Run manually with: `tocry --port 3000`
- Or use user service: `systemctl --user {start|stop|restart|status} tocry`
- Access at `http://localhost:3000`

## Manual Binary Download

If you prefer manual installation:

1. **Download the binary** for your architecture:
   ```bash
   # AMD64 (Intel/AMD)
   wget https://github.com/ralsina/tocry/releases/latest/download/tocry-linux-amd64 -O tocry

   # ARM64 (Apple Silicon, ARM servers)
   wget https://github.com/ralsina/tocry/releases/latest/download/tocry-linux-arm64 -O tocry
   ```

2. **Make it executable:**
   ```bash
   chmod +x tocry
   ```

3. **Move to system path** (optional):
   ```bash
   sudo mv tocry /usr/local/bin/
   ```

4. **Run ToCry:**
   ```bash
   tocry --port 3000
   ```

## Installation Script Options

The installation script supports several options:

```bash
# Install with custom directory
INSTALL_DIR=$HOME/.local/bin DATA_DIR=$HOME/.local/share/tocry ./install.sh

# Install specific version
VERSION=v1.2.3 ./install.sh

# Uninstall ToCry
./install.sh --uninstall

# Show help
./install.sh --help
```

## Verification

After installation, verify everything is working:

1. **Check if ToCry is running:**
   ```bash
   # For systemd service
   systemctl status tocry

   # Or check if port is in use
   netstat -tlnp | grep :3000
   ```

2. **Test in browser:**
   - Open http://localhost:3000
   - You should see the ToCry interface
   - Try creating a test board

3. **Check logs if needed:**
   ```bash
   # System service logs
   journalctl -u tocry -f

   # User service logs
   journalctl --user -u tocry -f
   ```

## Troubleshooting

### Port Already in Use
```bash
# Use a different port
tocry --port 8080
```

### Permission Denied
```bash
# Make sure binary is executable
chmod +x tocry

# Or use user install instead of system install
curl -sSL https://tocry.ralsina.me/install.sh | bash
```

### Service Won't Start
```bash
# Check service status
sudo systemctl status tocry

# View logs
sudo journalctl -u tocry -n 50
```

## Next Steps

Once ToCry is running:

- [Configure authentication](../configuration/authentication.md)
- [Explore features](../features/README.md)
- [Set up AI integration](../ai-editing/README.md)
- [Learn about configuration options](../configuration/README.md)
