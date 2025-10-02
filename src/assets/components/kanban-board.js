/* global Alpine, confirm */
// Alpine.js component for the Kanban board
document.addEventListener('alpine:init', () => {
  Alpine.data('kanbanBoard', () => ({
    // Local component state
    draggingNote: null,
    draggingLane: null,

    // Initialize component
    init () {
      // Set up drag and drop
      this.setupDragAndDrop()

      // Initialize board selector
      this.$nextTick(() => {
        this.initializeBoardSelector()
      })
    },

    // Initialize board selector with Alpine.js integration
    initializeBoardSelector () {
      const boardSelector = document.getElementById('board-selector')
      if (!boardSelector) return

      // Populate options if not already done
      if (boardSelector.children.length === 0) {
        const boards = this.$store.app.boards || []
        this.populateBoardOptions(boardSelector, boards)
      }
    },

    // Populate board selector options
    populateBoardOptions (selector, boards) {
      selector.innerHTML = ''

      // Add the "New board..." option
      this.addOption(selector, 'new-board', 'New board...')

      // Add "Rename current board..." option
      this.addOption(selector, 'rename-board', 'Rename current board...')

      // Add "Delete current board..." option
      this.addOption(selector, 'delete-board', 'Delete current board...')

      // Add separator
      const separator = document.createElement('option')
      separator.disabled = true
      separator.textContent = '---'
      selector.appendChild(separator)

      if (boards.length === 0) {
        this.addOption(selector, '', 'No boards available')
        selector.disabled = true
      } else {
        boards.forEach(boardName => {
          this.addOption(selector, boardName, `Board: ${boardName}`)
        })
        selector.disabled = false
      }
    },

    // Helper to add option
    addOption (selector, value, text) {
      const option = document.createElement('option')
      option.value = value
      option.textContent = text
      selector.appendChild(option)
    },

    // Handle lane name edit
    async saveLaneName (lane, newName) {
      if (!newName.trim() || newName === lane.name) return

      try {
        const response = await fetch(`/boards/${encodeURIComponent(this.$store.app.currentBoardName)}/lane/${encodeURIComponent(lane.name)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lane: { name: newName.trim(), notes: lane.notes },
            position: this.$store.app.currentLanes.findIndex(l => l.name === lane.name)
          })
        })

        if (!response.ok) throw new Error('Failed to rename lane')

        // Reload board to show updated lane name
        await this.$store.app.loadBoard(this.$store.app.currentBoardName)
        this.$store.app.showNotification(`Lane renamed to "${newName}"`, 'success')
      } catch (error) {
        console.error('Error renaming lane:', error)
        this.$store.app.showNotification(error.message, 'error')
      }
    },

    // Handle note deletion
    async deleteNote (note, lane) {
      if (!confirm(`Are you sure you want to delete "${note.title}"?`)) return

      try {
        const response = await fetch(`/boards/${encodeURIComponent(this.$store.app.currentBoardName)}/note/${note.id}`, {
          method: 'DELETE'
        })

        if (!response.ok) throw new Error('Failed to delete note')

        // Reload board
        await this.$store.app.loadBoard(this.$store.app.currentBoardName)
        this.$store.app.showNotification(`Note "${note.title}" deleted`, 'success')
      } catch (error) {
        console.error('Error deleting note:', error)
        this.$store.app.showNotification(error.message, 'error')
      }
    },

    // Toggle note expansion
    toggleNote (note) {
      note.expanded = !note.expanded

      // Save the expanded state
      this.saveNoteState(note)
    },

    // Save note state (expanded/collapsed)
    async saveNoteState (note) {
      try {
        await fetch(`/boards/${encodeURIComponent(this.$store.app.currentBoardName)}/note/${note.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            note: { expanded: note.expanded },
            lane_name: null,
            position: null
          })
        })
      } catch (error) {
        console.error('Error saving note state:', error)
      }
    },

    // Setup drag and drop
    setupDragAndDrop () {
      // Note drag and drop will be implemented here
      // For now, we'll use the existing drag and drop system
    },

    // Format date for display
    formatDate (dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleDateString()
    },

    // Get priority color
    getPriorityColor (priority) {
      switch (priority) {
        case 'High': return 'var(--pico-del-color)'
        case 'Medium': return 'var(--pico-ins-color)'
        case 'Low': return 'var(--pico-mark-color)'
        default: return ''
      }
    }
  }))
})
