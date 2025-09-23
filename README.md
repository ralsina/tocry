# ToCry

`tocry` is a simple, self-hosted Kanban-style TODO application. It's designed
to be a straightforward tool for managing tasks across different stages or
categories. The name comes from the eternal question every developer faces
when looking at their task list: "Are you going ToDo or ToCry?"

![image](https://github.com/user-attachments/assets/abaa6209-b457-4332-b039-c9dd240300f2)

## Features

* **Kanban Board:** Organize notes into customizable lanes.
* **Drag & Drop:** Easily move notes between lanes and reorder lanes themselves
* **Rich Text Notes:** Write notes in Markdown, with a comfortable WYSIWYG editor
* **Priority Labels:** Set High, Medium, or Low priority on tasks with visual indicators
* **Date Support:** Add start and end dates to tasks, only shown when expanded
* **File Attachments:** Upload and attach files to notes with drag & drop support
* **Inline Editing:** Quickly rename lanes by clicking on their titles
* **Live Search:** Instantly filter all notes by title, content, or tags
* **Collapsible Notes:** Collapse notes with content to keep your board tidy
* **Light & Dark Modes:** Switch between themes for your viewing comfort
* **Responsive UI:** A clean interface that works on different screen sizes
* **Image Uploading:** Just paste an image and it's uploaded and linked
* **Color Schemes:** Choose between 20 color schemes
* **Easy Installation:** One-line install script with system-wide and user options

## Quick Install (Recommended)

The easiest way to install ToCry is using the automated installation script:

```bash
curl -sSL https://tocry.ralsina.me/install.sh | sudo bash
```

This will:
- Automatically detect your system architecture (AMD64/ARM64)
- Download the latest binary
- Install system-wide or in your user directory
- Set up data directories and systemd service (if run as root)

For more options, see the [Installation Script Documentation](#installation-script-options).

## Installation From Source

This project is built with the Crystal programming language.

1. Clone the repository:

    ```sh
    git clone https://github.com/ralsina/tocry.git
    cd tocry
    ```

2. Install Crystal dependencies:

    ```sh
    shards install
    ```

3. Build the application for production:

    ```sh
    shards build --release
    ```

4. Run the server:

    ```sh
    ./bin/tocry
    ```

5. Open your browser and navigate to `http://localhost:3000`.

### Authentication

`tocry` supports three authentication modes, determined by environment variables set when the application starts. The modes are prioritized in the following order: Google OAuth, Basic Authentication, and then No Authentication.

1. **Google OAuth (if you want multiple users)**
   * **Description**: Users authenticate using their Google account. This mode provides a secure and user-friendly login experience.
   * **How to Enable**: Set the `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables.
     * You'll need to create an OAuth 2.0 Client ID in the Google Cloud Console.
     * Ensure your "Authorized redirect URI" is set to `http://localhost:3000/auth/google/callback` (adjust host/port if running on a different address).
   * **Example**:

     ```bash
     export GOOGLE_CLIENT_ID="your_client_id"
     export GOOGLE_CLIENT_SECRET="your_client_secret"
     crystal run src/main.cr
     ```

2. **Basic Authentication (If you just want a password)**
   * **Description**: A simple username/password prompt is presented by the browser. All users share the same credentials. This mode is suitable for private deployments where Google OAuth is not desired.
   * **How to Enable**: Set the `TOCRY_AUTH_USER` and `TOCRY_AUTH_PASS` environment variables. This mode will be used if Google OAuth variables are not set.
   * **Example**:

     ```bash
        export TOCRY_AUTH_USER="admin"
        export TOCRY_AUTH_PASS="your_secure_password"
        crystal run src/main.cr
     ```

3. **No Authentication (Default, if it's just for you and it's not exposed)**
   * **Description**: No login is required. Anyone can access the application. This is the default mode if neither Google OAuth nor Basic Authentication environment variables are set.
   * **How to Enable**: Do not set any of the authentication-related environment variables (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TOCRY_AUTH_USER`, `TOCRY_AUTH_PASS`).
   * **Example**:

     ```bash
     crystal run src/main.cr
     ```

## Running with Docker

As an alternative to building from source, you can run `tocry` using a Docker container.
Remember to set environment variables for authentication as needed, using the `-e` flag
in the `docker run` command.

1. **Create a data directory:**
    Create a directory on your host machine to store `tocry`'s data. This is essential
   to ensure your data persists if the container is removed or updated.

    ```sh
    mkdir -p /path/to/your/data
    ```

2. **Run the container:**
    Run the container, making sure to replace `/path/to/your/data` with the absolute
   path to the directory you just created.

    ```sh
    docker run -d --restart unless-stopped --name tocry -p 3000:3000 \
        -v /path/to/your/data:/data ghcr.io/ralsina/tocry:latest
    ```

   * `-d`: Runs the container in the background.
   * `--restart unless-stopped`: Ensures the container restarts automatically.
   * `--name tocry`: Gives the container a memorable name.
   * `-p 3000:3000`: Maps port 3000 on your machine to port 3000 in the container.
   * `-v /path/to/your/data:/data`: Mounts your local data directory into the
      container. **This is crucial for data persistence.**

> **Note:** The image `ghcr.io/ralsina/tocry:latest` is for `amd64` architectures.
> An `arm64` image is also available at `ghcr.io/ralsina/tocry-arm64:latest`.

1. Open your browser and navigate to `http://localhost:3000`.

### Using Docker Compose

For an even simpler setup, you can use Docker Compose. Remember to set environment variables for authentication as needed, using the `environment` section in the `docker-compose.yml` file.

1. Create a `docker-compose.yml` file in your project directory with the following
   content (or use the one included in this repository):

    ```yaml
    version: '3.8'

    services:
      tocry:
        image: ghcr.io/ralsina/tocry:latest
        # For arm64 architectures, use the following image instead:
        # image: ghcr.io/ralsina/tocry-arm64:latest
        container_name: tocry
        restart: unless-stopped
        ports:
          - "3000:3000"
        volumes:
          - ./data:/data
    ```

2. Run the application from the same directory as your compose file:

    ```sh
    docker compose up -d
    ```

   This will automatically create a `data` directory in the current
   folder to store persistent data.

## Usage

Once the application is running, you can manage your tasks through the web interface:

* **Add a Lane:** Click the `+` button in the header to create a new column
* **Rename a Lane:** Click directly on a lane's title, type the new name,
  and press `Enter` or click away to save
* **Add a Note:** Click the `+` button in a lane's header
* **Edit a Note:** Double-click on a note card to open the full editor
* **Move Items:** Click and drag lanes or notes to reorder them
* **Search:** Use the search bar in the header to filter all visible notes
* **Switch Theme:** Use the 🌙/☀️ button to toggle between light and dark modes

## Development

To run the application in development mode:

1. Follow steps 1 and 2 from the Installation section.
2. Run the development server:

    ```sh
    crystal run src/tocry.cr
    ```

The server will start on `http://localhost:3000`.

## Contributing

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create a new Pull Request

## Installation Script Options

The installation script provides several options for customizing your installation:

### Basic Usage
```bash
# Install with default settings (system-wide)
curl -sSL https://tocry.ralsina.me/install.sh | sudo bash

# Install for current user only (no sudo needed)
curl -sSL https://tocry.ralsina.me/install.sh | bash

# Show help
curl -sSL https://tocry.ralsina.me/install.sh | bash -s -- --help
```

### Custom Installation Directories
```bash
# Install to custom location
INSTALL_DIR=$HOME/.local/bin curl -sSL https://tocry.ralsina.me/install.sh | bash

# Use custom data directory
DATA_DIR=$HOME/.local/share/tocry curl -sSL https://tocry.ralsina.me/install.sh | bash

# Combine both
INSTALL_DIR=$HOME/.local/bin DATA_DIR=$HOME/.local/share/tocry curl -sSL https://tocry.ralsina.me/install.sh | bash
```

### Uninstall
```bash
# Uninstall ToCry
curl -sSL https://tocry.ralsina.me/install.sh | bash -s -- --uninstall
```

### Environment Variables
- `INSTALL_DIR`: Installation directory (default: `/usr/local/bin`)
- `DATA_DIR`: Data directory (default: `/opt/tocry`)
- `SERVICE_USER`: System service user (default: `tocry`)

## Contributors

* [Roberto Alsina](https://github.com/ralsina) - creator and maintainer
