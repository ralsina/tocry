# ToCry

`tocry` is a simple, self-hosted Kanban-style TODO application. It's designed
to be a straightforward tool for managing tasks across different stages or
categories. The name comes from the eternal question every developer faces
when looking at their task list: "Are you going ToDo or ToCry?"

## Features

* **Kanban Board:** Organize notes into customizable lanes.
* **Drag & Drop:** Easily move notes between lanes and reorder lanes themselves
* **Rich Text Notes:** Write notes in Markdown, with a comfortable WYSIWYG editor
* **Inline Editing:** Quickly rename lanes by clicking on their titles
* **Live Search:** Instantly filter all notes by title, content, or tags
* **Collapsible Notes:** Collapse notes with content to keep your board tidy
* **Light & Dark Modes:** Switch between themes for your viewing comfort
* **Responsive UI:** A clean interface that works on different screen sizes

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

## Running with Docker

As an alternative to building from source, you can run `tocry` using a Docker container.

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

For an even simpler setup, you can use Docker Compose.

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

3. Run the application from the same directory as your compose file:

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

## Contributors

* [Roberto Alsina](https://github.com/ralsina) - creator and maintainer
