# Binary Installation

Manual binary installation gives you full control over the installation process and is useful for systems where the installation script may not work.

## Prerequisites

- Linux system (AMD64 or ARM64)
- Approximately 20MB of disk space
- User with sudo privileges (for system-wide install)

## Download Binary

### Choose Your Architecture

1. **Check your system architecture:**
   ```bash
   uname -m
   ```
   - `x86_64` → Use AMD64 binary
   - `aarch64` or `arm64` → Use ARM64 binary

2. **Download the appropriate binary:**

   **AMD64 (Intel/AMD):**
   ```bash
   wget https://github.com/ralsina/tocry/releases/latest/download/tocry-linux-amd64 -O tocry
   ```

   **ARM64 (Apple Silicon, ARM servers):**
   ```bash
   wget https://github.com/ralsina/tocry/releases/latest/download/tocry-linux-arm64 -O tocry
   ```

### Alternative Download Methods

**Using curl:**
```bash
# AMD64
curl -L https://github.com/ralsina/tocry/releases/latest/download/tocry-linux-amd64 -o tocry

# ARM64
curl -L https://github.com/ralsina/tocry/releases/latest/download/tocry-linux-arm64 -o tocry
```

**Using GitHub CLI:**
```bash
gh release download --pattern "tocry-linux-*" -R ralsina/tocry
```

## Installation

### Option 1: User Installation

Install for your user only (no sudo required):

```bash
# Make executable
chmod +x tocry

# Create user bin directory if it doesn't exist
mkdir -p ~/.local/bin

# Move to user bin directory
mv tocry ~/.local/bin/

# Add to PATH if needed
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**Test installation:**
```bash
tocry --version
tocry --help
```

### Option 2: System-wide Installation

Install for all users (requires sudo):

```bash
# Make executable
chmod +x tocry

# Move to system directory
sudo mv tocry /usr/local/bin/

# Verify installation
tocry --version
```

## Verification

### Check Binary Integrity

Verify the downloaded binary:

```bash
# Check file type
file tocry

# Should show: ELF 64-bit LSB executable, x86-64, version 1 (SYSV), statically linked
```

### Test Basic Functionality

```bash
# Check version
tocry --version

# Show help
tocry --help

# Test run (will exit immediately)
tocry --port 3000 --help
```

## Running ToCry

### Basic Usage

```bash
# Run on default port 3000
tocry

# Run on custom port
tocry --port 8080

# Run with custom data directory
tocry --data-path /path/to/data

# Run in safe mode
tocry --safe-mode
```

### Command Line Options

```
Usage: tocry [options]

Options:
  --port PORT         Port to listen on (default: 3000)
  --bind ADDRESS      Address to bind to (default: 0.0.0.0)
  --data-path PATH    Data directory path (default: ./data)
  --safe-mode         Run in safe mode with restricted features
  --generations       Enable note versioning feature
  --help              Show this help message
  --version           Show version information
```

## Post-Installation Setup

### Create Data Directory

```bash
# Create data directory
mkdir -p /path/to/tocry/data

# Set permissions (if running as service)
chmod 750 /path/to/tocry/data
```

### Environment Configuration

Set environment variables for configuration:

```bash
# Temporary (current session)
export TOCRY_AUTH_USER=admin
export TOCRY_AUTH_PASS=password
export TOCRY_LOG_LEVEL=info

# Permanent (add to shell profile)
echo 'export TOCRY_AUTH_USER=admin' >> ~/.bashrc
echo 'export TOCRY_AUTH_PASS=password' >> ~/.bashrc
```

## Manual Service Setup

### Create systemd Service

1. **Create service file:**
   ```bash
   sudo nano /etc/systemd/system/tocry.service
   ```

2. **Add service configuration:**
   ```ini
   [Unit]
   Description=ToCry Kanban Board
   After=network.target

   [Service]
   Type=simple
   ExecStart=/usr/local/bin/tocry --port 3000 --data-path /var/lib/tocry
   Restart=always
   User=tocry
   Group=tocry

   [Install]
   WantedBy=multi-user.target
   ```

3. **Create user and directories:**
   ```bash
   sudo useradd -r -s /bin/false tocry
   sudo mkdir -p /var/lib/tocry
   sudo chown tocry:tocry /var/lib/tocry
   ```

4. **Enable and start service:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable tocry
   sudo systemctl start tocry
   ```

## Updates

### Manual Update Process

1. **Stop ToCry (if running as service):**
   ```bash
   sudo systemctl stop tocry
   ```

2. **Backup current data:**
   ```bash
   sudo cp -r /var/lib/tocry /var/lib/tocry.backup
   ```

3. **Download new version:**
   ```bash
   wget https://github.com/ralsina/tocry/releases/latest/download/tocry-linux-amd64 -O tocry-new
   ```

4. **Replace binary:**
   ```bash
   chmod +x tocry-new
   sudo mv tocry-new /usr/local/bin/tocry
   ```

5. **Restart service:**
   ```bash
   sudo systemctl start tocry
   ```

### Automated Update Script

Create an update script:

```bash
#!/bin/bash
# update-tocry.sh

set -e

VERSION=$(curl -s https://api.github.com/repos/ralsina/tocry/releases/latest | grep tag_name | cut -d '"' -f 4)
ARCH=$(uname -m)

case $ARCH in
    x86_64)
        BINARY="tocry-linux-amd64"
        ;;
    aarch64|arm64)
        BINARY="tocry-linux-arm64"
        ;;
    *)
        echo "Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

echo "Updating ToCry to $VERSION..."

# Stop service
sudo systemctl stop tocry || true

# Backup data
sudo cp -r /var/lib/tocry /var/lib/tocry.backup.$(date +%Y%m%d_%H%M%S)

# Download new binary
wget "https://github.com/ralsina/tocry/releases/download/$VERSION/$BINARY" -O tocry-new
chmod +x tocry-new

# Replace binary
sudo mv tocry-new /usr/local/bin/tocry

# Start service
sudo systemctl start tocry

echo "Update complete!"
```

## Troubleshooting

### Permission Denied

```bash
# Make sure binary is executable
chmod +x tocry

# Check directory permissions
ls -la /usr/local/bin/tocry
```

### Command Not Found

```bash
# Check if binary is in PATH
which tocry

# Add to PATH if needed
export PATH="/usr/local/bin:$PATH"
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.bashrc
```

### Binary Won't Run

```bash
# Check binary architecture
file tocry

# Check if dynamically linked (should be static)
ldd tocry

# Should show: "not a dynamic executable" for static binary
```

### Port Already in Use

```bash
# Check what's using port 3000
sudo netstat -tlnp | grep :3000

# Use different port
tocry --port 8080
```

## Uninstallation

### Remove User Installation

```bash
# Remove binary
rm ~/.local/bin/tocry

# Remove data directory (optional)
rm -rf ~/.local/share/tocry
```

### Remove System Installation

```bash
# Stop and disable service
sudo systemctl stop tocry
sudo systemctl disable tocry

# Remove service file
sudo rm /etc/systemd/system/tocry.service
sudo systemctl daemon-reload

# Remove binary
sudo rm /usr/local/bin/tocry

# Remove data directory (optional)
sudo rm -rf /var/lib/tocry

# Remove user (optional)
sudo userdel tocry
```

## Next Steps

After manual installation:

- [Configure authentication](../configuration/authentication.md)
- [Set up reverse proxy](../deployment/reverse-proxy.md)
- [Enable SSL/TLS](../deployment/security.md)
- [Create systemd service](systemd.md)
