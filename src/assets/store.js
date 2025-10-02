// Alpine.js store for ToCry reactive app
/* global toastui, history, marked, hljs, localStorage, ResizeObserver */
// eslint-disable-next-line no-unused-vars
function createToCryStore () {
  return {
    // State
    boards: [],
    currentBoardName: '',
    currentBoard: null,
    loading: false,
    loadingBoardFromUrl: false,
    error: null,
    boardNotFound: false,

    // UI State
    showAddLane: false,
    newLaneName: '',
    showNewBoardModal: false,
    newBoardName: '',
    showBoardMenu: false,
    editingNote: false,
    noteEdit: {},
    noteEditTagsString: '',
    // Store the note being edited for uploads (persists even if modal is closed)
    currentEditingNoteId: null,
    editor: null,
    showAttachmentModal: false,
    // Store the note data for attachments modal (separate from noteEdit)
    attachmentNote: null,

    // Drag and Drop
    draggedNote: null,
    draggedFromLane: null,
    draggedFromIndex: null,
    draggedToIndex: null,

    // Lane Drag and Drop
    draggedLane: null,
    draggedLaneIndex: null,

    // Lane Renaming
    editingLane: null,
    editingLaneName: '',

    // Note Title Editing
    editingNoteTitle: null, // Store note ID being edited
    editingNoteTitleText: '',
    editingNoteTitleLane: null, // Store lane name for context

    // Note Content Editing
    editingNoteContent: null, // Store note ID being edited
    editingNoteContentText: '',
    editingNoteContentLane: null, // Store lane name for context

    // Note Tag Editing
    editingNoteTags: null, // Store note ID being edited
    editingNoteTagsText: '',
    editingNoteTagsLane: null, // Store lane name for context
    addingNewTag: false,

    // Scrolling
    canScrollLeft: false,
    canScrollRight: false,

    // Modal state
    showModal: false,
    modalType: '', // 'alert' or 'prompt'
    modalTitle: '',
    modalMessage: '',
    modalInput: '',
    modalConfirmText: 'OK',
    modalCancelText: 'Cancel',
    modalResolve: null,

    // Theme and color scheme
    isDarkMode: false,
    currentColorScheme: 'default',
    currentColor: '#1d88fe',
    showColorSelector: false,
    colorSchemes: {
      default: {
        light: { 'primary-rgb': '29, 136, 254' },
        dark: { 'primary-rgb': '82, 157, 255' }
      },
      amber: {
        light: { 'primary-rgb': '255, 193, 7' },
        dark: { 'primary-rgb': '255, 202, 44' }
      },
      blue: {
        light: { 'primary-rgb': '0, 123, 255' },
        dark: { 'primary-rgb': '55, 125, 255' }
      },
      cyan: {
        light: { 'primary-rgb': '23, 162, 184' },
        dark: { 'primary-rgb': '79, 195, 214' }
      },
      fuchsia: {
        light: { 'primary-rgb': '255, 0, 255' },
        dark: { 'primary-rgb': '255, 102, 255' }
      },
      grey: {
        light: { 'primary-rgb': '115, 130, 144' },
        dark: { 'primary-rgb': '161, 172, 184' }
      },
      green: {
        light: { 'primary-rgb': '56, 142, 60' },
        dark: { 'primary-rgb': '102, 187, 106' }
      },
      indigo: {
        light: { 'primary-rgb': '102, 16, 242' },
        dark: { 'primary-rgb': '154, 104, 247' }
      },
      jade: {
        light: { 'primary-rgb': '0, 168, 107' },
        dark: { 'primary-rgb': '0, 200, 130' }
      },
      lime: {
        light: { 'primary-rgb': '205, 220, 57' },
        dark: { 'primary-rgb': '220, 231, 117' }
      },
      orange: {
        light: { 'primary-rgb': '255, 152, 0' },
        dark: { 'primary-rgb': '255, 183, 77' }
      },
      pink: {
        light: { 'primary-rgb': '233, 30, 99' },
        dark: { 'primary-rgb': '244, 143, 177' }
      },
      pumpkin: {
        light: { 'primary-rgb': '255, 112, 0' },
        dark: { 'primary-rgb': '255, 144, 51' }
      },
      purple: {
        light: { 'primary-rgb': '156, 39, 176' },
        dark: { 'primary-rgb': '186, 104, 200' }
      },
      red: {
        light: { 'primary-rgb': '211, 47, 47' },
        dark: { 'primary-rgb': '255, 82, 82' }
      },
      sand: {
        light: { 'primary-rgb': '215, 194, 169' },
        dark: { 'primary-rgb': '227, 211, 189' }
      },
      slate: {
        light: { 'primary-rgb': '82, 105, 129' },
        dark: { 'primary-rgb': '132, 151, 171' }
      },
      violet: {
        light: { 'primary-rgb': '126, 87, 194' },
        dark: { 'primary-rgb': '179, 157, 219' }
      },
      yellow: {
        light: { 'primary-rgb': '255, 235, 59' },
        dark: { 'primary-rgb': '255, 241, 118' }
      },
      zinc: {
        light: { 'primary-rgb': '112, 112, 112' },
        dark: { 'primary-rgb': '144, 144, 144' }
      }
    },

    // Search functionality
    searchQuery: '',
    searchResults: [],

    // Initialize
    async init () {
      console.log('ToastUI available on init:', typeof window.ToastUI?.Editor !== 'undefined')

      // Add keyboard shortcut for search
      document.addEventListener('keydown', (e) => {
        // "/" key to focus search (when not typing in an input, textarea, or contenteditable)
        const activeElement = document.activeElement
        const isEditable = activeElement?.tagName === 'INPUT' ||
                          activeElement?.tagName === 'TEXTAREA' ||
                          activeElement?.contentEditable === 'true' ||
                          activeElement?.closest('.ToastUI__editor') ||
                          activeElement?.closest('[contenteditable="true"]')

        if (e.key === '/' && !isEditable) {
          e.preventDefault()
          this.$nextTick(() => {
            this.$refs.searchInput?.focus()
          })
        }
      })

      // Initialize theme
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        this.isDarkMode = savedTheme === 'dark'
        document.documentElement.setAttribute('data-theme', savedTheme)
      }

      // Initialize color scheme
      const savedColorScheme = localStorage.getItem('colorScheme')
      if (savedColorScheme && this.colorSchemes[savedColorScheme]) {
        this.currentColorScheme = savedColorScheme
        this.updateColorScheme()
      }

      // Check if we're loading a specific board from URL
      const pathParts = window.location.pathname.split('/')
      const hasBoardInUrl = pathParts[1] === 'b' && pathParts[2]

      if (hasBoardInUrl) {
        // Set loading states when loading a specific board to prevent Welcome Screen flash
        this.loading = true
        this.loadingBoardFromUrl = true
      }

      await this.loadBoards()
      console.log('Loaded boards:', this.boards, 'Count:', this.boards.length)

      // Setup global keyboard shortcuts
      this.setupGlobalKeyboardHandler()

      if (hasBoardInUrl) {
        const boardName = decodeURIComponent(pathParts[2])
        this.currentBoardName = boardName
        await this.loadBoard(boardName)
      } else if (this.boards.length === 1) {
        // If there's only one board, show it by default
        console.log('Auto-loading single board:', this.boards[0])
        this.currentBoardName = this.boards[0]
        await this.loadBoard(this.boards[0])
      }
    },

    // Global keyboard handler for enhanced navigation
    setupGlobalKeyboardHandler () {
      document.addEventListener('keydown', (e) => {
        const activeElement = document.activeElement
        const isEditable = activeElement?.tagName === 'INPUT' ||
                          activeElement?.tagName === 'TEXTAREA' ||
                          activeElement?.contentEditable === 'true'

        // Escape key: cancel any ongoing editing
        if (e.key === 'Escape') {
          if (this.editingNoteTitle) {
            this.cancelNoteTitleEdit()
            e.preventDefault()
          } else if (this.editingNoteContent) {
            this.cancelNoteContentEdit()
            e.preventDefault()
          } else if (this.editingNoteTags) {
            this.cancelNoteTagsEdit()
            e.preventDefault()
          } else if (this.editingLane) {
            this.cancelLaneRename()
            e.preventDefault()
          } else if (this.showNewBoardModal) {
            this.showNewBoardModal = false
            e.preventDefault()
          } else if (this.showAddLane) {
            this.showAddLane = false
            e.preventDefault()
          } else if (this.editingNote) {
            this.cancelEditNote()
            e.preventDefault()
          }
        }

        // Tab navigation between editable elements (when not in modal/input)
        if (e.key === 'Tab' && !isEditable && !e.shiftKey) {
          // Focus first editable element in visible note
          const firstNote = document.querySelector('.note-card:not(.search-hidden)')
          if (firstNote) {
            const titleElement = firstNote.querySelector('.note-title')
            if (titleElement) {
              e.preventDefault()
              titleElement.click() // This will trigger title editing
            }
          }
        }

        // Ctrl/Cmd + Enter: save current edit
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          if (this.editingNoteContent) {
            this.saveNoteContent()
            e.preventDefault()
          } else if (this.editingNoteTags) {
            this.saveNoteTags()
            e.preventDefault()
          } else if (this.editingNoteTitle) {
            this.confirmNoteTitleEdit()
            e.preventDefault()
          } else if (this.editingLane) {
            this.confirmLaneRename()
            e.preventDefault()
          }
        }

        // Ctrl/Cmd + K: quick search (alternative to /)
        if ((e.ctrlKey || e.metaKey) && e.key === 'k' && !isEditable) {
          e.preventDefault()
          this.$nextTick(() => {
            this.$refs.searchInput?.focus()
          })
        }

        // Ctrl/Cmd + N: new note in first lane
        if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !isEditable) {
          e.preventDefault()
          if (this.currentBoard?.lanes?.length > 0) {
            this.addNote(this.currentBoard.lanes[0].name)
          }
        }

        // Ctrl/Cmd + L: new lane
        if ((e.ctrlKey || e.metaKey) && e.key === 'l' && !isEditable) {
          e.preventDefault()
          this.showAddLane = true
        }

        // Ctrl/Cmd + B: new board
        if ((e.ctrlKey || e.metaKey) && e.key === 'b' && !isEditable) {
          e.preventDefault()
          this.showNewBoardModal = true
        }
      })
    },

    // Theme and color scheme methods
    toggleTheme () {
      this.isDarkMode = !this.isDarkMode
      document.documentElement.setAttribute('data-theme', this.isDarkMode ? 'dark' : 'light')
      localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light')

      // Re-apply color scheme to get correct theme variant
      this.updateColorScheme()

      // Show toast notification
      this.showSuccess(`Switched to ${this.isDarkMode ? 'dark' : 'light'} theme`)
    },
    async updateColorScheme () {
      // Update the Pico.css stylesheet link
      const picoThemeLink = document.querySelector(
        'link[href*="pico.min.css"], link[href*="pico."][href*=".min.css"]'
      )

      if (picoThemeLink) {
        const cssFileName = this.currentColorScheme === 'default'
          ? 'pico.min.css'
          : `pico.${this.currentColorScheme}.min.css`
        picoThemeLink.href = `https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/${cssFileName}`
      }

      // Update the --primary-rgb variable for custom styles
      const scheme = this.colorSchemes[this.currentColorScheme]
      if (scheme) {
        const currentTheme = this.isDarkMode ? 'dark' : 'light'
        const colors = scheme[currentTheme] || scheme.light

        // Set the primary-rgb variable
        const primaryRgb = colors['primary-rgb']
        if (primaryRgb) {
          document.documentElement.style.setProperty('--primary-rgb', primaryRgb)

          // Convert rgb to hex for the swatch
          const rgbValues = primaryRgb.split(',').map(v => parseInt(v.trim()))
          this.currentColor = `#${rgbValues.map(v => v.toString(16).padStart(2, '0')).join('')}`
        }

        localStorage.setItem('colorScheme', this.currentColorScheme)

        // Save to backend only if we have a current board
        if (this.currentBoardName && this.currentBoardName !== '') {
          try {
            const response = await fetch(`/boards/${encodeURIComponent(this.currentBoardName)}/color-scheme`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ color_scheme: this.currentColorScheme })
            })

            if (!response.ok) {
              throw new Error('Failed to save color scheme')
            }
          } catch (error) {
            console.error('Error saving color scheme:', error)
            this.showError('Failed to save color scheme')
          }
        }
      }
    },
    // Helper to convert hex to RGB
    hexToRgb (hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          }
        : null
    },
    // Search functionality
    performSearch () {
      const query = this.searchQuery.toLowerCase().trim()

      // If no search query, show all notes
      if (!query) {
        // Reset all notes to visible
        if (this.currentBoard && this.currentBoard.lanes) {
          this.currentBoard.lanes.forEach(lane => {
            if (lane.notes && Array.isArray(lane.notes)) {
              lane.notes.forEach(note => {
                if (note) note._hidden = false
              })
            }
          })
        }
        return
      }

      // Check if this is a tag search (starts with #)
      const isTagSearch = query.startsWith('#')
      const searchTag = isTagSearch ? query.substring(1) : query

      // Hide/show notes based on search
      if (this.currentBoard && this.currentBoard.lanes) {
        this.currentBoard.lanes.forEach(lane => {
          if (lane.notes && Array.isArray(lane.notes)) {
            lane.notes.forEach(note => {
              if (note) {
                let matches = false

                if (isTagSearch) {
                  // Tag search: match notes with tags that start with the search term
                  matches = note.tags && Array.isArray(note.tags) &&
                    note.tags.some(tag => tag && tag.toLowerCase().startsWith(searchTag))
                } else {
                  // Regular search: match title, content, or tags containing the query
                  matches =
                    (note.title && note.title.toLowerCase().includes(query)) ||
                    (note.content && note.content.toLowerCase().includes(query)) ||
                    (note.tags && Array.isArray(note.tags) && note.tags.some(tag => tag && tag.toLowerCase().includes(query)))
                }

                note._hidden = !matches
              }
            })
          }
        })
      }

      // Force reactivity
      this.currentBoard = { ...this.currentBoard }
    },

    // Search by tag (sets search query to #tag)
    searchByTag (tag) {
      this.searchQuery = `#${tag}`
      this.performSearch()
      // Focus the search input so user can see the search query
      this.$nextTick(() => {
        if (this.$refs.searchInput) {
          this.$refs.searchInput.focus()
        }
      })
    },

    // Load all boards
    async loadBoards () {
      try {
        const response = await fetch('/boards')
        if (!response.ok) throw new Error('Failed to load boards')
        this.boards = await response.json()
        // Empty list is valid, don't set error
        this.boardNotFound = false
      } catch (error) {
        console.error('Error loading boards:', error)
        this.error = error.message
      }
    },

    // Load a specific board
    async loadBoard (boardName) {
      if (!boardName) {
        return
      }

      this.loading = true
      this.error = null
      this.boardNotFound = false

      try {
        // Load both board details and lanes in parallel
        const [lanesResponse, detailsResponse] = await Promise.all([
          fetch(`/boards/${encodeURIComponent(boardName)}/lanes`),
          fetch(`/boards/${encodeURIComponent(boardName)}`)
        ])

        if (!lanesResponse.ok) {
          if (lanesResponse.status === 404) {
            this.error = `Board '${boardName}' not found. It may have been deleted or you may not have access to it.`
            this.boardNotFound = true
          } else {
            throw new Error('Failed to load board')
          }
        } else {
          const lanes = await lanesResponse.json()
          let boardDetails = { color_scheme: null }

          // Load board details if available
          if (detailsResponse.ok) {
            boardDetails = await detailsResponse.json()
            console.log('Loaded board details:', boardDetails)
          }

          console.log('Loaded lanes for board', boardName, ':', lanes)
          this.currentBoard = {
            name: boardName,
            lanes,
            colorScheme: boardDetails.color_scheme
          }
          console.log('Set currentBoard:', this.currentBoard)
          this.currentBoardName = boardName
          this.boardNotFound = false

          // Apply board color scheme with delay for smooth transition
          if (boardDetails.color_scheme && boardDetails.color_scheme !== this.currentColorScheme) {
            // Delay color scheme application to make it look intentional
            setTimeout(() => {
              this.currentColorScheme = boardDetails.color_scheme
              this.updateColorScheme()
              console.log('Applied board color scheme:', boardDetails.color_scheme)
              // Clear loadingBoardFromUrl after everything is loaded and color is applied
              this.loadingBoardFromUrl = false
            }, 500) // 0.5 second delay
          } else {
            // Clear loadingBoardFromUrl immediately if no color scheme delay
            this.loadingBoardFromUrl = false
          }

          // Update URL without reload
          history.pushState({ board: boardName }, '', `/b/${boardName}`)

          // Initialize scroll watcher after board is loaded
          this.initScrollWatcher()
        }
      } catch (error) {
        console.error('Error loading board:', error)
        this.error = error.message
      } finally {
        this.loading = false
      }
    },
    // Handle new board action
    async handleNewBoard () {
      const boardName = await this.prompt('Enter new board name:')
      if (!boardName) return
      try {
        await this.createBoard(boardName)
        this.showSuccess(`Board "${boardName}" created successfully.`)
      } catch (error) {
        this.showError(`Failed to create board: ${error.message}`)
      }
    },
    // Handle add lane action
    async handleAddLane () {
      const laneName = await this.prompt('Enter lane name:')
      if (!laneName) return
      try {
        const response = await fetch(`/boards/${encodeURIComponent(this.currentBoardName)}/lane`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: laneName })
        })
        if (!response.ok) throw new Error('Failed to add lane')
        await this.loadBoard(this.currentBoardName)
        this.showSuccess(`Lane "${laneName}" added successfully.`)
      } catch (error) {
        this.showError(`Failed to add lane: ${error.message}`)
      }
    },
    // Handle rename board action
    async handleRenameBoard () {
      const newName = await this.prompt('Enter new board name:', this.currentBoardName)
      if (!newName || newName === this.currentBoardName) return
      try {
        await this.renameBoard(this.currentBoardName, newName)
        this.showSuccess(`Board renamed to "${newName}" successfully.`)
      } catch (error) {
        this.showError(`Failed to rename board: ${error.message}`)
      }
    },
    // Handle share board action
    async handleShareBoard () {
      const email = await this.prompt('Enter email address to share with:')
      if (!email) return
      try {
        await this.shareBoard(this.currentBoardName, email)
        this.showSuccess(`Board "${this.currentBoardName}" shared with "${email}" successfully.`)
      } catch (error) {
        this.showError(`Failed to share board: ${error.message}`)
      }
    },
    // Handle delete board action
    async handleDeleteBoard () {
      const confirmed = await this.showAlert(
        'Delete Board',
        `Are you sure you want to delete the board "${this.currentBoardName}"? This action cannot be undone.`,
        'Delete Anyway'
      )
      if (!confirmed) return
      try {
        await this.deleteBoard(this.currentBoardName)
        this.showSuccess(`Board "${this.currentBoardName}" deleted successfully.`)
      } catch (error) {
        this.showError(`Failed to delete board: ${error.message}`)
      }
    },
    // Create a new board
    async createBoard (name) {
      try {
        const response = await fetch('/boards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        })

        if (!response.ok) throw new Error('Failed to create board')

        await this.loadBoards()
        this.currentBoardName = name
        await this.loadBoard(name)
      } catch (error) {
        console.error('Error creating board:', error)
        this.error = error.message
      }
    },

    // Rename a board
    async renameBoard (oldName, newName) {
      try {
        const response = await fetch(`/boards/${encodeURIComponent(oldName)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_name: newName })
        })
        if (!response.ok) throw new Error('Failed to rename board')
        await this.loadBoards()
        this.currentBoardName = newName
        await this.loadBoard(newName)
        // Update URL
        history.pushState({ board: newName }, '', `/b/${newName}`)
      } catch (error) {
        console.error('Error renaming board:', error)
        throw error
      }
    },
    // Share a board
    async shareBoard (boardName, toUserEmail) {
      try {
        const response = await fetch(`/boards/${encodeURIComponent(boardName)}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to_user_email: toUserEmail })
        })
        if (!response.ok) throw new Error('Failed to share board')
        return await response.json()
      } catch (error) {
        console.error('Error sharing board:', error)
        throw error
      }
    },
    // Delete a board
    async deleteBoard (boardName) {
      try {
        const response = await fetch(`/boards/${encodeURIComponent(boardName)}`, {
          method: 'DELETE'
        })
        if (!response.ok) throw new Error('Failed to delete board')
        await this.loadBoards()
        // Load first available board or clear current board
        if (this.boards.length > 0) {
          this.currentBoardName = this.boards[0]
          await this.loadBoard(this.boards[0])
          history.pushState({ board: this.boards[0] }, '', `/b/${this.boards[0]}`)
        } else {
          this.currentBoard = null
          this.currentBoardName = ''
          history.pushState({}, '', '/')
        }
      } catch (error) {
        console.error('Error deleting board:', error)
        throw error
      }
    },
    // Show success message
    showSuccess (message) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'success', message }
      }))
    },
    // Show error message
    showError (message) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'error', message }
      }))
    },

    showInfo (message) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'info', message }
      }))
    },

    // Add a new lane
    async addLane (boardName) {
      const laneName = await this.prompt('Enter lane name:')
      if (!laneName) return

      try {
        const response = await fetch(`/boards/${encodeURIComponent(boardName)}/lane`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: laneName })
        })

        if (!response.ok) throw new Error('Failed to add lane')

        await this.loadBoard(boardName)
        this.showSuccess('Lane added successfully')
      } catch (error) {
        console.error('Error adding lane:', error)
        this.error = error.message
        this.showError('Failed to add lane')
      }
    },

    // Handle create lane template action
    async handleCreateLaneTemplate (templateType) {
      await this.createLaneTemplate(templateType)
    },

    // Create lanes from a template
    async createLaneTemplate (templateType) {
      const templates = {
        simple: ['Todo', 'In Progress', 'Done'],
        taskmgmt: ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'],
        timebased: ['Today', 'This Week', 'Someday', 'Done']
      }

      const lanes = templates[templateType]
      if (!lanes) {
        this.showError('Invalid template type')
        return
      }

      this.showInfo(`Creating ${lanes.length} lanes...`)

      try {
        // Create lanes one by one from left to right
        // Backend appends to array, so we create in correct order
        for (let i = 0; i < lanes.length; i++) {
          const laneName = lanes[i]
          const response = await fetch(`/boards/${encodeURIComponent(this.currentBoardName)}/lane`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: laneName })
          })

          if (!response.ok) {
            throw new Error(`Failed to create lane "${laneName}"`)
          }
        }

        await this.loadBoard(this.currentBoardName)
        this.showSuccess(`Created ${lanes.length} lanes successfully`)
      } catch (error) {
        console.error('Error creating lane template:', error)
        this.error = error.message
        this.showError('Failed to create lanes')
      }
    },

    // Delete a lane
    async deleteLane (laneName) {
      const confirmed = await this.showAlert(
        'Delete Lane',
        'Are you sure you want to delete this lane? All notes in it will be deleted.',
        'Delete Anyway'
      )
      if (!confirmed) return

      try {
        const response = await fetch(`/boards/${encodeURIComponent(this.currentBoardName)}/lane/${encodeURIComponent(laneName)}`, {
          method: 'DELETE'
        })

        if (!response.ok) throw new Error('Failed to delete lane')

        await this.loadBoard(this.currentBoardName)
        this.showSuccess('Lane deleted successfully')
      } catch (error) {
        console.error('Error deleting lane:', error)
        this.error = error.message
        this.showError('Failed to delete lane')
      }
    },

    // Lane Renaming Functions
    startRenamingLane (laneName) {
      this.editingLane = laneName
      this.editingLaneName = laneName
      // Focus the input field after it becomes visible
      this.$nextTick(() => {
        const input = this.$refs.laneRenameInput
        if (input) {
          input.focus()
          input.select()
        }
      })
    },

    async confirmLaneRename () {
      if (!this.editingLane || !this.editingLaneName.trim()) {
        this.cancelLaneRename()
        return
      }

      const newName = this.editingLaneName.trim()
      if (newName === this.editingLane) {
        this.cancelLaneRename()
        return
      }

      try {
        const response = await fetch(`/boards/${encodeURIComponent(this.currentBoardName)}/lane/${encodeURIComponent(this.editingLane)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lane: { name: newName, notes: [] },
            position: this.currentBoard.lanes.findIndex(l => l.name === this.editingLane)
          })
        })

        if (!response.ok) throw new Error('Failed to rename lane')

        await this.loadBoard(this.currentBoardName)
        this.showSuccess(`Lane renamed to "${newName}"`)
      } catch (error) {
        console.error('Error renaming lane:', error)
        this.showError('Failed to rename lane')
      } finally {
        this.cancelLaneRename()
      }
    },

    cancelLaneRename () {
      this.editingLane = null
      this.editingLaneName = ''
    },

    // Note Title Editing Functions
    startEditingNoteTitle (noteId, laneName, currentTitle) {
      this.editingNoteTitle = noteId
      this.editingNoteTitleText = currentTitle
      this.editingNoteTitleLane = laneName
      // Focus the input field after it becomes visible
      this.$nextTick(() => {
        const input = this.$refs[`noteTitleInput-${noteId}`]
        if (input) {
          input.focus()
          input.select()
        }
      })
    },

    async confirmNoteTitleEdit () {
      if (!this.editingNoteTitle || !this.editingNoteTitleText.trim()) {
        this.cancelNoteTitleEdit()
        return
      }

      const newTitle = this.editingNoteTitleText.trim()

      // Find the current note to get its full data
      const lane = this.currentBoard.lanes.find(l => l.name === this.editingNoteTitleLane)
      const note = lane?.notes.find(n => n.sepia_id === this.editingNoteTitle)

      if (!note || note.title === newTitle) {
        this.cancelNoteTitleEdit()
        return
      }

      try {
        const response = await fetch(`/boards/${encodeURIComponent(this.currentBoardName)}/note/${encodeURIComponent(this.editingNoteTitle)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lane_name: this.editingNoteTitleLane,
            note: {
              ...note,
              title: newTitle
            }
          })
        })

        if (!response.ok) throw new Error('Failed to update note title')

        await this.loadBoard(this.currentBoardName)
        this.showSuccess('Note title updated')
      } catch (error) {
        console.error('Error updating note title:', error)
        this.showError('Failed to update note title')
      } finally {
        this.cancelNoteTitleEdit()
      }
    },

    cancelNoteTitleEdit () {
      this.editingNoteTitle = null
      this.editingNoteTitleText = ''
      this.editingNoteTitleLane = null
    },

    // Note Content Editing Functions
    startEditingNoteContent (noteId, laneName, currentContent) {
      this.editingNoteContent = noteId
      this.editingNoteContentText = currentContent || ''
      this.editingNoteContentLane = laneName
      // Focus the textarea after it becomes visible
      this.$nextTick(() => {
        const textarea = this.$refs[`noteContentInput-${noteId}`]
        if (textarea) {
          textarea.focus()
          // Place cursor at end of content
          textarea.setSelectionRange(textarea.value.length, textarea.value.length)
        }
      })
    },

    async saveNoteContent () {
      if (!this.editingNoteContent) {
        this.cancelNoteContentEdit()
        return
      }

      const newContent = this.editingNoteContentText

      // Find the current note to get its full data
      const lane = this.currentBoard.lanes.find(l => l.name === this.editingNoteContentLane)
      const note = lane?.notes.find(n => n.sepia_id === this.editingNoteContent)

      if (!note || note.content === newContent) {
        this.cancelNoteContentEdit()
        return
      }

      try {
        const response = await fetch(`/boards/${encodeURIComponent(this.currentBoardName)}/note/${encodeURIComponent(this.editingNoteContent)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lane_name: this.editingNoteContentLane,
            note: {
              ...note,
              content: newContent
            }
          })
        })

        if (!response.ok) throw new Error('Failed to update note content')

        await this.loadBoard(this.currentBoardName)
        this.showSuccess('Note content updated')
      } catch (error) {
        console.error('Error updating note content:', error)
        this.showError('Failed to update note content')
      } finally {
        this.cancelNoteContentEdit()
      }
    },

    cancelNoteContentEdit () {
      this.editingNoteContent = null
      this.editingNoteContentText = ''
      this.editingNoteContentLane = null
    },

    // Auto-save with debouncing for content
    debouncedSaveNoteContent: null,

    autoSaveNoteContent () {
      // Clear existing timeout
      if (this.debouncedSaveNoteContent) {
        clearTimeout(this.debouncedSaveNoteContent)
      }

      // Set new timeout to save after 1 second of inactivity
      this.debouncedSaveNoteContent = setTimeout(() => {
        this.saveNoteContent()
      }, 1000)
    },

    // Note Tag Editing Functions
    startEditingNoteTags (noteId, laneName, currentTags) {
      this.editingNoteTags = noteId
      this.editingNoteTagsText = currentTags ? currentTags.join(', ') : ''
      this.editingNoteTagsLane = laneName
      // Focus the input field after it becomes visible
      this.$nextTick(() => {
        const input = this.$refs[`noteTagsInput-${noteId}`]
        if (input) {
          input.focus()
          // Place cursor at end
          input.setSelectionRange(input.value.length, input.value.length)
        }
      })
    },

    async saveNoteTags () {
      if (!this.editingNoteTags) {
        this.cancelNoteTagsEdit()
        return
      }

      // Parse tags from comma-separated text
      const newTags = this.editingNoteTagsText
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      // Find the current note to get its full data
      const lane = this.currentBoard.lanes.find(l => l.name === this.editingNoteTagsLane)
      const note = lane?.notes.find(n => n.sepia_id === this.editingNoteTags)

      if (!note) {
        this.cancelNoteTagsEdit()
        return
      }

      // Check if tags actually changed
      const currentTags = note.tags || []
      if (JSON.stringify(currentTags.sort()) === JSON.stringify(newTags.sort())) {
        this.cancelNoteTagsEdit()
        return
      }

      try {
        const response = await fetch(`/boards/${encodeURIComponent(this.currentBoardName)}/note/${encodeURIComponent(this.editingNoteTags)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lane_name: this.editingNoteTagsLane,
            note: {
              ...note,
              tags: newTags
            }
          })
        })

        if (!response.ok) throw new Error('Failed to update note tags')

        await this.loadBoard(this.currentBoardName)
        this.showSuccess('Note tags updated')
      } catch (error) {
        console.error('Error updating note tags:', error)
        this.showError('Failed to update note tags')
      } finally {
        this.cancelNoteTagsEdit()
      }
    },

    cancelNoteTagsEdit () {
      this.editingNoteTags = null
      this.editingNoteTagsText = ''
      this.editingNoteTagsLane = null
      this.addingNewTag = false
    },

    // Add a new tag quickly
    addQuickTag (noteId, laneName, tagText) {
      const trimmedTag = tagText.trim()
      if (!trimmedTag) return

      // Find the current note
      const lane = this.currentBoard.lanes.find(l => l.name === laneName)
      const note = lane?.notes.find(n => n.sepia_id === noteId)

      if (!note) return

      const currentTags = note.tags || []
      const newTags = [...currentTags, trimmedTag]

      this.updateNoteTags(noteId, laneName, newTags)
    },

    // Remove a tag quickly
    removeQuickTag (noteId, laneName, tagToRemove) {
      // Find the current note
      const lane = this.currentBoard.lanes.find(l => l.name === laneName)
      const note = lane?.notes.find(n => n.sepia_id === noteId)

      if (!note) return

      const currentTags = note.tags || []
      const newTags = currentTags.filter(tag => tag !== tagToRemove)

      this.updateNoteTags(noteId, laneName, newTags)
    },

    // Generic function to update note tags
    async updateNoteTags (noteId, laneName, newTags) {
      try {
        const lane = this.currentBoard.lanes.find(l => l.name === laneName)
        const note = lane?.notes.find(n => n.sepia_id === noteId)

        if (!note) return

        const response = await fetch(`/boards/${encodeURIComponent(this.currentBoardName)}/note/${encodeURIComponent(noteId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lane_name: laneName,
            note: {
              ...note,
              tags: newTags
            }
          })
        })

        if (!response.ok) throw new Error('Failed to update note tags')

        await this.loadBoard(this.currentBoardName)
        this.showSuccess('Tag updated')
      } catch (error) {
        console.error('Error updating note tags:', error)
        this.showError('Failed to update note tags')
      }
    },

    // Add a new note
    async addNote (laneName) {
      const title = await this.prompt('Enter note title:')
      if (!title) return

      try {
        const response = await fetch(`/boards/${encodeURIComponent(this.currentBoardName)}/note`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lane_name: laneName,
            note: {
              title,
              content: '',
              tags: []
            }
          })
        })

        if (!response.ok) throw new Error('Failed to add note')

        await this.loadBoard(this.currentBoardName)
      } catch (error) {
        console.error('Error adding note:', error)
        this.error = error.message
      }
    },

    // Edit a note
    editNote (note, laneName) {
      // Store the lane name for reference
      this.draggedFromLane = laneName

      // Show the inline modal
      this.editingNote = true
      this.noteEdit = { ...note }
      // Store the note ID for uploads (persists even if modal is closed)
      this.currentEditingNoteId = note.sepia_id
      this.noteEditTagsString = note.tags ? note.tags.join(', ') : ''
      this.editorInitialized = false

      this.$nextTick(() => {
        this.initializeEditor()
      })
    },

    // Initialize ToastUI Editor
    initializeEditor () {
      if (this.editorInitialized) return

      // Destroy existing editor if any
      if (this.editor) {
        try {
          this.editor.destroy()
        } catch (error) {
          console.warn('Error destroying editor:', error)
        }
        this.editor = null
      }

      // Check if ToastUI Editor is available
      if (typeof toastui !== 'undefined' && toastui.Editor) {
        try {
          const editorContainer = document.querySelector('#editor')
          this.editor = new toastui.Editor({
            el: editorContainer,
            height: '300px',
            initialValue: this.noteEdit.content || '',
            previewStyle: 'vertical',
            toolbarItems: [
              ['heading', 'bold', 'italic', 'strike'],
              ['hr', 'quote'],
              ['ul', 'ol', 'task'],
              ['table', 'image', 'link'],
              ['code', 'codeblock']
            ],
            hooks: {
              addImageBlobHook: async (blob, callback) => {
                try {
                  // Create FormData for the image upload
                  const formData = new FormData()
                  formData.append('file', blob, blob.name || 'image.png')

                  // Upload the image
                  const response = await fetch(`/n/${this.noteEdit.sepia_id}/attach`, {
                    method: 'POST',
                    body: formData
                  })

                  if (!response.ok) {
                    throw new Error('Failed to upload image')
                  }

                  const result = await response.json()

                  // Get the URL for the uploaded image
                  const imageUrl = `/${result.relative_path}`

                  // Add to note's attachments if not already there
                  if (!this.noteEdit.attachments) {
                    this.noteEdit.attachments = []
                  }
                  if (!this.noteEdit.attachments.includes(result.filename)) {
                    this.noteEdit.attachments.push(result.filename)
                  }

                  // Call the callback with the image URL
                  callback(imageUrl, 'alt text')

                  this.showSuccess('Image uploaded successfully')
                } catch (error) {
                  console.error('Error uploading image:', error)
                  this.showError('Failed to upload image')
                }
              }
            }
          })
          this.editorInitialized = true
          console.log('ToastUI Editor initialized successfully')
        } catch (error) {
          console.error('Error initializing ToastUI Editor:', error)
          this.fallbackToTextarea()
        }
      } else {
        console.warn('ToastUI Editor not available, falling back to textarea')
        this.fallbackToTextarea()
      }
    },

    // Fallback to textarea if editor fails
    fallbackToTextarea () {
      const editorContainer = document.querySelector('#editor')
      if (editorContainer) {
        const textarea = document.createElement('textarea')
        textarea.id = 'editor'
        textarea.value = this.noteEdit.content || ''
        textarea.style.width = '100%'
        textarea.style.minHeight = '300px'
        textarea.style.fontFamily = 'monospace'
        textarea.style.padding = '0.5rem'
        textarea.style.border = '1px solid var(--pico-border-color)'
        textarea.style.borderRadius = 'var(--pico-border-radius)'
        textarea.placeholder = 'Enter note content in Markdown format...'

        // Replace the div with textarea
        editorContainer.parentNode.replaceChild(textarea, editorContainer)

        // Focus the textarea
        textarea.focus()

        // Update model on change
        textarea.addEventListener('input', (e) => {
          this.noteEdit.content = e.target.value
        })
      }
    },

    // Save note
    async saveNote () {
      try {
        // Get content from editor if available
        let content = this.noteEdit.content || ''
        if (this.editor && this.editor.getMarkdown) {
          content = this.editor.getMarkdown()
        }

        // Parse tags
        const tags = this.noteEditTagsString
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag)

        const noteData = {
          ...this.noteEdit,
          tags,
          content
        }

        const response = await fetch(`/boards/${encodeURIComponent(this.currentBoardName)}/note/${noteData.sepia_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            note: noteData,
            lane_name: this.draggedFromLane,
            position: null
          })
        })

        if (!response.ok) throw new Error('Failed to save note')

        this.cancelEditNote()
        await this.loadBoard(this.currentBoardName)
        this.showSuccess('Note saved successfully')
      } catch (error) {
        console.error('Error saving note:', error)
        this.error = error.message
        this.showError('Failed to save note')
      }
    },

    // Delete note
    async deleteNote () {
      const confirmed = await this.showAlert(
        'Delete Note',
        'Are you sure you want to delete this note?',
        'Delete Anyway'
      )
      if (!confirmed) return

      try {
        const response = await fetch(`/boards/${encodeURIComponent(this.currentBoardName)}/note/${this.noteEdit.sepia_id}`, {
          method: 'DELETE'
        })

        if (!response.ok) throw new Error('Failed to delete note')

        this.cancelEditNote()
        await this.loadBoard(this.currentBoardName)
        this.showSuccess('Note deleted successfully')
      } catch (error) {
        console.error('Error deleting note:', error)
        this.error = error.message
        this.showError('Failed to delete note')
      }
    },

    // Cancel editing note
    cancelEditNote () {
      // Clean up editor
      if (this.editor) {
        try {
          this.editor.destroy()
        } catch (error) {
          console.warn('Error destroying editor:', error)
        }
        this.editor = null
      }

      this.editingNote = false
      this.noteEdit = {}
      this.noteEditTagsString = ''
      this.currentEditingNoteId = null
      this.editorInitialized = false
    },

    // Edit note by ID (for HTMX cards)
    editNoteById (noteId, laneName) {
      // Find the note in the current board
      let note = null
      this.currentBoard.lanes.forEach(lane => {
        const found = lane.notes.find(n => n.sepia_id === noteId)
        if (found) note = found
      })
      if (note) {
        this.editNote(note, laneName)
      }
    },

    // Delete note by ID (for HTMX cards)
    async deleteNoteById (noteId, laneName) {
      const confirmed = await this.showAlert(
        'Delete Note',
        'Are you sure you want to delete this note?',
        'Delete Anyway'
      )
      if (!confirmed) return

      try {
        const response = await fetch(`/boards/${encodeURIComponent(this.currentBoardName)}/note/${noteId}`, {
          method: 'DELETE'
        })

        if (!response.ok) throw new Error('Failed to delete note')

        // Reload the board to show the changes
        await this.loadBoard(this.currentBoardName)
        this.showSuccess('Note deleted successfully')
      } catch (error) {
        console.error('Error deleting note:', error)
        this.error = error.message
        this.showError('Failed to delete note')
        // Reload on error
        await this.loadBoard(this.currentBoardName)
      }
    },

    // Confirm add lane
    async confirmAddLane () {
      if (!this.newLaneName.trim()) return

      try {
        const response = await fetch(`/boards/${encodeURIComponent(this.currentBoardName)}/lane`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: this.newLaneName.trim() })
        })

        if (!response.ok) throw new Error('Failed to add lane')

        this.newLaneName = ''
        this.showAddLane = false // Close the modal
        await this.loadBoard(this.currentBoardName)
      } catch (error) {
        console.error('Error adding lane:', error)
        this.error = error.message
      }
    },

    // Confirm new board
    async confirmNewBoard () {
      if (!this.newBoardName.trim()) return

      try {
        await this.createBoard(this.newBoardName.trim())
        this.showNewBoardModal = false
        this.newBoardName = ''
        await this.loadBoards()
        // Show success notification
        this.showSuccess(`Board "${this.currentBoardName}" created successfully!`)
      } catch (error) {
        console.error('Error creating board:', error)
        this.error = error.message
      }
    },

    // Drag and Drop Handlers
    handleDragStart (event, note, laneName) {
      // Stop event from bubbling up to lane
      event.stopPropagation()
      this.draggedNote = note
      this.draggedFromLane = laneName
      this.draggedFromIndex = Array.from(event.target.parentNode.children).indexOf(event.target)
      event.target.classList.add('dragging')
    },

    handleDragEnd (event) {
      event.stopPropagation()
      event.target.classList.remove('dragging')
      // Remove any drop indicators and containers
      document.querySelectorAll('.note-drop-indicator').forEach(el => el.remove())
      document.querySelectorAll('.drop-indicator-container').forEach(el => el.remove())
      // Reset all drag state
      this.draggedNote = null
      this.draggedFromLane = null
      this.draggedFromIndex = null
      this.draggedToIndex = null
    },

    handleDragOver (event, laneName) {
      event.preventDefault()
      // Remove any existing drop indicators and containers
      document.querySelectorAll('.note-drop-indicator').forEach(el => el.remove())
      document.querySelectorAll('.drop-indicator-container').forEach(el => el.remove())

      // Find the note card we're dragging over
      const noteCards = event.currentTarget.querySelectorAll('.note-card')
      const afterElement = this.getDragAfterElement(event.currentTarget, event.clientY)

      if (afterElement == null) {
        // If we're at the bottom, add to the end
        this.draggedToIndex = noteCards.length
        // Show indicator at the bottom of the lane
        const laneContainer = event.currentTarget

        // Create indicator
        const indicator = document.createElement('div')
        indicator.className = 'note-drop-indicator'
        indicator.style.cssText = `
          height: 3px;
          background-color: var(--pico-primary);
          width: 100%;
          box-shadow: 0 0 4px rgba(var(--primary-rgb), 0.5);
        `

        // Insert at the bottom of the lane, before any existing container
        laneContainer.appendChild(indicator)
        console.log('Added bottom indicator to lane')
      } else {
        // Otherwise, insert before the element we're over
        this.draggedToIndex = Array.from(noteCards).indexOf(afterElement)
        // Show indicator above the element
        const indicator = document.createElement('div')
        indicator.className = 'note-drop-indicator'
        indicator.style.cssText = `
          position: absolute;
          height: 2px;
          background-color: var(--pico-primary);
          width: 100%;
          left: 0;
          top: -1px;
          z-index: 1000;
        `
        afterElement.style.position = 'relative'
        afterElement.appendChild(indicator)
      }
    },

    getDragAfterElement (container, y) {
      const draggableElements = [...container.querySelectorAll('.note-card:not(.dragging)')]
      console.log('getDragAfterElement:', { y, draggableElements: draggableElements.length })
      return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect()
        const offset = y - box.top - box.height / 2
        console.log('Checking element:', { offset, closestOffset: closest.offset, element: child })
        if (offset < 0 && offset > closest.offset) {
          return { offset, element: child }
        } else {
          return closest
        }
      }, { offset: Number.NEGATIVE_INFINITY }).element
    },

    async handleDrop (event, toLaneName) {
      event.preventDefault()
      // Remove any drop indicators and containers
      document.querySelectorAll('.note-drop-indicator').forEach(el => el.remove())
      document.querySelectorAll('.drop-indicator-container').forEach(el => el.remove())

      if (!this.draggedNote) {
        // Handle file drops (images, etc.)
        await this.handleFileDrop(event, toLaneName)
        return
      }
      try {
        // Find the lanes
        const fromLane = this.currentBoard.lanes.find(l => l.name === this.draggedFromLane)
        const toLane = this.currentBoard.lanes.find(l => l.name === toLaneName)
        if (!fromLane || !toLane) {
          return
        }
        // Find the note index
        const noteIndex = fromLane.notes.findIndex(n => n.sepia_id === this.draggedNote.sepia_id)
        if (noteIndex === -1) {
          return
        }
        const note = fromLane.notes[noteIndex]

        // Calculate the target index
        const insertIndex = this.draggedToIndex !== null ? this.draggedToIndex : toLane.notes.length

        // Check if the note is being dropped in the same position
        if (this.draggedFromLane === toLaneName) {
          // Adjust insert index if removing the note would affect the position
          const adjustedInsertIndex = insertIndex > noteIndex ? insertIndex - 1 : insertIndex
          if (noteIndex === adjustedInsertIndex) {
            // Dropped in the same position, do nothing
            this.draggedNote = null
            this.draggedFromLane = null
            this.draggedFromIndex = null
            this.draggedToIndex = null
            return
          }
        }

        // If moving within the same lane
        if (this.draggedFromLane === toLaneName) {
          // Remove from old position
          fromLane.notes.splice(noteIndex, 1)
          // Insert at new position
          fromLane.notes.splice(insertIndex, 0, note)
          this.draggedToIndex = null
        } else {
          // Remove from old lane
          fromLane.notes.splice(noteIndex, 1)
          // Insert at the correct position in the new lane
          toLane.notes.splice(insertIndex, 0, note)
        }
        // Save the changes using the API
        const url = `/boards/${encodeURIComponent(this.currentBoardName)}/note/${note.sepia_id}`
        const body = JSON.stringify({
          note,
          lane_name: toLaneName,
          position: this.draggedToIndex !== null ? this.draggedToIndex : toLane.notes.length - 1
        })
        console.log('Moving note:', { url, body: body.substring(0, 200) + '...' })

        const response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('API Error:', response.status, errorText)
          throw new Error(`Failed to move/reorder note: ${response.status} ${errorText}`)
        }

        this.draggedNote = null
        this.draggedFromLane = null
        this.draggedFromIndex = null
        this.draggedToIndex = null

        // Add success animation to the dropped note
        this.$nextTick(() => {
          const noteElement = document.querySelector(`[data-note-id="${note.sepia_id}"]`)
          if (noteElement) {
            noteElement.classList.add('drop-success')
            setTimeout(() => {
              noteElement.classList.remove('drop-success')
            }, 500)
          }
        })
      } catch (error) {
        console.error('Error handling drop:', error)
        await this.showAlert('Error', 'Failed to move note. Please try again.')
      }
    },

    // Handle file drops (images, etc.)
    async handleFileDrop (event, laneName) {
      const files = event.dataTransfer?.files
      if (!files || files.length === 0) return

      for (const file of files) {
        if (file.type.startsWith('image/')) {
          await this.createNoteWithImage(file, laneName)
        }
      }
    },

    // Handle paste events
    async handlePaste (event, laneName) {
      event.preventDefault()

      const text = event.clipboardData?.getData('text/plain')
      const files = event.clipboardData?.files

      if (files && files.length > 0) {
        // Handle pasted images
        for (const file of files) {
          if (file.type.startsWith('image/')) {
            await this.createNoteWithImage(file, laneName)
          }
        }
      } else if (text && text.trim()) {
        // Handle pasted text
        await this.createNoteWithText(text.trim(), laneName)
      }
    },

    // Create a note with an image attachment
    async createNoteWithImage (file, laneName) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('lane_name', laneName)
      formData.append('note_title', file.name.replace(/\.[^/.]+$/, '')) // Remove extension

      try {
        const response = await fetch(`/boards/${encodeURIComponent(this.currentBoardName)}/note`, {
          method: 'POST',
          body: formData
        })

        if (!response.ok) throw new Error('Failed to create note with image')

        await this.loadBoard(this.currentBoardName)
        this.showSuccess('Image note created successfully')
      } catch (error) {
        console.error('Error creating image note:', error)
        this.showError('Failed to create image note')
      }
    },

    // Create a note with text content
    async createNoteWithText (text, laneName) {
      try {
        const response = await fetch(`/boards/${encodeURIComponent(this.currentBoardName)}/note`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lane_name: laneName,
            note: {
              title: text.length > 50 ? text.substring(0, 47) + '...' : text,
              content: text,
              tags: []
            }
          })
        })

        if (!response.ok) throw new Error('Failed to create note')

        await this.loadBoard(this.currentBoardName)
        this.showSuccess('Note created successfully')
      } catch (error) {
        console.error('Error creating note:', error)
        this.showError('Failed to create note')
      }
    },

    // Handle file drops on individual notes (for attachments)
    async handleNoteDrop (event, note, laneName) {
      event.preventDefault()
      event.stopPropagation()

      // First check if this is a note being dragged (not a file)
      if (this.draggedNote) {
        // This is a note being dropped on another note
        // Find the target position (replace the target note)
        const targetLane = this.currentBoard.lanes.find(l => l.name === laneName)
        if (targetLane) {
          const targetIndex = targetLane.notes.findIndex(n => n.sepia_id === note.sepia_id)
          if (targetIndex !== -1) {
            this.draggedToIndex = targetIndex
            // Delegate to the main handleDrop function
            await this.handleDrop(event, laneName)
          }
        }
        return
      }

      // Handle file drops
      const files = event.dataTransfer?.files
      if (!files || files.length === 0) return

      for (const file of files) {
        if (file.type.startsWith('image/')) {
          await this.addAttachmentToNote(note, file)
        }
      }
    },

    // Add attachment to existing note
    async addAttachmentToNote (note, file) {
      const formData = new FormData()
      formData.append('file', file)

      try {
        const response = await fetch(`/boards/${encodeURIComponent(this.currentBoardName)}/note/${encodeURIComponent(note.sepia_id)}/attachment`, {
          method: 'POST',
          body: formData
        })

        if (!response.ok) throw new Error('Failed to add attachment')

        await this.loadBoard(this.currentBoardName)
        this.showSuccess('Image added to note successfully')
      } catch (error) {
        console.error('Error adding attachment:', error)
        this.showError('Failed to add image to note')
      }
    },

    // Lane Drag and Drop Handlers
    handleLaneDragStart (event, lane) {
      this.draggedLane = lane
      this.draggedLaneIndex = this.currentBoard.lanes.indexOf(lane)
      event.target.classList.add('dragging')
      event.dataTransfer.effectAllowed = 'move'
    },

    handleLaneDragEnd (event) {
      event.target.classList.remove('dragging')
      // Remove any drop indicators
      document.querySelectorAll('.lane-drop-indicator').forEach(el => el.remove())
      this.draggedLane = null
      this.draggedLaneIndex = null
    },

    handleLaneDragOver (event) {
      event.preventDefault()
      // Only show lane drop indicator if we're dragging a lane, not a note
      if (!this.draggedLane) {
        return
      }
      event.dataTransfer.dropEffect = 'move'

      // Remove any existing drop indicators
      document.querySelectorAll('.lane-drop-indicator').forEach(el => el.remove())

      // Always show indicator at the top (insert before)
      const indicator = document.createElement('div')
      indicator.className = 'lane-drop-indicator'
      indicator.style.position = 'absolute'
      indicator.style.height = '2px'
      indicator.style.backgroundColor = 'var(--pico-primary)'
      indicator.style.width = '100%'
      indicator.style.left = '0'
      indicator.style.top = '0'
      indicator.style.zIndex = '1000'

      event.currentTarget.style.position = 'relative'
      event.currentTarget.appendChild(indicator)
    },

    async handleLaneDrop (event) {
      event.preventDefault()
      if (!this.draggedLane) return

      // Remove any drop indicators
      document.querySelectorAll('.lane-drop-indicator').forEach(el => el.remove())

      const lanes = this.currentBoard.lanes
      const targetLane = event.currentTarget
      const allLanes = Array.from(targetLane.parentNode.children)
      const targetIndex = allLanes.indexOf(targetLane)

      // The drop indicator shows exactly where the lane should go
      // When indicator shows on lane at targetIndex, move dragged lane there
      let targetPosition = targetIndex
      if (targetIndex <= this.draggedLaneIndex) {
        targetPosition -= 1
      }

      // Only return if trying to drop on self
      if (this.draggedLaneIndex === targetPosition) return

      try {
        // Insert at target position first
        lanes.splice(targetPosition, 0, this.draggedLane)

        // Remove from old position (adjusting for the insertion)
        const oldPosition = targetPosition <= this.draggedLaneIndex ? this.draggedLaneIndex + 1 : this.draggedLaneIndex
        lanes.splice(oldPosition, 1)

        // Update lane positions via API
        for (let i = 0; i < lanes.length; i++) {
          const lane = lanes[i]
          const response = await fetch(`/boards/${encodeURIComponent(this.currentBoardName)}/lane/${encodeURIComponent(lane.name)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lane: { name: lane.name, notes: [] },
              position: i
            })
          })

          if (!response.ok) {
            throw new Error(`Failed to update lane position for ${lane.name}`)
          }
        }

        // Force reactivity
        this.currentBoard = { ...this.currentBoard }
        console.log('Lane order updated successfully')
      } catch (error) {
        console.error('Error moving lane:', error)
        await this.showAlert('Error', 'Failed to move lane. Please try again.')
        // Reload the board to restore correct order
        await this.loadBoard(this.currentBoardName)
      }
    },

    // Convert markdown to HTML
    markdownToHtml (markdown) {
      if (!markdown) return ''
      try {
        return marked.parse(markdown)
      } catch (error) {
        console.error('Error parsing markdown:', error)
        return markdown
      }
    },

    // Apply syntax highlighting to an element
    applyHighlighting (element) {
      if (!element) return
      element.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block)
      })
    },

    // Handle file drop for attachments
    async handleAttachmentFileDrop (event) {
      event.preventDefault()
      event.currentTarget.style.borderColor = 'var(--pico-border-color)'

      const files = Array.from(event.dataTransfer.files)
      await this.uploadAttachments(files)
    },

    // Handle file selection for attachments
    async handleFileSelect (event) {
      const files = Array.from(event.target.files)
      await this.uploadAttachments(files)
      // Reset the input
      event.target.value = ''
    },

    // Helper function to find and update a note in the current board
    findAndUpdateNoteInBoard (noteId, updateFn) {
      if (!this.currentBoard || !this.currentBoard.lanes) return null

      for (const lane of this.currentBoard.lanes) {
        const noteIndex = lane.notes.findIndex(n => n.sepia_id === noteId)
        if (noteIndex !== -1) {
          const note = lane.notes[noteIndex]
          // Apply the update function
          updateFn(note, lane, noteIndex)
          return note
        }
      }
      return null
    },

    // Delete attachment (for the modal)
    async deleteAttachment (filename) {
      const confirmed = await this.showAlert(
        'Delete Attachment',
        `Are you sure you want to delete "${this.getAttachmentFilename(filename)}"?`,
        'Delete'
      )
      if (!confirmed) {
        return
      }

      try {
        // Use attachmentNote first, then fallback to noteEdit for note ID
        const noteId = this.attachmentNote?.sepia_id || this.noteEdit?.sepia_id
        if (!noteId) {
          throw new Error('No note ID available')
        }

        const response = await fetch(`/n/${noteId}/${filename}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          throw new Error('Failed to delete attachment')
        }

        // Remove from attachments array in noteEdit
        if (this.noteEdit.attachments) {
          this.noteEdit.attachments = this.noteEdit.attachments.filter(att => att !== filename)
        }

        // Also remove from attachmentNote if it exists
        if (this.attachmentNote && this.attachmentNote.attachments) {
          this.attachmentNote.attachments = this.attachmentNote.attachments.filter(att => att !== filename)
        }

        // Update the note in the board to reflect the change immediately
        this.findAndUpdateNoteInBoard(noteId, (note) => {
          if (note.attachments) {
            note.attachments = note.attachments.filter(att => att !== filename)
          }
        })

        this.showSuccess('Attachment deleted successfully')
      } catch (error) {
        console.error('Error deleting attachment:', error)
        this.showError('Failed to delete attachment')
      }
    },

    // Upload attachments
    async uploadAttachments (files) {
      // Use attachmentNote first, then fallback to persistent editing note ID, then noteEdit
      console.log('attachmentNote:', this.attachmentNote)
      console.log('currentEditingNoteId:', this.currentEditingNoteId)
      console.log('noteEdit:', this.noteEdit)
      console.log('noteEdit.sepia_id:', this.noteEdit?.sepia_id)

      const noteId = this.attachmentNote?.sepia_id || this.currentEditingNoteId || this.noteEdit?.sepia_id

      console.log('uploadAttachments called, noteId:', noteId)

      if (!noteId) {
        await this.showAlert('No Note Being Edited', 'Please edit a note first before adding attachments. Click the Edit button on a note, then you can add attachments.')
        return
      }

      for (const file of files) {
        // Check file size (10MB limit)
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (file.size > maxSize) {
          await this.showAlert('File Too Large', `File "${file.name}" is too large. Maximum size is 10MB.`)
          continue
        }

        try {
          const formData = new FormData()
          formData.append('file', file)

          const response = await fetch(`/n/${noteId}/attach`, {
            method: 'POST',
            body: formData
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error('Server response:', response.status, errorText)
            throw new Error(`Failed to upload attachment: ${errorText}`)
          }

          const result = await response.json()

          // Add to attachments array if not already there
          if (!this.noteEdit.attachments) {
            this.noteEdit.attachments = []
          }
          if (!this.noteEdit.attachments.includes(result.filename)) {
            this.noteEdit.attachments.push(result.filename)
            console.log('Added attachment to noteEdit:', result.filename)
            console.log('noteEdit.attachments now:', this.noteEdit.attachments)
          }

          // Also add to attachmentNote if it exists
          if (this.attachmentNote) {
            if (!this.attachmentNote.attachments) {
              this.attachmentNote.attachments = []
            }
            if (!this.attachmentNote.attachments.includes(result.filename)) {
              this.attachmentNote.attachments.push(result.filename)
              console.log('Added attachment to attachmentNote:', result.filename)
              console.log('attachmentNote.attachments now:', this.attachmentNote.attachments)
            }
          }

          // Update the note in the board to reflect the change immediately
          if (noteId) {
            this.findAndUpdateNoteInBoard(noteId, (note) => {
              if (!note.attachments) {
                note.attachments = []
              }
              if (!note.attachments.includes(result.filename)) {
                note.attachments.push(result.filename)
              }
            })
          }

          this.showSuccess(`File "${file.name}" uploaded successfully`)
        } catch (error) {
          console.error('Error uploading attachment:', error)
          this.showError(`Failed to upload "${file.name}"`)
        }
      }
    },

    // Remove an attachment
    async removeAttachment (filename) {
      const confirmed = await this.showAlert(
        'Remove Attachment',
        `Are you sure you want to remove "${this.getAttachmentFilename(filename)}"?`,
        'Remove'
      )
      if (!confirmed) {
        return
      }

      try {
        // Use attachmentNote first, then fallback to noteEdit for note ID
        const noteId = this.attachmentNote?.sepia_id || this.noteEdit?.sepia_id
        if (!noteId) {
          throw new Error('No note ID available')
        }

        const response = await fetch(`/n/${noteId}/${filename}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          throw new Error('Failed to remove attachment')
        }

        // Remove from attachments array in noteEdit
        if (this.noteEdit.attachments) {
          this.noteEdit.attachments = this.noteEdit.attachments.filter(att => att !== filename)
        }

        // Also remove from attachmentNote if it exists
        if (this.attachmentNote && this.attachmentNote.attachments) {
          this.attachmentNote.attachments = this.attachmentNote.attachments.filter(att => att !== filename)
        }
      } catch (error) {
        console.error('Error removing attachment:', error)
        await this.showAlert('Error', 'Failed to remove attachment. Please try again.')
      }
    },

    // Extract original filename from UUID-prefixed filename
    getAttachmentFilename (attachment) {
      // Remove UUID prefix if present
      const match = attachment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_(.*)$/)
      return match ? match[1] : attachment
    },

    // Delete attachment from expanded note view
    async deleteAttachmentFromNote (note, attachment) {
      const confirmed = await this.showAlert(
        'Delete Attachment',
        `Are you sure you want to delete "${this.getAttachmentFilename(attachment)}"?`,
        'Delete'
      )
      if (!confirmed) {
        return
      }

      try {
        const response = await fetch(`/n/${note.sepia_id}/${attachment}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          throw new Error('Failed to delete attachment')
        }

        // Remove attachment from note's attachments array
        note.attachments = note.attachments.filter(a => a !== attachment)

        // Force update
        this.currentBoard = { ...this.currentBoard }

        // If we're editing this note, update the edit copy too
        if (this.editingNote && this.noteEdit.sepia_id === note.sepia_id) {
          this.noteEdit.attachments = note.attachments
        }
        this.showSuccess('Attachment deleted successfully')
      } catch (error) {
        console.error('Error deleting attachment:', error)
        this.showError('Failed to delete attachment')
      }
    },

    // Toggle note expansion
    async toggleNoteExpansion (note) {
      // Toggle the expanded state
      const newExpandedState = !note.expanded

      try {
        // Create the request body
        const requestBody = {
          note: {
            title: note.title,
            tags: note.tags || [],
            content: note.content || '',
            expanded: newExpandedState,
            public: note.public || false,
            start_date: note.start_date || null,
            end_date: note.end_date || null,
            priority: note.priority || null
          }
        }

        // Save the expanded state to backend
        const response = await fetch(`/boards/${encodeURIComponent(this.currentBoardName)}/note/${note.sepia_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
          throw new Error('Failed to update note expansion state')
        }

        // Update local state only after successful save
        note.expanded = newExpandedState
        // Force update
        this.currentBoard = { ...this.currentBoard }

        // Apply highlighting after expanding
        if (newExpandedState) {
          // Use setTimeout to wait for DOM update
          setTimeout(() => {
            const noteElement = document.querySelector(`[data-note-id="${note.sepia_id}"]`)
            if (noteElement) {
              const contentElement = noteElement.querySelector('.note-content')
              this.applyHighlighting(contentElement)
            }
          }, 0)
        }
      } catch (error) {
        console.error('Error updating note expansion state:', error)
        // Revert the change if save failed
        note.expanded = !newExpandedState
        this.currentBoard = { ...this.currentBoard }
      }
    },

    // Board scrolling functionality
    updateScrollButtons () {
      if (!this.$refs.kanbanBoard) {
        // console.log('No kanban board reference found')
        return
      }

      const board = this.$refs.kanbanBoard
      const hasOverflow = board.scrollWidth > board.clientWidth
      const canScrollLeft = board.scrollLeft > 0
      const canScrollRight = board.scrollLeft < (board.scrollWidth - board.clientWidth - 1)

      // Only show right button if there's overflow and we haven't reached the end
      this.canScrollLeft = hasOverflow && canScrollLeft
      this.canScrollRight = hasOverflow && canScrollRight

      // console.log('updateScrollButtons:', {
      //   scrollLeft: board.scrollLeft,
      //   scrollWidth: board.scrollWidth,
      //   clientWidth: board.clientWidth,
      //   hasOverflow,
      //   canScrollLeft,
      //   canScrollRight,
      //   overflow: board.scrollWidth - board.clientWidth
      // })
    },

    scrollBoard (direction) {
      if (!this.$refs.kanbanBoard) return

      const board = this.$refs.kanbanBoard
      const scrollAmount = board.clientWidth * 0.8 // Scroll 80% of visible width

      if (direction === 'left') {
        board.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
      } else {
        board.scrollBy({ left: scrollAmount, behavior: 'smooth' })
      }
    },

    // Initialize scroll watchers
    initScrollWatcher () {
      this.$nextTick(() => {
        if (this.$refs.kanbanBoard) {
          // Initial update after a short delay to ensure DOM is ready
          setTimeout(() => {
            this.updateScrollButtons()
          }, 100)

          // Add scroll event listener
          this.$refs.kanbanBoard.addEventListener('scroll', () => {
            this.updateScrollButtons()
          })

          // Add resize observer
          if (typeof window.ResizeObserver !== 'undefined') {
            const resizeObserver = new ResizeObserver(() => {
              this.updateScrollButtons()
            })
            resizeObserver.observe(this.$refs.kanbanBoard)
          }

          // Also update on window resize
          window.addEventListener('resize', () => {
            this.updateScrollButtons()
          })

          // Check periodically for the first few seconds
          let checks = 0
          const interval = setInterval(() => {
            this.updateScrollButtons()
            checks++
            if (checks > 10) clearInterval(interval)
          }, 500)
        }
      })
    },

    // Modal methods
    showAlert (title, message, buttonText = 'OK') {
      return new Promise((resolve) => {
        this.modalType = 'alert'
        this.modalTitle = title
        this.modalMessage = message
        this.modalConfirmText = buttonText
        // Set cancel text for confirmation dialogs (when buttonText is not 'OK')
        this.modalCancelText = buttonText === 'OK' ? '' : 'Cancel'
        this.modalResolve = resolve
        this.showModal = true
      })
    },

    showPrompt (title, message, defaultValue = '', confirmText = 'OK', cancelText = 'Cancel') {
      return new Promise((resolve) => {
        this.modalType = 'prompt'
        this.modalTitle = title
        this.modalMessage = message
        this.modalInput = defaultValue
        this.modalConfirmText = confirmText
        this.modalCancelText = cancelText
        this.modalResolve = resolve
        this.showModal = true

        // Focus input after modal is shown
        this.$nextTick(() => {
          if (this.$refs.modalInputRef) {
            this.$refs.modalInputRef.focus()
            this.$refs.modalInputRef.select()
          }
        })
      })
    },

    confirmModal () {
      if (this.modalResolve) {
        if (this.modalType === 'prompt') {
          this.modalResolve(this.modalInput)
        } else {
          this.modalResolve(true)
        }
      }
      this.closeModal()
    },

    closeModal () {
      this.showModal = false
      this.modalType = ''
      this.modalTitle = ''
      this.modalMessage = ''
      this.modalInput = ''
      this.modalResolve = null
    },

    // Helper methods to replace prompt and alert
    async prompt (message, defaultValue = '') {
      return this.showPrompt('Input Required', message, defaultValue)
    },

    async alert (message) {
      await this.showAlert('Information', message)
    },

    async confirm (message) {
      return this.showAlert('Confirm', message, 'OK')
    },

    // Update note public status immediately
    async updateNotePublic (noteId, isPublic) {
      try {
        // Find the note in the current board
        let note = null
        let laneName = null

        this.currentBoard.lanes.forEach(lane => {
          const found = lane.notes.find(n => n.sepia_id === noteId)
          if (found) {
            note = found
            laneName = lane.name
          }
        })

        if (!note) return

        // Update the note locally
        note.public = isPublic

        // If we're editing this note, update the edit copy too
        if (this.noteEdit && this.noteEdit.sepia_id === noteId) {
          this.noteEdit.public = isPublic
        }

        // Save to backend
        const url = `/boards/${encodeURIComponent(this.currentBoardName)}/note/${noteId}`
        const response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            note: {
              title: note.title,
              tags: note.tags,
              content: note.content,
              expanded: note.expanded,
              public: isPublic,
              start_date: note.start_date,
              end_date: note.end_date,
              priority: note.priority
            },
            lane_name: laneName
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Failed to update note public status:', errorText)
          // Revert the change on error
          note.public = !isPublic
          if (this.noteEdit && this.noteEdit.sepia_id === noteId) {
            this.noteEdit.public = !isPublic
          }
          window.dispatchEvent(new CustomEvent('show-toast', {
            detail: { type: 'error', message: 'Failed to update note sharing' }
          }))
        } else {
          if (isPublic) {
            window.dispatchEvent(new CustomEvent('show-toast', {
              detail: { type: 'info', message: 'Note is now public!' }
            }))
          } else {
            window.dispatchEvent(new CustomEvent('show-toast', {
              detail: { type: 'info', message: 'Note is now private' }
            }))
          }
        }
      } catch (error) {
        console.error('Error updating note public status:', error)
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { type: 'error', message: 'Failed to update note sharing' }
        }))
      }
    },

    // Copy permalink to clipboard
    async copyPermalink (noteId) {
      try {
        const url = `${window.location.origin}/n/${noteId}`
        await navigator.clipboard.writeText(url)
        // Dispatch event for toast
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { type: 'success', message: 'Link copied to clipboard!' }
        }))
      } catch (err) {
        console.error('Failed to copy permalink: ', err)
        // Fallback for browsers that don't support clipboard API
        try {
          const url = `${window.location.origin}/n/${noteId}`
          const textArea = document.createElement('textarea')
          textArea.value = url
          textArea.style.position = 'fixed'
          textArea.style.opacity = '0'
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()
          document.execCommand('copy')
          document.body.removeChild(textArea)
          // Dispatch event for toast
          window.dispatchEvent(new CustomEvent('show-toast', {
            detail: { type: 'success', message: 'Link copied to clipboard!' }
          }))
        } catch (fallbackErr) {
          console.error('Fallback copy failed: ', fallbackErr)
          // Dispatch event for toast
          window.dispatchEvent(new CustomEvent('show-toast', {
            detail: { type: 'error', message: 'Failed to copy link' }
          }))
        }
      }
    }

  }
}
