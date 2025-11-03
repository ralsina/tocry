# Installation Guide

ToCry offers multiple installation methods to suit different needs and environments. Choose the one that works best for you.

## Quick Start Options

### 🚀 Automated Installation (Recommended)

The easiest way to get `tocry` running is with our automated installation script. This will automatically detect your system architecture and install the latest binary.

```bash
curl -sSL https://tocry.ralsina.me/install.sh | sudo bash
```

*Installs to `/usr/local/bin` with systemd service. Requires sudo privileges.*

For current user only (no sudo):

```bash
curl -sSL https://tocry.ralsina.me/install.sh | bash
```

### 🐳 Docker Installation

Docker provides a containerized installation that works across different systems without requiring Crystal or build dependencies.

```bash
docker run -d --restart unless-stopped --name tocry -p 3000:3000 -v /path/to/data:/data ghcr.io/ralsina/tocry:latest
```

*Replace `/path/to/data` with your preferred data directory.*

## Installation Methods

- **[Quick Start](quick-start.md)** - Automated installation scripts
- **[Docker Installation](docker.md)** - Container-based deployment
- **[Systemd Service](systemd.md)** - System service configuration
- **[Binary Installation](binary.md)** - Manual binary installation

## Verification

After installation, verify ToCry is running correctly:

1. Open your web browser
2. Navigate to `http://localhost:3000`
3. You should see the ToCry interface ready to use

## Next Steps

Once installed, check out these guides:

- [Features Overview](../features/README.md) - Learn about ToCry's capabilities
- [Configuration Guide](../configuration/README.md) - Customize your setup
- [Authentication](../configuration/authentication.md) - Set up user authentication
