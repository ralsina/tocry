# Installation

The easiest way to get `tocry` running is with our automated installation script. This will automatically detect your system architecture and install the latest binary.

## Quick Install

### 🚀 System-wide Install

```bash
curl -sSL https://tocry.ralsina.me/install.sh | sudo bash
```

*Installs to `/usr/local/bin` with systemd service. Requires sudo privileges.*

### 👤 User Install

```bash
curl -sSL https://tocry.ralsina.me/install.sh | bash
```

*Installs to `~/.local/bin` for current user only. No sudo required.*

## Run with Docker

Alternatively, you can run `tocry` with Docker. This avoids having to install Crystal or build from source.

### Using Docker Run

1. Create a directory on your host machine to store persistent data:
   ```bash
   mkdir -p /path/to/your/data
   ```

2. Run the container, replacing `/path/to/your/data` with the absolute path to the directory you just created:
   ```bash
   docker run -d --restart unless-stopped --name tocry -p 3000:3000 -v /path/to/your/data:/data ghcr.io/ralsina/tocry:latest
   ```

   *Note: The image above is for amd64 architectures. An arm64 image is also available at `ghcr.io/ralsina/tocry-arm64:latest`.*

3. Open your browser and navigate to `http://localhost:3000`.

### Using Docker Compose

For an even simpler setup, you can use Docker Compose.

1. Create a `docker-compose.yml` file with the following content:
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

2. Run the application from the same directory as your compose file:
   ```bash
   docker compose up -d
   ```

   *This will automatically create a `data` directory in the current folder to store persistent data.*