# About ToCry

ToCry is a Kanban-style TODO application built in Crystal using the Kemal web framework. It's designed as a single-binary, self-hosted application with file-based persistence.

## Architecture

### Core Design

- **Multi-board System**: Users can have multiple Kanban boards, each containing lanes and notes
- **File-based Storage**: Uses JSON files for persistence (no database required)
- **User Isolation**: Each user gets their own data directory for multi-tenant support
- **Static Asset Bundling**: All CSS, JS, and assets are compiled into the binary

### Technology Stack

- **Backend**: Crystal programming language with Kemal web framework
- **Frontend**: Vanilla JavaScript with Pico.css for styling
- **Storage**: JSON files with UUID-based naming
- **Authentication**: Multiple modes (Google OAuth, Basic Auth, or None)

## Project Goals

ToCry aims to provide:

1. **Simplicity**: Easy to install and maintain, zero external dependencies
2. **Performance**: Lightweight and fast, minimal resource usage
3. **Privacy**: Self-hosted with full control over your data
4. **Flexibility**: Customizable appearance and multiple authentication options
5. **Accessibility**: Mobile-friendly interface with touch support

## Open Source

ToCry is free and open source software licensed under the MIT License. Contributions are welcome!

- **Source Code**: [github.com/ralsina/tocry](https://github.com/ralsina/tocry)
- **Issues & Feature Requests**: Use the GitHub issue tracker
- **Community**: Join our discussions and contribute to development

## Name Origin

"ToCry" is a play on words - when you have too many tasks, are you going to get them **ToDo** or will you end up **ToCry**? It captures the feeling of being overwhelmed by tasks while providing the tools to stay organized and productive.
