// Main entry point for ToCry Reactive UI
// Initialize Alpine.js with our store
/* global Alpine, createToCryStore */
document.addEventListener('alpine:init', () => {
  Alpine.data('toCryApp', () => createToCryStore())
})

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
  if (event.state?.board) {
    // The board name will be handled by Alpine's reactive data
    window.location.reload()
  }
})
