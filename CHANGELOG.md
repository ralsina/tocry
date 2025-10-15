# Changelog

All notable changes to this project will be documented in this file.

## [0.18.0] - 2025-10-14

### 🚀 Features

- Implement new reactive UI with Alpine.js and enhanced UX
- Implement hidden lanes functionality with visual separator
- Gzip+minify+source maps for assets
- Add public board sharing feature and remove minification
- Implement polished board sharing controls

### 🐛 Bug Fixes

- UI tweaks and refinements
- Lowercase color scheme on board loading
- Correct 'set -e' in do_release.sh to enable error exit mode

### 🚜 Refactor

- Implement OpenAPI based API with client generation
- Consolidate validation and reduce code duplication
- *(frontend)* Consolidate validation and reduce code duplication

## [0.17.0] - 2025-09-28

### 🚀 Features

- Implement periodic demo data reset and update warnings

### 🐛 Bug Fixes

- Implement optimistic UI updates for drag-and-drop to eliminate visual delay

### 💼 Other

- Release v0.17.0

### 📚 Documentation

- Add demo instance information to README and website

### 🎨 Styling

- Fix linting issues and update ameba configuration

## [0.16.1] - 2025-09-27

### 🐛 Bug Fixes

- Add migration to fix single-user mode board visibility

### 💼 Other

- Release v0.16.1

## [0.16.0] - 2025-09-27

### 🚀 Features

- Make BoardReference and BoardIndex compatible with in-memory storage
- Add comprehensive demo mode with in-memory storage

## [0.15.0] - 2025-09-26

### 🚀 Features

- Auto-detect user data directory for non-root users
- *(sepia)* Migrate board color schemes to Sepia persistence
- *(sepia)* Migrate User class to Sepia persistence
- *(sepia)* Migrate upload management to Sepia persistence
- *(sepia)* Migrate BoardManager to Sepia with BoardReference system
- Consolidate Sepia migrations into v0.15.0 and revert version

### 🐛 Bug Fixes

- Make install script work for non-root users
- *(test)* Disable safe mode to resolve integration test failures
- *(user)* Resolve provider field inconsistencies
- BoardManager API endpoint after Sepia migration

### 💼 Other

- Release v0.15.0

### 🚜 Refactor

- Remove legacy symlink-related dead code

### 📚 Documentation

- *(migration)* Update v0_16_0 comments to reflect provider consistency fix

## [0.14.0] - 2025-09-24

### 🚀 Features

- Add start and end dates to notes
- Implement priority labels with enum and side tab styling
- Only show note dates when notes are expanded
- Add attachment deletion for expanded notes and improve UI
- Add immediate public toggle functionality in note editor
- Implement random color assignment for new boards
- Add styled toast notifications with animations
- Implement comprehensive mobile support improvements

### 🐛 Bug Fixes

- Correct note priority default in editor
- Ensure date picker works in note editor modal
- Ensure board color persistence on page reload
- Make color selection for boards persistent

### 💼 Other

- Create /tmp in docker image for uploads (Fix #5)
- Release v0.13.0

### 📚 Documentation

- Updated screenshot
- General improvements and fixes
- Update documentation with mobile support features

## [0.12.0] - 2025-07-02

### 🚀 Features

- Note attachments
- Animated lane add/remove

### 🐛 Bug Fixes

- / shortcut for search

### 💼 Other

- Release v0.12.0

### 🚜 Refactor

- Remove unused apiErrorHandler.js
- Split note.js
- Major simplification of code
- Css simplification

### 🎨 Styling

- Improvements in notifications and dialogs
- Title animation
- Animated dialogs

## [0.11.0] - 2025-07-01

### 🚀 Features

- Support for public notes

### 💼 Other

- Release v0.11.0

## [0.10.0] - 2025-07-01

### 🚀 Features

- Board sharing between users in multi user mode

### 💼 Other

- Release v0.10.0

## [0.9.0] - 2025-06-29

### 🚀 Features

- Migrate to Sepia and fix data loading bugs

### 🐛 Bug Fixes

- Board renaming

### 💼 Other

- Release v0.9.0

### 🚜 Refactor

- Improve backend code quality and idempotency

### 🧪 Testing

- Run tests with simple auth too
- Integration tests for google auth mode
- Implement fake Google Auth for integration tests

## [0.8.0] - 2025-06-26

### 🚀 Features

- Nice board creation/selection/exposing UX
- Make BoardManager user-aware
- Drop images into a lane to get a new note

### 🐛 Bug Fixes

- Improved board storage strategy, boards are now UUID-stored
- Create user's home on demand
- Broken root user boards symlink
- Auth-protect /
- More robust 403 and 404 handling
- Simpler 400 on auth issues
- Use the email as user_id instead of a random string
- Prevent crash when dropping files outside a valid note area

### 💼 Other

- Release v0.8.0

### 🚜 Refactor

- Better error handling
- Use constants
- No more default board name in frontend
- Centralized UI error handling
- Split off lane pasting

### 🎨 Styling

- Better 403 page

### 🧪 Testing

- More integration tests
- Integration tests for dragging and dropping images

## [0.7.0] - 2025-06-24

### 🚀 Features

- Help user onboarding

### 🐛 Bug Fixes

- Show errors above the editor modal
- Page reloading using actual templates
- The --data-path option was buggy
- Add integration tests
- Lane serialization bug
- Handle clean startup better
- Color selector was broken

### 💼 Other

- Release v0.7.0

### 🚜 Refactor

- Use BoardManager everywhere in backend
- Split huge app.js into many smaller files
- Separate concerns about disk locations
- Split endpoints.cr and tocry.cr

### 🧪 Testing

- Dummy test code

## [0.6.2] - 2025-06-24

### 🐛 Bug Fixes

- Important fixes that made this only work in my machine, sorry, I am anxious

### 💼 Other

- Release v0.6.2

## [0.6.1] - 2025-06-23

### 🐛 Bug Fixes

- Misc fixes

### 💼 Other

- Make binaries smaller
- Release v0.6.1

### 🎨 Styling

- Fix logout button spacing

## [0.6.0] - 2025-06-23

### 🚀 Features

- Implemented data migration framework and did groundwork for multiboard
- MultiBoard support
- Authentication rewrite (supporting: noauth / basic / SSO via Google)

### 🐛 Bug Fixes

- Misc fixes

### 💼 Other

- Release v0.6.0

## [0.5.0] - 2025-06-22

### 🚀 Features

- Make note expanded/collapsed state persistent
- More optimistic updates for better UX

### 🐛 Bug Fixes

- Better lane widths
- Use title to show truncated titles
- Collapsed notes were not FULLY collapsed
- Lane drag/drop
- Better note updates when adding/removing content

### 🚜 Refactor

- Removed redundant styles
- Element creation
- Move all cSS colors to a separate file of variables
- More color extraction

### 🎨 Styling

- New note implementation using divs
- Nicer note headings
- Nicer looking note dragging
- Hide footer after 10 seconds
- 20 color schemes
- Replace alert() and confirm() with modern things
- Replace prompts with nicer things
- Make things more consistent
- Color swatch
- Nicer color chooser

## [0.4.0] - 2025-06-22

### 🚀 Features

- Create notes by pasting
- Create notes by pasting images

### 🐛 Bug Fixes

- Nicer looking cards
- Make search match titles again

### 💼 Other

- Release v0.4.0

### 🚜 Refactor

- Better event listener passing around

## [0.3.0] - 2025-06-22

### 🚀 Features

- Switch to ToasterUI editor, support syntax highlighting
- Upload or paste images into the editor.
- Editable note titles

### 💼 Other

- Fix typo
- Release v0.3.0

### 🎨 Styling

- Handle long titles better

## [0.1.1] - 2025-06-21

### 🐛 Bug Fixes

- Use left/right to scroll lanes

### 💼 Other

- Release v0.1.1

## [0.1.0] - 2025-06-21

### 🐛 Bug Fixes

- Bump version of baked_file_handler

<!-- generated by git-cliff -->
