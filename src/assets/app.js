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

// Keyboard shortcuts
document.addEventListener('keydown', (event) => {
  // Ctrl/Cmd + K to focus board selector
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault()
    const selector = document.querySelector('select[x-model="currentBoardName"]')
    if (selector) {
      selector.focus()
    }
  }

  // Escape to close modals
  if (event.key === 'Escape') {
    const store = Alpine.$data(document.querySelector('[x-data="toCryApp"]'))
    if (store) {
      if (store.editingNote) {
        store.cancelEditNote()
      }
      if (store.showAddLane) {
        store.showAddLane = false
        store.newLaneName = ''
      }
    }
  }
})
