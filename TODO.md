# TODO - Reactive UI Branch

## High Priority

- [ ] Move CSS from template to separate file
  - Currently CSS is inline in the ECR template
  - Should be in a separate CSS file for better organization
  - Make CSS easier to maintain and update

## Medium Priority

- [x] Improve note card design to match legacy UI richness
  - [x] Add proper styling for tags
  - [x] Add visual indicators for priority
  - [x] Show start/end dates when note is expanded
  - [x] Add expand/collapse functionality
  - [x] Display file attachments
  - [x] Show word count or character count
  - [x] Add hover effects and better visual feedback

- [x] Restore board header functionality from legacy UI
  - [x] Add board rename functionality
  - [x] Add board delete functionality
  - [x] Add color scheme selector
  - [x] Add board sharing features
  - [x] Add board statistics (note count, etc.)
  - [x] Add last updated timestamp

- [x] Implement search functionality
  - [x] Add search input in header
  - [x] Search across note titles and content
  - [x] Search by tags
  - [x] Filter by priority
  - [x] Filter by date range
  - [x] Highlight search results
  - [x] Save search queries

- [x] Add guided onboarding experience for new users
  - [x] Show helpful prompts when no boards exist
  - [x] Guide users to create their first board
  - [x] Show lane creation tips on empty boards
  - [x] Show note creation tips on empty lanes
  - [x] Add tooltips for UI elements
  - [x] Create a quick start guide or tutorial modal
  - [x] Track and hide tips once user is familiar with the app

- [x] Replace browser alerts and prompts with custom modal dialogs
  - [x] Create custom modal component for confirmations
  - [x] Create custom modal for text input (board/lane creation)
  - [x] Create custom modal for note editing with better layout
  - [x] Add proper form validation with inline error messages
  - [x] Implement accessible keyboard navigation in modals
  - [x] Add consistent styling for all modals


- [x] Implement lane reordering via drag and drop
  - [x] Add drag handles to lane headers
  - [x] Implement lane drag and drop functionality
  - [x] Update lane positions in backend
  - [x] Add visual feedback during dragging
  - [x] Persist lane order after page refresh

- [x] Improve horizontal lane scrolling experience
  - [x] Add navigation buttons for horizontal scrolling
  - [x] Implement auto-scroll when dragging notes near edges
  - [x] Hide scrollbars while maintaining scroll functionality
  - [x] Add smooth scrolling animations
  - [x] Support touch gestures for mobile devices
  - [x] Add lane overflow indicators

- [ ] Implement touch/mobile support for note dragging
  - [ ] Add touch event handlers for drag and drop
  - [ ] Implement long-press to initiate drag on mobile
  - [ ] Add visual feedback during touch dragging
  - [ ] Handle touch events properly to prevent conflicts with scrolling
  - [ ] Test on various mobile devices and screen sizes
  - [ ] Consider using a touch-friendly drag and drop library

- [x] Add note expand/collapse functionality
  - [x] Add click handler to toggle note expansion
  - [x] Show full content when expanded
  - [x] Show dates (start/end) when expanded
  - [x] Animate expand/collapse transitions
  - [x] Persist expanded state in backend
  - [x] Show different UI for expanded vs collapsed state

- [x] Test and verify all core functionality works
  - [x] Board creation and switching
  - [x] Lane creation and deletion
  - [x] Note creation, editing, and deletion
  - [x] Drag and drop between lanes
  - [x] Drag and drop reordering within lanes
  - [x] Tag functionality
  - [x] Priority levels
  - [x] Date fields

- [x] Verify the reactive UI is properly served as default
  - [x] Test that no `?ui=legacy` parameter is needed
  - [x] Test legacy UI still works with `?ui=legacy`


## Notes

- Server is running on localhost:3000 with test data
- Use `shards run -- --data-path=test-data` to start the server
- The reactive UI should be the default without any parameters
