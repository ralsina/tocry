# tocry

`tocry` is a simple, self-hosted Kanban-style TODO application. It's designed to be a straightforward tool for managing tasks across different stages or categories. The name comes from the eternal question every developer faces when looking at their task list: "Are you going ToDo or ToCry?"

## Features

* **Kanban Board:** Organize notes into customizable lanes.
* **Drag & Drop:** Easily move notes between lanes and reorder lanes themselves
* **Rich Text Notes:** Write notes in Markdown, with a comfortable WYSIWYG editor
* **Inline Editing:** Quickly rename lanes by clicking on their titles
* **Live Search:** Instantly filter all notes by title, content, or tags
* **Collapsible Notes:** Collapse notes with content to keep your board tidy
* **Light & Dark Modes:** Switch between themes for your viewing comfort
* **Responsive UI:** A clean interface that works on different screen sizes

## Installation

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

## Usage

Once the application is running, you can manage your tasks through the web interface:

* **Add a Lane:** Click the `+` button in the header to create a new column
* **Rename a Lane:** Click directly on a lane's title, type the new name, and press `Enter` or click away to save
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
