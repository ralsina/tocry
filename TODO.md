# TODO - Reactive UI Branch

## High Priority

- [ ] Fix ToastUI Editor not loading in edit modal
  - Script is being loaded but editor is not initializing
  - Check if there are loading order issues
  - Verify global object availability
  - Consider alternative editor solutions if ToastUI continues to fail
- [ ] Fix ToastUI Editor text visibility issue
  - Text in left-side editor pane is invisible (black on black)
  - Need to adjust CSS for proper contrast in dark mode
  - Ensure text is visible in both light and dark themes
- [ ] Move CSS from template to separate file
  - Currently CSS is inline in the ECR template
  - Should be in a separate CSS file for better organization
  - Make CSS easier to maintain and update

## Medium Priority

- [ ] Improve note card design to match legacy UI richness
  - [x] Add proper styling for tags
  - [x] Add visual indicators for priority
  - [x] Show start/end dates when note is expanded
  - [x] Add expand/collapse functionality
  - [x] Display file attachments
  - [ ] Show word count or character count
  - [ ] Add hover effects and better visual feedback

- [ ] Restore board header functionality from legacy UI
  - [ ] Add board rename functionality
  - [ ] Add board delete functionality
  - [ ] Add color scheme selector
  - [ ] Add board sharing features
  - [ ] Add board statistics (note count, etc.)
  - [ ] Add last updated timestamp

- [ ] Implement search functionality
  - [ ] Add search input in header
  - [ ] Search across note titles and content
  - [ ] Search by tags
  - [ ] Filter by priority
  - [ ] Filter by date range
  - [ ] Highlight search results
  - [ ] Save search queries

- [ ] Add guided onboarding experience for new users
  - [ ] Show helpful prompts when no boards exist
  - [ ] Guide users to create their first board
  - [ ] Show lane creation tips on empty boards
  - [ ] Show note creation tips on empty lanes
  - [ ] Add tooltips for UI elements
  - [ ] Create a quick start guide or tutorial modal
  - [ ] Track and hide tips once user is familiar with the app

- [ ] Replace browser alerts and prompts with custom modal dialogs
  - [ ] Create custom modal component for confirmations
  - [ ] Create custom modal for text input (board/lane creation)
  - [ ] Create custom modal for note editing with better layout
  - [ ] Add proper form validation with inline error messages
  - [ ] Implement accessible keyboard navigation in modals
  - [ ] Add consistent styling for all modals

- [ ] Evaluate HTMX integration for selective loading
  - [ ] Research benefits of HTMX vs full SPA approach
  - [ ] Consider using HTMX for note cards and dialogs
  - [ ] Keep Alpine.js for reactive components where needed
  - [ ] Reduce initial page load size
  - [ ] Improve SEO and accessibility
  - [ ] Maintain progressive enhancement approach

- [x] Implement lane reordering via drag and drop
  - [x] Add drag handles to lane headers
  - [x] Implement lane drag and drop functionality
  - [x] Update lane positions in backend
  - [x] Add visual feedback during dragging
  - [x] Persist lane order after page refresh

- [ ] Improve horizontal lane scrolling experience
  - [ ] Add navigation buttons for horizontal scrolling
  - [ ] Implement auto-scroll when dragging notes near edges
  - [ ] Hide scrollbars while maintaining scroll functionality
  - [ ] Add smooth scrolling animations
  - [ ] Support touch gestures for mobile devices
  - [ ] Add lane overflow indicators

- [ ] Implement touch/mobile support for note dragging
  - [ ] Add touch event handlers for drag and drop
  - [ ] Implement long-press to initiate drag on mobile
  - [ ] Add visual feedback during touch dragging
  - [ ] Handle touch events properly to prevent conflicts with scrolling
  - [ ] Test on various mobile devices and screen sizes
  - [ ] Consider using a touch-friendly drag and drop library

- [ ] Add note expand/collapse functionality
  - [ ] Add click handler to toggle note expansion
  - [ ] Show full content when expanded
  - [ ] Show dates (start/end) when expanded
  - [ ] Animate expand/collapse transitions
  - [ ] Persist expanded state in backend
  - [ ] Show different UI for expanded vs collapsed state

- [ ] Test and verify all core functionality works
  - [ ] Board creation and switching
  - [ ] Lane creation and deletion
  - [ ] Note creation, editing, and deletion
  - [ ] Drag and drop between lanes
  - [ ] Drag and drop reordering within lanes
  - [ ] Tag functionality
  - [ ] Priority levels
  - [ ] Date fields

- [ ] Verify the reactive UI is properly served as default
  - [ ] Test that no `?ui=legacy` parameter is needed
  - [ ] Test legacy UI still works with `?ui=legacy`

## Low Priority

- [ ] Improve error handling and user feedback
- [ ] Add loading states for async operations
- [ ] Consider adding animations for UI transitions
- [ ] Test with mobile devices and responsive design

## Notes

- Server is running on localhost:3000 with test data
- Use `shards run -- --data-path=test-data` to start the server
- The reactive UI should be the default without any parameters
