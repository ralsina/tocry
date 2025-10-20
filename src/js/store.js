// Alpine.js store for ToCry reactive app
/* global toastui, history, marked, hljs, localStorage, sessionStorage, ResizeObserver */

import ToCryWebSocketClient from './websocket-client.js'
import BoardApiService from './services/api.js'

// Create a global WebSocket instance for the app
const webSocketClient = new ToCryWebSocketClient()

// Utility function to generate a unique client ID
const generateClientId = () => {
  // Check if we already have a client ID in session storage (persists across page reloads)
  let clientId = sessionStorage.getItem('tocryClientId')
  if (clientId) {
    return clientId
  }

  // Generate a new client ID with multiple sources of entropy to avoid collisions
  const randomPart = Math.random().toString(36).substr(2, 12)
  const timestamp = Date.now()
  const performanceNow = performance.now()
  const cryptoRandom = crypto.getRandomValues(new Uint32Array(1))[0].toString(36)

  clientId = 'client_' + randomPart + '_' + timestamp + '_' + cryptoRandom + '_' + Math.floor(performanceNow)

  // Store in session storage to persist across page reloads and store recreations
  sessionStorage.setItem('tocryClientId', clientId)

  return clientId
}
// BoardApiService is now imported from './services/api.js'

// eslint-disable-next-line no-unused-vars
function createToCryStore () {
  return {
    // Client identification for echo prevention
    clientId: generateClientId(),

    // State
    boards: [],
    currentBoardName: '',
    currentBoard: null,
    loading: true,
    loadingBoardFromUrl: false,
    error: null,
    boardNotFound: false,

    // Debouncing state
    loadingBoardPromise: null,
    loadingBoardName: null,

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

    // WebSocket State
    webSocketConnected: false,

    // Note Title Editing Lane Context
    editingNoteTitleLane: null, // Store lane name for context

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
    modalType: '', // 'alert', 'prompt', or 'public-warning'
    modalTitle: '',
    modalMessage: '',
    modalInput: '',
    modalConfirmText: 'OK',
    modalCancelText: 'Cancel',
    modalResolve: null,

    // Public board controls
    showingPublicWarning: false,
    publicWarningType: 'make-public', // 'make-public' or 'make-private'

    // Theme and color scheme
    isDarkMode: false,
    showColorSelector: false,
    colorSchemes: {
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

    // Base Path Detection and Resolution for Reverse Proxy Support
    getBasePath () {
      // Use the base path detected by the API client adapter for consistency
      if (window.tocryBasePath !== undefined) {
        return window.tocryBasePath || '/'
      }

      // Fallback detection if API client hasn't run yet
      if (this._cachedBasePath) {
        return this._cachedBasePath
      }

      const pathname = window.location.pathname
      // Find the first occurrence of '/b/' which indicates board routing
      const boardIndex = pathname.indexOf('/b/')

      let basePath
      if (boardIndex > 0) {
        basePath = pathname.substring(0, boardIndex)
      } else {
        // If not on a board page, use the full path minus the last segment
        basePath = pathname.replace(/\/[^/]*$/, '')
      }

      // Ensure basePath doesn't end with slash and isn't empty
      basePath = basePath.replace(/\/$/, '')
      if (basePath === '') {
        basePath = '/'
      }

      // Cache the result and sync with API client
      this._cachedBasePath = basePath
      window.tocryBasePath = basePath
      return basePath
    },

    resolvePath (path) {
      // Resolve a path relative to the base path
      const basePath = this.getBasePath()

      // Ensure path starts with /
      if (!path.startsWith('/')) {
        path = '/' + path
      }

      // If basePath is root, just return path
      if (basePath === '/') {
        return path
      }

      // Combine base path and relative path
      return basePath + path
    },

    getFullUrl (path) {
      // Get full URL including origin
      return window.location.origin + this.resolvePath(path)
    },

    // Clear cached base path when needed (e.g., after navigation changes)
    clearBasePathCache () {
      this._cachedBasePath = null
    },

    // Search functionality
    searchQuery: '',
    searchResults: [],

    // Computed Properties
    get currentColorScheme () {
      return this.currentBoard?.colorScheme || 'blue'
    },

    get currentColor () {
      // Compute hex color from current scheme and theme
      const scheme = this.colorSchemes[this.currentColorScheme]
      if (!scheme) return '#1d88fe'

      const currentTheme = this.isDarkMode ? 'dark' : 'light'
      const colors = scheme[currentTheme] || scheme.light
      const primaryRgb = colors['primary-rgb']

      if (!primaryRgb) return '#1d88fe'

      const rgbValues = primaryRgb.split(',').map(v => parseInt(v.trim()))
      return `#${rgbValues.map(v => v.toString(16).padStart(2, '0')).join('')}`
    },

    // Initialize
    async init () {
      // Initialize API service
      this.api = new BoardApiService(this, this.resolvePath.bind(this))

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

      // Color scheme is now handled reactively based on board data
      // No need for separate initialization

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
        await this.loadBoard(boardName, true)
      } else if (this.boards.length === 1) {
        // If there's only one board, show it by default
        console.log('Auto-loading single board:', this.boards[0])
        this.currentBoardName = this.boards[0]
        await this.loadBoard(this.boards[0], true)
      } else {
        // No board in URL and multiple or zero boards - show selection or welcome screen
        this.loading = false
      }

      // Add reactive watcher for color scheme changes
      this.$watch('currentBoard', (newBoard, oldBoard) => {
        const newScheme = newBoard?.colorScheme
        const oldScheme = oldBoard?.colorScheme
        if (newScheme && newScheme !== oldScheme) {
          // Delay color scheme application for smooth transition
          setTimeout(() => {
            this.updateColorScheme(true) // Save to backend for manual changes
          }, 500)
        }
      }, { deep: true })

      // Store initialization complete - WebSocket client will poll for availability
      this.$nextTick(() => {
        // Prevent multiple ready events
        if (window.tocryStoreReady === true) {
          return
        }

        // Set flag for easy checking
        window.tocryStoreReady = true

        console.log('[Store] Alpine store is ready - WebSocket can now connect')
      })
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
          if (this.editingNoteTags) {
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

        // Ctrl/Cmd + K: quick search or board selector (alternative to /)
        if ((e.ctrlKey || e.metaKey) && e.key === 'k' && !isEditable) {
          e.preventDefault()
          // First try to focus search input if it exists and is visible
          const searchInput = this.$refs.searchInput
          if (searchInput) {
            this.$nextTick(() => {
              searchInput.focus()
            })
          } else {
            // Otherwise focus board selector
            const selector = document.querySelector('select[x-model="currentBoardName"]')
            if (selector) {
              selector.focus()
            }
          }
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
    // Validate and normalize color scheme
    validateColorScheme (colorScheme) {
      if (!colorScheme) {
        return 'blue'
      }

      // Normalize to lowercase for comparison
      const normalized = colorScheme.toLowerCase()

      // Check if it's a valid scheme
      if (this.colorSchemes[normalized]) {
        return normalized
      }

      // Invalid scheme - log warning and return blue
      console.warn(`Invalid color scheme "${colorScheme}" - falling back to blue`)
      return 'blue'
    },

    async updateColorScheme (saveToBackend = true) {
      // Update the Pico.css stylesheet link
      const picoThemeLink = document.querySelector(
        'link[href*="pico.min.css"], link[href*="pico."][href*=".min.css"]'
      )

      if (picoThemeLink) {
        const cssFileName = `pico.${this.currentColorScheme.toLowerCase()}.min.css`
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
        }

        localStorage.setItem('colorScheme', this.currentColorScheme)

        // Save to backend only if requested and we have a current board
        if (saveToBackend && this.currentBoardName && this.currentBoardName !== '') {
          try {
            await this.api.updateBoard(this.currentBoardName, { colorScheme: this.currentColorScheme })
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
        this.boards = await this.api.getAllBoards()
        console.log('Loaded boards:', this.boards, 'Count:', this.boards.length)
        // Empty list is valid, don't set error
        this.boardNotFound = false
      } catch (error) {
        console.error('Error loading boards:', error)
        this.error = error.message
        this.showError(`Failed to load boards: ${error.message}`)
      }
    },

    // Load a specific board
    async loadBoard (boardName, scrollToInitialPosition = false) {
      if (!boardName) {
        return
      }
      const isReload = this.currentBoardName === boardName && this.currentBoard

      // Debouncing: If we're already loading this board, return the existing promise
      if (this.loadingBoardPromise && this.loadingBoardName === boardName) {
        return this.loadingBoardPromise
      }

      // Cancel any previous loading for a different board
      if (this.loadingBoardPromise && this.loadingBoardName !== boardName) {
        this.loadingBoardPromise = null
        this.loadingBoardName = null
      }

      if (!isReload) {
        this.loading = true
      }
      this.error = null
      this.boardNotFound = false
      this.loadingBoardName = boardName

      // Create the loading promise
      this.loadingBoardPromise = (async () => {
        try {
        // Use enhanced API to get complete board state in single call
          const boardData = await this.api.getBoard(boardName)
          console.log('Loaded board data:', boardData)

          // Validate color scheme early
          const validatedColorScheme = this.validateColorScheme(boardData.colorScheme)

          this.currentBoard = {
            id: boardData.id,
            name: boardData.name,
            lanes: boardData.lanes || [],
            colorScheme: validatedColorScheme,
            firstVisibleLane: boardData.firstVisibleLane || 0,
            public: boardData._public || false
          }
          console.log('Set currentBoard:', this.currentBoard)
          console.log('Board public field from API:', boardData._public)
          console.log('Current board public field after assignment:', this.currentBoard.public)

          // Apply color scheme immediately to ensure lane borders are visible (don't save to backend)
          this.updateColorScheme(false)

          this.currentBoardName = boardName
          this.boardNotFound = false

          // Update lane widths and set initial scroll position after board is loaded
          if (scrollToInitialPosition) {
            this.$nextTick(() => {
            // Update lane widths first
              this.updateLaneWidths()
              // Then set scroll position after width changes are applied
              this.$nextTick(() => {
                this.setInitialScrollPosition()
              })
            })
          } else {
          // Just update lane widths if no initial scroll needed
          // Use multiple nextTicks to ensure DOM is fully rendered after WebSocket updates
            this.$nextTick(() => {
              this.$nextTick(() => {
                this.updateLaneWidths()
              })
            })
          }

          // Color scheme changes are now handled automatically by the reactive watcher
          // Clear loadingBoardFromUrl after board is loaded
          this.loadingBoardFromUrl = false

          // Update URL without reload
          history.pushState({ board: boardName }, '', this.resolvePath(`/b/${boardName}`))

          // Initialize scroll watcher after board is loaded
          this.initScrollWatcher()

          // Initialize WebSocket connection for real-time updates
          this.initWebSocket(boardName)
        } catch (error) {
          console.error('Error loading board:', error)
          if (error.message.includes('not found') || error.message.includes('404')) {
            this.error = `Board '${boardName}' not found. It may have been deleted or you may not have access to it.`
            this.boardNotFound = true
          } else {
            this.error = error.message
            this.showError(`Failed to load board: ${error.message}`)
          }
        } finally {
          this.loading = false
          this.loadingBoardPromise = null
          this.loadingBoardName = null
        }
      })()

      return this.loadingBoardPromise
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
        // Use optimistic updates for better UX
        const optimisticLane = { name: laneName, notes: [] }

        // Optimistically add lane to local state
        this.currentBoard.lanes.push(optimisticLane)
        this.showInfo(`Adding lane "${laneName}"...`)

        // Use state-based API to update the complete board
        await this.api.updateBoardLanes(this.currentBoardName, this.currentBoard.lanes)
        this.showSuccess(`Lane "${laneName}" added successfully.`)
      } catch (error) {
        // Revert optimistic update on error
        this.currentBoard.lanes.pop() // Remove the optimistic lane
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
        await this.api.createBoard({ name })
        await this.loadBoards()
        this.currentBoardName = name
        await this.loadBoard(name, true)
      } catch (error) {
        console.error('Error creating board:', error)
        this.error = error.message
      }
    },

    // Rename a board
    async renameBoard (oldName, newName) {
      try {
        await this.api.updateBoard(oldName, { newName })
        await this.loadBoards()
        this.currentBoardName = newName
        await this.loadBoard(newName)
        // Update URL
        history.pushState({ board: newName }, '', this.resolvePath(`/b/${newName}`))
      } catch (error) {
        console.error('Error renaming board:', error)
        throw error
      }
    },
    // Share a board
    async shareBoard (boardName, toUserEmail) {
      try {
        return await this.api.shareBoard(boardName, toUserEmail)
      } catch (error) {
        console.error('Error sharing board:', error)
        throw error
      }
    },
    // Delete a board
    async deleteBoard (boardName) {
      try {
        await this.api.deleteBoard(boardName)
        await this.loadBoards()
        // Load first available board or clear current board
        if (this.boards.length > 0) {
          this.currentBoardName = this.boards[0]
          await this.loadBoard(this.boards[0])
          history.pushState({ board: this.boards[0] }, '', this.resolvePath(`/b/${this.boards[0]}`))
        } else {
          this.currentBoard = null
          this.currentBoardName = ''
          history.pushState({}, '', this.resolvePath('/'))
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
        // Use optimistic updates for better UX
        const optimisticLane = { name: laneName, notes: [] }

        // Optimistically add lane to local state
        this.currentBoard.lanes.push(optimisticLane)
        this.showInfo(`Adding lane "${laneName}"...`)

        // Use state-based API to update the complete board
        await this.api.updateBoardLanes(boardName, this.currentBoard.lanes)
        this.showSuccess('Lane added successfully')
      } catch (error) {
        // Revert optimistic update on error
        this.currentBoard.lanes.pop() // Remove the optimistic lane
        console.error('Error adding lane:', error)
        this.error = error.message
        this.showError('Failed to add lane')
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

      // Declare variables in the outer scope
      let laneIndex = -1
      let deletedLane = null

      try {
        // Use optimistic updates for better UX
        laneIndex = this.currentBoard.lanes.findIndex(l => l.name === laneName)

        if (laneIndex === -1) {
          this.showError('Lane not found')
          return
        }

        deletedLane = this.currentBoard.lanes[laneIndex]

        // Optimistically remove lane from local state
        this.currentBoard.lanes.splice(laneIndex, 1)
        this.showInfo(`Deleting lane "${laneName}"...`)

        // Use state-based API to update the complete board
        await this.api.updateBoardLanes(this.currentBoardName, this.currentBoard.lanes)
        this.showSuccess('Lane deleted successfully')
      } catch (error) {
        // Revert optimistic update on error
        if (laneIndex !== -1 && deletedLane) {
          this.currentBoard.lanes.splice(laneIndex, 0, deletedLane)
        }
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

      // Declare variables in the outer scope
      let laneIndex = -1
      let originalName = null

      try {
        // Use optimistic updates for better UX
        laneIndex = this.currentBoard.lanes.findIndex(l => l.name === this.editingLane)
        originalName = laneIndex !== -1 ? this.currentBoard.lanes[laneIndex].name : null

        if (laneIndex === -1) {
          this.showError('Lane not found')
          this.cancelLaneRename()
          return
        }

        // Optimistically update lane name in local state
        this.currentBoard.lanes[laneIndex].name = newName
        this.showInfo(`Renaming lane to "${newName}"...`)

        // Use state-based API to update the complete board
        await this.api.updateBoardLanes(this.currentBoardName, this.currentBoard.lanes)
        this.showSuccess(`Lane renamed to "${newName}"`)
      } catch (error) {
        // Revert optimistic update on error
        if (originalName && laneIndex !== -1) {
          this.currentBoard.lanes[laneIndex].name = originalName
        }
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
      const note = lane?.notes.find(n => n.sepiaId === this.editingNoteTitle)

      if (!note || note.title === newTitle) {
        this.cancelNoteTitleEdit()
        return
      }

      // Declare variable in the outer scope
      let originalTitle = null

      try {
        // Use optimistic updates for better UX
        originalTitle = note.title
        note.title = newTitle
        this.showInfo('Updating note title...')

        // Use API service to update the note
        await this.api.updateNote(this.currentBoardName, this.editingNoteTitle, {
          title: newTitle,
          tags: note.tags || [],
          content: note.content || '',
          expanded: note.expanded,
          public: note.public || false,
          start_date: note.startDate || null,
          end_date: note.endDate || null,
          priority: note.priority || null,
          attachments: note.attachments || []
        }, {
          laneName: this.editingNoteTitleLane
        })

        this.showSuccess('Note title updated')
      } catch (error) {
        // Revert optimistic update on error
        if (originalTitle !== null) {
          note.title = originalTitle
        }
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
      const note = lane?.notes.find(n => n.sepiaId === this.editingNoteTags)

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

      // Declare variable in the outer scope
      let originalTags = null

      try {
        // Use optimistic updates for better UX
        originalTags = [...currentTags]
        note.tags = newTags
        this.showInfo('Updating note tags...')

        // Use API service to update the note - no need for separate saveBoard() call
        await this.api.updateNote(this.currentBoardName, this.editingNoteTags, {
          title: note.title,
          tags: newTags,
          content: note.content || '',
          expanded: note.expanded,
          public: note.public || false,
          start_date: note.startDate || null,
          end_date: note.endDate || null,
          priority: note.priority || null,
          attachments: note.attachments || []
        }, {
          laneName: this.editingNoteTagsLane
        })

        this.showSuccess('Note tags updated')
      } catch (error) {
        // Revert optimistic update on error
        if (originalTags !== null) {
          note.tags = originalTags
        }
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

    // Generic function to update note tags
    async updateNoteTags (noteId, laneName, newTags) {
      // Declare variable in the outer scope
      let originalTags = null

      try {
        const lane = this.currentBoard.lanes.find(l => l.name === laneName)
        const note = lane?.notes.find(n => n.sepiaId === noteId)

        if (!note) return

        // Use optimistic updates for better UX
        originalTags = [...(note.tags || [])]
        note.tags = newTags
        this.showInfo('Updating tag...')

        // Use API service to update the note - no need for separate saveBoard() call
        await this.api.updateNote(this.currentBoardName, noteId, {
          title: note.title,
          tags: newTags,
          content: note.content || '',
          expanded: note.expanded,
          public: note.public || false,
          start_date: note.startDate || null,
          end_date: note.endDate || null,
          priority: note.priority || null,
          attachments: note.attachments || []
        }, {
          laneName
        })

        this.showSuccess('Tag updated')
      } catch (error) {
        // Revert optimistic update on error - need to find note again as it might have moved
        const lane = this.currentBoard.lanes.find(l => l.name === laneName)
        const note = lane?.notes.find(n => n.sepiaId === noteId)
        if (note && originalTags !== null) {
          note.tags = originalTags
        }
        console.error('Error updating note tags:', error)
        this.showError('Failed to update note tags')
      }
    },

    // Add a new note
    async addNote (laneName) {
      const title = await this.prompt('Enter note title:')
      if (!title) return

      // Declare variable in the outer scope
      let originalNotes = null

      try {
        // Create optimistic note for better UX
        const newNote = {
          sepia_id: 'temp-' + Date.now(), // Temporary ID
          title,
          content: '',
          tags: [],
          expanded: false,
          public: false,
          attachments: [],
          start_date: null,
          end_date: null,
          priority: null
        }

        // Find the lane and optimistically add the note
        const lane = this.currentBoard.lanes.find(l => l.name === laneName)
        if (!lane) {
          this.showError('Lane not found')
          return
        }

        originalNotes = [...lane.notes]
        lane.notes.push(newNote)
        this.showInfo('Adding note...')

        // Use API service to create the note
        const createdNote = await this.api.createNote(this.currentBoardName, laneName, {
          title,
          content: '',
          tags: [],
          expanded: false,
          public: false,
          attachments: [],
          start_date: null,
          end_date: null,
          priority: null
        })

        // Replace the optimistic note with the real one
        const noteIndex = lane.notes.findIndex(n => n.sepiaId === newNote.sepiaId)
        if (noteIndex !== -1) {
          lane.notes[noteIndex] = createdNote.note
        }

        this.showSuccess('Note added successfully')
      } catch (error) {
        // Revert optimistic update on error
        const lane = this.currentBoard.lanes.find(l => l.name === laneName)
        if (lane && originalNotes !== null) {
          lane.notes = originalNotes
        }
        console.error('Error adding note:', error)
        this.error = error.message
        this.showError('Failed to add note')
      }
    },

    // Edit a note
    editNote (note, laneName) {
      // Store the lane name for reference
      this.draggedFromLane = laneName

      // Show the inline modal
      this.editingNote = true
      this.noteEdit = { ...note, currentLane: laneName }
      // Store the note ID for uploads (persists even if modal is closed)
      this.currentEditingNoteId = note.sepiaId
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
                  // Upload the image using the generated API client
                  const boardName = this.currentBoardName
                  if (!boardName) {
                    throw new Error('No board selected - cannot upload image')
                  }
                  const result = await this.api.uploadAttachment(boardName, this.noteEdit.sepiaId, blob)

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

    // Prompt user to select from multiple AI response choices
    async promptUserForChoice (choices, onChoice) {
      const createChoiceModal = () => {
        // Create modal overlay
        const overlay = document.createElement('div')
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        `

        // Create modal content
        const modal = document.createElement('div')
        modal.style.cssText = `
          background: white;
          padding: 20px;
          border-radius: 8px;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        `

        // Create title
        const title = document.createElement('h3')
        title.textContent = 'Multiple responses available'
        title.style.cssText = `
          margin: 0 0 15px 0;
          color: #333;
          font-size: 18px;
        `
        modal.appendChild(title)

        // Create subtitle
        const subtitle = document.createElement('p')
        subtitle.textContent = 'Please choose which response you\'d like to use:'
        subtitle.style.cssText = `
          margin: 0 0 20px 0;
          color: var(--pico-muted-color, #666);
          font-size: 14px;
        `
        modal.appendChild(subtitle)

        // Create choice buttons
        choices.forEach((choice, index) => {
          const choiceContent = choice.message.content
          const preview = choiceContent.length > 200
            ? choiceContent.substring(0, 200) + '...'
            : choiceContent

          const choiceButton = document.createElement('button')
          choiceButton.style.cssText = `
            display: block;
            width: 100%;
            padding: 12px;
            margin-bottom: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
            text-align: left;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
          `

          choiceButton.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px; color: var(--pico-color, #333);">
              Option ${index + 1}
            </div>
            <div style="color: var(--pico-muted-color, #666); line-height: 1.4;">
              ${preview.replace(/\n/g, ' ')}
            </div>
          `

          choiceButton.addEventListener('mouseenter', () => {
            choiceButton.style.background = 'var(--pico-background-color, #f5f5f5)'
            choiceButton.style.borderColor = 'var(--pico-primary, #007bff)'
          })

          choiceButton.addEventListener('mouseleave', () => {
            choiceButton.style.background = 'var(--pico-background-color, white)'
            choiceButton.style.borderColor = 'var(--pico-border-color, #ddd)'
          })

          choiceButton.addEventListener('click', () => {
            onChoice(index)
            document.body.removeChild(overlay)
          })

          modal.appendChild(choiceButton)
        })

        // Add cancel button
        const cancelButton = document.createElement('button')
        cancelButton.textContent = 'Cancel'
        cancelButton.style.cssText = `
          padding: 8px 16px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          margin-top: 10px;
        `
        cancelButton.addEventListener('click', () => {
          document.body.removeChild(overlay)
        })
        modal.appendChild(cancelButton)

        overlay.appendChild(modal)
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            document.body.removeChild(overlay)
          }
        })

        return overlay
      }

      const modal = createChoiceModal()
      document.body.appendChild(modal)
    },

    // Show AI Modal for interacting with z.ai
    showAIModal () {
      const selection = this.editor.getSelection()
      let text = this.editor.getSelectedText(selection)
      const hasSelection = text && text.trim().length > 0

      if (!text) {
        text = this.editor.getMarkdown()
      }

      if (!text) {
        this.showError('No text to process. Please enter some text or select text to enhance.')
        return
      }

      // Store original text for comparison
      const originalText = text

      // Capture current noteEdit state to ensure we have the note data
      const currentNoteEdit = { ...this.noteEdit }

      const createAIModal = () => {
        // Create modal overlay
        const overlay = document.createElement('div')
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          padding: 20px;
          box-sizing: border-box;
        `

        // Create modal content
        const modal = document.createElement('div')
        modal.className = 'modal'
        modal.style.cssText = `
          background: var(--pico-background-color, white);
          border-radius: var(--pico-border-radius, 0.25rem);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          max-width: 800px;
          max-height: 90vh;
          width: 90%;
          display: flex;
          flex-direction: column;
        `

        // Create main content container (scrollable)
        const mainContentContainer = document.createElement('div')
        mainContentContainer.className = 'ai-main-content'
        mainContentContainer.style.cssText = `
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
          min-height: 0;
        `

        // Create title
        const title = document.createElement('h2')
        title.textContent = '🤖 AI Assistant'
        title.style.cssText = `
          margin: 0 0 20px 0;
          color: var(--pico-color, #333);
          font-size: 24px;
          font-weight: 600;
        `
        mainContentContainer.appendChild(title)

        // Create prompt section
        const promptSection = document.createElement('div')
        promptSection.style.cssText = `
          margin: 20px 0;
        `

        const promptLabel = document.createElement('h3')
        promptLabel.textContent = 'Choose an action:'
        promptLabel.style.cssText = `
          margin: 0 0 12px 0;
          font-size: 16px;
          color: var(--pico-color, #333);
        `
        promptSection.appendChild(promptLabel)

        // Predefined prompts
        const predefinedPrompts = [
          'Summarize this text',
          'Rewrite this text as an action list',
          'Make this text more professional',
          'Fix spelling and grammar',
          'Improve this text',
          'Explain this in simple terms'
        ]

        // Custom prompt input (moved to top)
        const customPromptContainer = document.createElement('div')
        customPromptContainer.style.cssText = `
          margin-top: 16px;
          display: flex;
          align-items: flex-end;
        `

        const customPrompt = document.createElement('input')
        customPrompt.type = 'text'
        customPrompt.placeholder = 'Enter your instruction...'
        customPrompt.style.cssText = `
          flex: 1;
          padding: 8px 12px;
          border: 1px solid var(--pico-border-color, #ddd);
          border-radius: 4px;
          font-family: inherit;
          font-size: 14px;
          height: 38px;
          box-sizing: border-box;
          margin: 0;
        `
        // Generate button with robot emoji
        const generateButton = document.createElement('button')
        generateButton.textContent = '🤖'
        generateButton.style.cssText = `
          padding: 8px 16px;
          background: var(--pico-primary, #007bff);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          margin-left: 8px;
          height: 38px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
        `
        generateButton.title = 'Generate AI response'

        customPromptContainer.appendChild(customPrompt)
        customPromptContainer.appendChild(generateButton)
        promptSection.appendChild(customPromptContainer)

        generateButton.addEventListener('click', () => {
          const prompt = customPrompt.value.trim()
          if (!prompt) {
            this.showError('Please enter an instruction or select a predefined action')
            return
          }
          generateWithAI(prompt, closeModal, hasSelection, selection, applyButton, refineFurtherButton, originalText)
        })

        // Add Enter key functionality to prompt input
        customPrompt.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault() // Prevent form submission
            const prompt = customPrompt.value.trim()
            if (!prompt) {
              this.showError('Please enter an instruction or select a predefined action')
              return
            }
            generateWithAI(prompt, closeModal, hasSelection, selection, applyButton, refineFurtherButton, originalText)
          }
        })

        // Create collapsible suggestions section
        const suggestionsContainer = document.createElement('div')
        suggestionsContainer.style.cssText = `
          margin-top: 16px;
        `

        // Suggestions header (collapsible)
        const suggestionsHeader = document.createElement('div')
        suggestionsHeader.style.cssText = `
          padding: 12px 16px;
          background: var(--pico-background-color, #f8f9fa);
          border-bottom: 1px solid var(--pico-border-color, #ddd);
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          user-select: none;
        `
        suggestionsHeader.innerHTML = `
          <span style="font-size: 14px; font-weight: 600; color: var(--pico-color, #333);">💡 Suggestions</span>
          <span style="font-size: 12px; color: var(--pico-muted-color, #666); transition: transform 0.2s ease;">▼</span>
        `

        // Suggestions content (collapsible)
        const suggestionsContent = document.createElement('div')
        suggestionsContent.style.cssText = `
          display: none;
          padding: 16px;
        `

        // Create suggestion buttons
        const promptButtonsContainer = document.createElement('div')
        promptButtonsContainer.style.cssText = `
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 8px;
        `

        predefinedPrompts.forEach((prompt) => {
          const button = document.createElement('button')
          button.textContent = prompt
          button.style.cssText = `
            padding: 12px 16px;
            border: 1px solid var(--pico-border-color, #ddd);
            border-radius: var(--pico-border-radius, 4px);
            background: var(--pico-background-color, white);
            color: var(--pico-color, #333);
            cursor: pointer;
            font-size: 14px;
            text-align: left;
            transition: all 0.2s ease;
            min-height: 48px;
            display: flex;
            align-items: center;
            box-sizing: border-box;
          `

          button.addEventListener('mouseenter', () => {
            button.style.background = 'var(--pico-background-color, #f5f5f5)'
            button.style.borderColor = 'var(--pico-primary, #007bff)'
          })

          button.addEventListener('mouseleave', () => {
            button.style.background = 'var(--pico-background-color, white)'
            button.style.borderColor = 'var(--pico-border-color, #ddd)'
          })

          button.addEventListener('click', () => {
            customPrompt.value = prompt
            // Auto-generate when clicking suggestion
            generateWithAI(prompt, closeModal, hasSelection, selection, applyButton, refineFurtherButton, originalText)
          })

          promptButtonsContainer.appendChild(button)
        })

        suggestionsContent.appendChild(promptButtonsContainer)
        suggestionsContainer.appendChild(suggestionsHeader)
        suggestionsContainer.appendChild(suggestionsContent)

        // Toggle collapsible behavior
        let isExpanded = false
        suggestionsHeader.addEventListener('click', () => {
          isExpanded = !isExpanded
          if (isExpanded) {
            suggestionsContent.style.display = 'block'
            suggestionsHeader.querySelector('span:last-child').textContent = '▲'
          } else {
            suggestionsContent.style.display = 'none'
            suggestionsHeader.querySelector('span:last-child').textContent = '▼'
          }
        })

        promptSection.appendChild(suggestionsContainer)

        mainContentContainer.appendChild(promptSection)

        // Results container - initialize with comparison view
        const resultsContainer = document.createElement('div')
        resultsContainer.className = 'ai-results-container'
        resultsContainer.style.cssText = `
          margin-top: 20px;
          min-height: 50px;
        `

        // Initialize with comparison view showing original text
        resultsContainer.innerHTML = `
          <div class="comparison-container" style="display: block; margin-bottom: 16px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; min-height: 300px;">
              <div style="padding: 12px; border-right: 1px solid var(--pico-border-color, #dee2e6); display: flex; flex-direction: column;">
                <h5 style="margin: 0 0 8px 0; font-size: 13px; color: var(--pico-muted-color, #666); font-weight: 600; flex-shrink: 0;">Original:</h5>
                <div class="original-text" style="background: var(--pico-background-color, #f8f9fa); padding: 12px; border-radius: var(--pico-border-radius, 4px); font-size: 14px; color: var(--pico-color, #333); overflow-y: auto; flex: 1; min-height: 250px; max-height: 400px; border: 1px solid var(--pico-border-color, #e9eef); line-height: 1.5;">${marked.parse(text)}</div>
              </div>
              <div style="padding: 12px; display: flex; flex-direction: column;">
                <h5 style="margin: 0 0 8px 0; font-size: 13px; color: var(--pico-muted-color, #666); font-weight: 600; flex-shrink: 0;">Modified:</h5>
                <div class="modified-text" style="background: var(--pico-background-color, #f8f9fa); background-image: linear-gradient(135deg, rgba(0, 123, 255, 0.05) 0%, rgba(0, 123, 255, 0.08) 100%); padding: 12px; border-radius: var(--pico-border-radius, 4px); font-size: 14px; color: var(--pico-color, #333); overflow-y: auto; flex: 1; min-height: 250px; max-height: 400px; border: 1px solid var(--pico-border-color, #dee2e6); line-height: 1.5;"><em style="color: var(--pico-muted-color, #666);">AI response will appear here after you click "Generate"...</em></div>
              </div>
            </div>
          </div>
        `

        mainContentContainer.appendChild(resultsContainer)

        // Persistent button container (fixed at bottom)
        const buttonContainer = document.createElement('div')
        buttonContainer.className = 'ai-button-container'
        buttonContainer.style.cssText = `
          background: var(--pico-background-color, white);
          display: flex;
          gap: 12px;
          padding: 20px;
          border-top: 1px solid var(--pico-border-color, #dee2e6);
          justify-content: flex-end;
          flex-shrink: 0;
        `

        // Refine Further button (initially disabled)
        const refineFurtherButton = document.createElement('button')
        refineFurtherButton.textContent = 'Refine Further'
        refineFurtherButton.className = 'refine-further-button'
        refineFurtherButton.style.cssText = `
          padding: 8px 16px;
          border: 1px solid var(--pico-secondary, #6c757d);
          background: var(--pico-secondary, #6c757d);
          color: white;
          border-radius: var(--pico-border-radius, 0.25rem);
          cursor: not-allowed;
          opacity: 0.6;
          font-size: 14px;
          transition: all 0.2s ease;
          margin-right: auto;
        `
        refineFurtherButton.disabled = true
        refineFurtherButton.title = 'Use this text as the new original for further refinement'
        buttonContainer.appendChild(refineFurtherButton)

        // Apply button (initially disabled)
        const applyButton = document.createElement('button')
        applyButton.textContent = 'Apply'
        applyButton.className = 'apply-button'
        applyButton.style.cssText = `
          padding: 8px 16px;
          border: 1px solid var(--pico-primary, #007bff);
          background: var(--pico-primary, #007bff);
          color: white;
          border-radius: var(--pico-border-radius, 0.25rem);
          cursor: not-allowed;
          opacity: 0.6;
          font-size: 14px;
          transition: all 0.2s ease;
        `
        applyButton.disabled = true
        buttonContainer.appendChild(applyButton)

        // Close button
        const closeButton = document.createElement('button')
        closeButton.textContent = 'Close'
        closeButton.className = 'secondary'
        closeButton.style.cssText = `
          padding: 8px 16px;
          border: 1px solid var(--pico-muted-border-color, #ced4da);
          background: var(--pico-background-color, #fff);
          color: var(--pico-color, #333);
          border-radius: var(--pico-border-radius, 0.25rem);
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        `
        buttonContainer.appendChild(closeButton)

        modal.appendChild(buttonContainer)

        // Unified close function
        const closeModal = () => {
          if (document.body.contains(overlay)) {
            document.body.removeChild(overlay)
          }
          document.removeEventListener('keydown', handleEscape)
        }

        // Attach close event
        closeButton.addEventListener('click', closeModal)

        // Attach refine further event
        refineFurtherButton.addEventListener('click', () => {
          const resultsContainer = document.querySelector('.ai-results-container')
          if (!resultsContainer) return

          const modifiedTextEl = resultsContainer.querySelector('.modified-text')
          if (modifiedTextEl) {
            const currentModifiedText = modifiedTextEl.textContent || modifiedTextEl.innerText
            if (currentModifiedText && !currentModifiedText.includes('AI response will appear here') && !currentModifiedText.includes('No changes needed')) {
              // Update the original text side with the current modified text
              const originalTextEl = resultsContainer.querySelector('.original-text')
              if (originalTextEl) {
                originalTextEl.innerHTML = marked.parse(currentModifiedText)

                // Update the original text header
                const originalHeader = resultsContainer.querySelector('.comparison-container h5:first-child')
                if (originalHeader) {
                  originalHeader.textContent = 'Current Base:'
                }
              }

              // Clear the modified text side
              modifiedTextEl.innerHTML = '<em style="color: var(--pico-muted-color, #666);">AI response will appear here after you click "Generate"...</em>'

              // Update the modified text header
              const modifiedHeader = resultsContainer.querySelector('.comparison-container h5:last-child')
              if (modifiedHeader) {
                modifiedHeader.textContent = 'Refined:'
              }

              // Disable refine further button until new response is generated
              refineFurtherButton.disabled = true
              refineFurtherButton.style.cursor = 'not-allowed'
              refineFurtherButton.style.opacity = '0.6'

              // Also disable apply button since there's no new response yet
              applyButton.disabled = true
              applyButton.style.cursor = 'not-allowed'
              applyButton.style.opacity = '0.6'

              // Clear the custom prompt input for new instruction
              customPrompt.value = ''
              customPrompt.focus()
            }
          }
        })

        // Add main content and button containers to modal
        modal.appendChild(mainContentContainer)
        modal.appendChild(buttonContainer)

        overlay.appendChild(modal)

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            closeModal()
          }
        })

        // Close on escape key
        const handleEscape = (e) => {
          if (e.key === 'Escape') {
            closeModal()
          }
        }
        document.addEventListener('keydown', handleEscape)

        return overlay
      }

      const generateWithAI = (prompt, closeModal, hasSelection, selection, applyButton, refineFurtherButton, originalText) => {
        // Show loading state in modified text area
        const resultsEl = document.querySelector('.ai-results-container')
        if (resultsEl) {
          const modifiedTextEl = resultsEl.querySelector('.modified-text')
          if (modifiedTextEl) {
            modifiedTextEl.innerHTML = `
              <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; color: var(--pico-muted-color, #666);">
                <div style="margin-bottom: 10px;">🤖 Processing...</div>
                <div style="font-size: 12px;">Robot is thinking...</div>
              </div>
            `
          }
        }

        fetch('/api/v1/z-ai/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ prompt, text })
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.choices && data.choices.length > 0) {
              displayAIResults(data.choices, closeModal, hasSelection, selection, applyButton, refineFurtherButton, originalText)
            } else {
              this.showError('No response received from AI')
              // Reset modified text area but keep comparison visible
              const resultsEl = document.querySelector('.ai-results-container')
              if (resultsEl) {
                const modifiedTextEl = resultsEl.querySelector('.modified-text')
                if (modifiedTextEl) {
                  modifiedTextEl.innerHTML = '<em style="color: var(--pico-muted-color, #666);">AI response will appear here...</em>'
                }
              }
            }
          })
          .catch((error) => {
            console.error('Error calling z.ai API:', error)
            this.showError('AI Error: ' + error.message)
            // Reset modified text area but keep comparison visible
            const resultsEl = document.querySelector('.ai-results-container')
            if (resultsEl) {
              const modifiedTextEl = resultsEl.querySelector('.modified-text')
              if (modifiedTextEl) {
                modifiedTextEl.innerHTML = '<em style="color: var(--pico-muted-color, #666);">AI response will appear here...</em>'
              }
            }
          })
      }

      const displayAIResults = (choices, closeModal, hasSelection, selection, applyButton, refineFurtherButton, originalText) => {
        const resultsEl = document.querySelector('.ai-results-container')
        if (!resultsEl) return

        // Update the header to show scroll instruction
        const comparisonHeader = resultsEl.querySelector('.comparison-container div div:last-child')
        if (comparisonHeader) {
          comparisonHeader.textContent = 'Scroll to compare full text'
        }

        // Update only the modified text area, keep comparison container visible
        const modifiedTextEl = resultsEl.querySelector('.modified-text')
        if (modifiedTextEl) {
          modifiedTextEl.innerHTML = '<em style="color: var(--pico-muted-color, #666);">AI response will appear here...</em>'
        }

        // Store the current selected AI response
        let currentAIResponse = null

        // Function to enable apply button
        const enableApplyButton = (response) => {
          currentAIResponse = response

          // Check if no changes were made
          const isNoChanges = response.trim() === originalText.trim()

          if (isNoChanges) {
            // No changes needed - show success in modified text area, keep comparison visible
            applyButton.textContent = 'Got it!'
            applyButton.disabled = false
            applyButton.style.cursor = 'pointer'
            applyButton.style.opacity = '1'
            applyButton.style.background = 'var(--pico-secondary, #6c757d)'
            applyButton.style.borderColor = 'var(--pico-secondary, #6c757d)'
            applyButton.style.color = 'white'

            // Enable refine further button for iterative editing
            refineFurtherButton.disabled = false
            refineFurtherButton.style.cursor = 'pointer'
            refineFurtherButton.style.opacity = '1'
            refineFurtherButton.style.background = 'var(--pico-secondary, #6c757d)'
            refineFurtherButton.style.borderColor = 'var(--pico-secondary, #6c757d)'
            refineFurtherButton.style.color = 'white'

            // Update button action to just close modal
            applyButton.onclick = () => {
              closeModal()
              this.showSuccess('No changes needed - your text is already perfect!')
            }

            // Update modified text area to show no changes message, keep comparison visible
            const modifiedTextEl = resultsEl.querySelector('.modified-text')
            if (modifiedTextEl) {
              modifiedTextEl.innerHTML = `
                <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; color: var(--pico-ins-color, #28a745); background: var(--pico-ins-background, #d4edda); border-radius: var(--pico-border-radius, 4px); border: 1px solid var(--pico-ins-border, #c3e6cb); padding: 20px;">
                  <div style="font-size: 18px; margin-bottom: 8px;">✓</div>
                  <div style="font-weight: 600;">No changes needed</div>
                  <div style="font-size: 14px; opacity: 0.8;">Your text is already perfect!</div>
                </div>
              `
            }
          } else {
            // Changes were made - normal behavior
            applyButton.textContent = 'Apply'
            applyButton.disabled = false
            applyButton.style.cursor = 'pointer'
            applyButton.style.opacity = '1'
            applyButton.style.background = 'var(--pico-primary, #007bff)'
            applyButton.style.borderColor = 'var(--pico-primary, #007bff)'
            applyButton.style.color = 'white'

            // Enable refine further button for iterative editing
            refineFurtherButton.disabled = false
            refineFurtherButton.style.cursor = 'pointer'
            refineFurtherButton.style.opacity = '1'
            refineFurtherButton.style.background = 'var(--pico-secondary, #6c757d)'
            refineFurtherButton.style.borderColor = 'var(--pico-secondary, #6c757d)'
            refineFurtherButton.style.color = 'white'

            // Restore normal click handler
            applyButton.onclick = () => {
              if (currentAIResponse) {
                // Capture selection state before applying
                const currentHasSelection = hasSelection
                const currentSelection = selection

                applyAIResponse(currentAIResponse, closeModal, currentHasSelection, currentSelection)
              }
            }

            // Show comparison view with full text
            const comparisonContainer = resultsEl.querySelector('.comparison-container')
            const originalTextEl = resultsEl.querySelector('.original-text')
            const modifiedTextEl = resultsEl.querySelector('.modified-text')

            if (comparisonContainer && originalTextEl && modifiedTextEl) {
              // Update both sides with rendered markdown
              originalTextEl.innerHTML = marked.parse(originalText)
              modifiedTextEl.innerHTML = marked.parse(response)

              // Scroll both containers to top for fresh comparison
              originalTextEl.scrollTop = 0
              modifiedTextEl.scrollTop = 0

              // Add synchronized scrolling for better comparison
              const syncScroll = (source, target) => {
                const scrollRatio = source.scrollTop / (source.scrollHeight - source.clientHeight)
                target.scrollTop = scrollRatio * (target.scrollHeight - target.clientHeight)
              }

              // Remove existing listeners to prevent duplicates
              const newOriginalTextEl = originalTextEl.cloneNode(true)
              const newModifiedTextEl = modifiedTextEl.cloneNode(true)
              originalTextEl.parentNode.replaceChild(newOriginalTextEl, originalTextEl)
              modifiedTextEl.parentNode.replaceChild(newModifiedTextEl, modifiedTextEl)

              // Add synchronized scroll listeners
              newOriginalTextEl.addEventListener('scroll', () => {
                syncScroll(newOriginalTextEl, newModifiedTextEl)
              })

              newModifiedTextEl.addEventListener('scroll', () => {
                syncScroll(newModifiedTextEl, newOriginalTextEl)
              })
            }
          }
        }

        // Auto-select the first choice and enable apply button
        if (choices.length > 0) {
          enableApplyButton(choices[0].message.content)
        }
      }

      const applyAIResponse = (newText, closeModal, hasSelection, selection) => {
        try {
          // Use the captured noteEdit state to ensure we have the note data
          console.log('AI apply - captured noteEdit:', currentNoteEdit)
          console.log('AI apply - current noteEdit:', this.noteEdit)

          // Ensure we have a valid noteEdit object
          if (!currentNoteEdit || !currentNoteEdit.sepiaId) {
            throw new Error('Note information is missing - cannot save changes')
          }

          // Preserve all note properties and only update content
          this.noteEdit = {
            ...currentNoteEdit,
            content: newText
          }

          // Save the note to persist changes
          this.saveNote().then(() => {
            closeModal()
            this.showSuccess('Text updated successfully')
          }).catch((error) => {
            console.error('SaveNote error:', error)
            this.showError('Failed to save changes: ' + error.message)
            closeModal()
          })
        } catch (error) {
          console.error('Error applying AI response:', error)
          this.showError('Failed to apply AI response: ' + error.message)
          closeModal()
        }
      }

      const modal = createAIModal()

      // Add CSS styles for better markdown rendering in comparison
      const style = document.createElement('style')
      style.textContent = `
        .ai-modal .original-text h1, .ai-modal .modified-text h1 { font-size: 1.5em; margin: 0.67em 0; font-weight: 600; }
        .ai-modal .original-text h2, .ai-modal .modified-text h2 { font-size: 1.3em; margin: 0.83em 0; font-weight: 600; }
        .ai-modal .original-text h3, .ai-modal .modified-text h3 { font-size: 1.1em; margin: 1em 0; font-weight: 600; }
        .ai-modal .original-text p, .ai-modal .modified-text p { margin: 0.5em 0; }
        .ai-modal .original-text ul, .ai-modal .modified-text ul { margin: 0.5em 0; padding-left: 1.5em; }
        .ai-modal .original-text ol, .ai-modal .modified-text ol { margin: 0.5em 0; padding-left: 1.5em; }
        .ai-modal .original-text li, .ai-modal .modified-text li { margin: 0.25em 0; }
        .ai-modal .original-text code, .ai-modal .modified-text code { background: rgba(0,0,0,0.1); padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; font-size: 0.9em; }
        .ai-modal .original-text pre, .ai-modal .modified-text pre { background: rgba(0,0,0,0.05); padding: 1em; border-radius: 4px; overflow-x: auto; margin: 0.5em 0; }
        .ai-modal .original-text pre code, .ai-modal .modified-text pre code { background: none; padding: 0; }
        .ai-modal .original-text blockquote, .ai-modal .modified-text blockquote { border-left: 4px solid var(--pico-muted-color, #666); padding-left: 1em; margin: 0.5em 0; color: var(--pico-muted-color, #666); font-style: italic; }
        .ai-modal .original-text strong, .ai-modal .modified-text strong { font-weight: 600; }
        .ai-modal .original-text em, .ai-modal .modified-text em { font-style: italic; }
      `
      document.head.appendChild(style)

      document.body.appendChild(modal)
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

        // Check if lane has changed and include it in the API call if different
        const options = {
          position: null
        }

        // Only include laneName if it's different from the original lane
        if (this.noteEdit.currentLane && this.noteEdit.currentLane !== this.draggedFromLane) {
          options.laneName = this.noteEdit.currentLane
        }

        await this.api.updateNote(this.currentBoardName, noteData.sepiaId, {
          title: noteData.title,
          tags: noteData.tags || [],
          content,
          expanded: noteData.expanded,
          public: noteData.public || false,
          start_date: noteData.startDate || null,
          end_date: noteData.endDate || null,
          priority: noteData.priority || null,
          attachments: noteData.attachments || []
        }, options)

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
        await this.api.deleteNote(this.currentBoardName, this.noteEdit.sepiaId)

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
        const found = lane.notes.find(n => n.sepiaId === noteId)
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
        await this.api.deleteNote(this.currentBoardName, noteId)

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
        // Use the API service to create a new lane
        await this.api.createLane(this.currentBoardName, this.newLaneName.trim())

        this.newLaneName = ''
        this.showAddLane = false // Close the modal
        await this.loadBoard(this.currentBoardName)
      } catch (error) {
        console.error('Error adding lane:', error)
        this.error = error.message
      }
    },

    // Handle creating lanes from a template
    async handleCreateLaneTemplate (templateType) {
      const templates = {
        simple: ['Todo', 'In Progress', 'Done'],
        taskmgmt: ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'],
        timebased: ['Today', 'This Week', 'Someday', 'Done']
      }

      const laneNames = templates[templateType]
      if (!laneNames) {
        console.error('Unknown template type:', templateType)
        return
      }

      try {
        // Get current lanes and add all template lanes at once
        const currentLanes = this.currentBoard?.lanes || []
        const newLanes = [...currentLanes, ...laneNames.map(name => ({ name }))]

        // Update the board with all lanes in a single API call
        await this.api.updateBoard(this.currentBoardName, { lanes: newLanes })

        // Reload the board to show the new lanes
        await this.loadBoard(this.currentBoardName)
        this.showSuccess(`Created ${laneNames.length} lanes from ${templateType} template`)
      } catch (error) {
        console.error('Error creating lanes from template:', error)
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
      // Reset all drag state
      this.draggedNote = null
      this.draggedFromLane = null
      this.draggedFromIndex = null
      this.draggedToIndex = null
    },

    handleDragOver (event, laneName) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'

      // No visual indicators needed - just handle the drag over
    },

    async handleDrop (event, toLaneName) {
      event.preventDefault()

      if (!this.draggedNote) {
        // Handle file drops (images, etc.)
        await this.handleFileDrop(event, toLaneName)
        return
      }

      // Get cursor position to determine drop location within the lane
      // Find the actual lane-notes container (not the note card itself)
      let laneElement = event.currentTarget
      if (laneElement.classList.contains('note-card')) {
        // If we got a note card, find its parent lane-notes container
        laneElement = laneElement.closest('.lane-notes')
      }

      const laneRect = laneElement.getBoundingClientRect()
      const cursorY = event.clientY - laneRect.top
      const noteElements = laneElement.querySelectorAll('.note-card')

      console.log('=== DRAG DEBUG ===')
      console.log('draggedNote:', this.draggedNote.title)
      console.log('fromLane:', this.draggedFromLane)
      console.log('toLane:', toLaneName)
      console.log('cursorY:', cursorY)
      console.log('FIXED laneElement tagName:', laneElement.tagName)
      console.log('FIXED laneElement className:', laneElement.className)
      console.log('FIXED noteElements count:', noteElements.length)
      console.log('FIXED All children in lane:', Array.from(laneElement.children).map(child => ({ tagName: child.tagName, className: child.className })))
      console.log('FIXED Total children count:', laneElement.children.length)

      // Find which note the cursor is on, with special handling for dragged note
      let targetNoteIndex = -1
      const draggedNoteElement = Array.from(noteElements).find(el =>
        el.getAttribute('data-note-id') === this.draggedNote.sepiaId
      )

      // Find the current index of the dragged note
      const noteIndex = Array.from(noteElements).findIndex(el =>
        el.getAttribute('data-note-id') === this.draggedNote.sepiaId
      )

      for (let i = 0; i < noteElements.length; i++) {
        const noteElement = noteElements[i]
        const noteRect = noteElement.getBoundingClientRect()
        const noteTop = noteRect.top - laneRect.top
        const noteCenterY = noteTop + noteRect.height / 2

        // Special handling for the dragged note
        if (draggedNoteElement && noteElement === draggedNoteElement) {
          if (cursorY < noteCenterY) {
            // Cursor is in upper half of dragged note, move it up one position
            targetNoteIndex = Math.max(0, noteIndex - 1)
            break
          } else {
            // Cursor is in lower half of dragged note, move to next position
            targetNoteIndex = i + 1
            continue
          }
        }

        // For other notes, check if cursor is before this note
        if (cursorY < noteCenterY) {
          targetNoteIndex = i
          break
        }
        targetNoteIndex = i + 1
      }

      // If no notes in the lane (empty lane), place at position 0
      if (noteElements.length === 0) {
        targetNoteIndex = 0
      }

      console.log('cursor is over note index:', targetNoteIndex)

      try {
        // Find the lanes
        const fromLane = this.currentBoard.lanes.find(l => l.name === this.draggedFromLane)
        const toLane = this.currentBoard.lanes.find(l => l.name === toLaneName)
        if (!fromLane || !toLane) {
          return
        }

        // Find the note index
        const noteIndex = fromLane.notes.findIndex(n => n.sepiaId === this.draggedNote.sepiaId)
        if (noteIndex === -1) {
          return
        }
        const note = fromLane.notes[noteIndex]

        console.log('moving note from index', noteIndex, 'to index', targetNoteIndex)

        // If moving within the same lane and same position, do nothing
        if (this.draggedFromLane === toLaneName && noteIndex === targetNoteIndex) {
          console.log('SAME POSITION - CANCELLING')
          this.draggedNote = null
          this.draggedFromLane = null
          this.draggedFromIndex = null
          return
        }

        // Remove note from original position
        fromLane.notes.splice(noteIndex, 1)

        // Insert note at target position
        toLane.notes.splice(targetNoteIndex, 0, note)

        console.log('new note order:', toLane.notes.map(n => n.title))

        console.log('CALLING API UPDATE...')
        // Save the changes using the API service
        await this.api.updateNote(this.currentBoardName, note.sepiaId, {
          title: note.title,
          tags: note.tags || [],
          content: note.content || '',
          expanded: note.expanded,
          public: note.public || false,
          start_date: note.startDate || null,
          end_date: note.endDate || null,
          priority: note.priority || null,
          attachments: note.attachments || []
        }, {
          laneName: toLaneName,
          position: targetNoteIndex
        })

        this.draggedNote = null
        this.draggedFromLane = null
        this.draggedFromIndex = null

        // Add success animation to the dropped note
        this.$nextTick(() => {
          const noteElement = document.querySelector(`[data-note-id="${note.sepiaId}"]`)
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
        // Create note first, then upload image as attachment
        const noteTitle = file.name.replace(/\.[^/.]+$/, '') // Remove extension
        const createdNote = await this.api.createNote(this.currentBoardName, laneName, {
          title: noteTitle,
          content: '',
          tags: [],
          expanded: false,
          public: false,
          attachments: [],
          start_date: null,
          end_date: null,
          priority: null
        })

        // Upload image as attachment to the created note
        await this.api.uploadAttachment(this.currentBoardName, createdNote.note.sepiaId, file)

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
        await this.api.createNote(this.currentBoardName, laneName, {
          title: text.length > 50 ? text.substring(0, 47) + '...' : text,
          content: text,
          tags: [],
          expanded: false,
          public: false,
          attachments: [],
          start_date: null,
          end_date: null,
          priority: null
        })

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
          const targetIndex = targetLane.notes.findIndex(n => n.sepiaId === note.sepiaId)
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
      try {
        await this.api.uploadAttachment(this.currentBoardName, note.sepiaId, file)

        await this.loadBoard(this.currentBoardName)
        this.showSuccess('Image added to note successfully')
      } catch (error) {
        console.error('Error adding attachment:', error)
        this.showError('Failed to add image to note')
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
        const noteIndex = lane.notes.findIndex(n => n.sepiaId === noteId)
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
        const noteId = this.attachmentNote?.sepiaId || this.noteEdit?.sepiaId
        if (!noteId) {
          throw new Error('No note ID available')
        }

        await this.api.deleteAttachment(this.currentBoardName, noteId, filename)

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
      console.log('noteEdit.sepiaId:', this.noteEdit?.sepiaId)

      const noteId = this.attachmentNote?.sepiaId || this.currentEditingNoteId || this.noteEdit?.sepiaId

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
          // Use generated API client for secure attachment upload
          const boardName = this.currentBoardName
          if (!boardName) {
            await this.showAlert('Error', 'No board selected - cannot upload attachment')
            continue
          }

          const result = await this.api.uploadAttachment(boardName, noteId, file)

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
        const noteId = this.attachmentNote?.sepiaId || this.noteEdit?.sepiaId
        if (!noteId) {
          throw new Error('No note ID available')
        }

        await this.api.deleteAttachment(this.currentBoardName, noteId, filename)

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
      // Remove UUID prefix if present (format: uuid_filename.ext)
      const parts = attachment.split('_')
      if (parts.length > 1 && parts[0].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return parts.slice(1).join('_')
      }
      return attachment
    },

    // Calculate completion percentage for a note
    calculateCompletion (note) {
      if (!note || !note.content) {
        return { total: 0, completed: 0, percentage: 0 }
      }

      const content = note.content
      const openTasks = (content.match(/^\s*[-*] \[ \]/gm) || []).length
      const completedTasks = (content.match(/^\s*[-*] \[x\]/gm) || []).length
      const totalTasks = openTasks + completedTasks

      if (totalTasks === 0) {
        return { total: 0, completed: 0, percentage: 0 }
      }

      const percentage = Math.round((completedTasks / totalTasks) * 100)

      return { total: totalTasks, completed: completedTasks, percentage }
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
        // Use board-scoped endpoint for secure attachment deletion
        const boardName = this.currentBoardName
        if (!boardName) {
          throw new Error('No board selected - cannot delete attachment')
        }

        await this.api.deleteAttachment(boardName, note.sepiaId, attachment)

        // Remove attachment from note's attachments array
        note.attachments = note.attachments.filter(a => a !== attachment)

        // Force update
        this.currentBoard = { ...this.currentBoard }

        // If we're editing this note, update the edit copy too
        if (this.editingNote && this.noteEdit.sepiaId === note.sepiaId) {
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
        // Save the expanded state to backend using generated API client
        await this.api.updateNote(this.currentBoardName, note.sepiaId, {
          title: note.title,
          tags: note.tags || [],
          content: note.content || '',
          expanded: newExpandedState,
          public: note.public || false,
          start_date: note.startDate || null,
          end_date: note.endDate || null,
          priority: note.priority || null,
          attachments: note.attachments || []
        })

        // Update local state only after successful save
        note.expanded = newExpandedState
        // Force update
        this.currentBoard = { ...this.currentBoard }

        // Apply highlighting after expanding
        if (newExpandedState) {
          // Use setTimeout to wait for DOM update
          setTimeout(() => {
            const noteElement = document.querySelector(`[data-note-id="${note.sepiaId}"]`)
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
      const lanes = board.querySelectorAll('.lane')

      if (lanes.length === 0) return

      const currentScrollLeft = board.scrollLeft
      const viewportWidth = board.clientWidth

      let targetLane = null
      let targetScrollPosition = currentScrollLeft

      if (direction === 'left') {
        // Find the next lane to the left whose LEFT edge should align with window LEFT, but offset by 1rem to show previous lane
        for (let i = lanes.length - 1; i >= 0; i--) {
          const lane = lanes[i]
          const laneLeft = lane.offsetLeft

          if (laneLeft < currentScrollLeft - 5) { // -5px tolerance
            targetLane = lane
            targetScrollPosition = laneLeft - 16 // 1rem = 16px offset to show previous lane
            break
          }
        }

        // If no lane found to the left, scroll to the very beginning with 1rem offset (0 to avoid negative scroll)
        if (!targetLane) {
          targetScrollPosition = 0
        }
      } else {
        // Find the next lane to the right whose RIGHT edge should align with window RIGHT, but offset by 1rem to show next lane
        for (let i = 0; i < lanes.length; i++) {
          const lane = lanes[i]
          const laneRight = lane.offsetLeft + lane.offsetWidth

          if (laneRight > currentScrollLeft + viewportWidth + 5) { // +5px tolerance
            targetLane = lane
            targetScrollPosition = laneRight - viewportWidth + 16 // 1rem = 16px offset to show next lane
            break
          }
        }

        // If no lane found to the right, scroll to the very end
        if (!targetLane) {
          targetScrollPosition = board.scrollWidth - viewportWidth
        }
      }

      // Ensure we don't scroll beyond boundaries
      targetScrollPosition = Math.max(0, Math.min(targetScrollPosition, board.scrollWidth - viewportWidth))

      // Scroll to the target position with smooth behavior
      board.scrollTo({ left: targetScrollPosition, behavior: 'smooth' })
    },

    // Update kanban board padding to ensure sufficient scrollable space for hidden lanes
    updateKanbanPadding () {
      const kanbanBoard = document.querySelector('.kanban-board')
      if (!kanbanBoard || !this.currentBoard) return

      const firstVisibleLane = this.currentBoard.firstVisibleLane || 0
      if (firstVisibleLane === 0) {
        // No hidden lanes, no extra padding needed
        kanbanBoard.style.paddingRight = ''
        return
      }

      // Get dynamic lane width for visible lanes and standard width for hidden lanes
      const dynamicLaneWidth = this.calculateDynamicLaneWidth()
      const boardStyle = window.getComputedStyle(kanbanBoard)
      const gapValue = boardStyle.gap || '0.75rem'
      const laneGap = parseInt(gapValue) || 12

      const viewportWidth = window.innerWidth

      // Calculate required kanban width using dynamic widths
      const totalLanes = this.currentBoard.lanes.length
      let allLanesWidth = 0

      for (let i = 0; i < totalLanes; i++) {
        const laneWidth = this.isLaneHidden(i) ? 280 : dynamicLaneWidth
        allLanesWidth += laneWidth
        if (i < totalLanes - 1) {
          allLanesWidth += laneGap
        }
      }

      // Always use the logic from the "else" branch since show_hidden_lanes is removed
      // This calculates width for the normal lane visibility behavior
      let visibleLanesWidth = 0
      let hiddenLanesWidth = 0

      for (let i = 0; i < totalLanes; i++) {
        const laneWidth = this.isLaneHidden(i) ? 280 : dynamicLaneWidth
        if (i < firstVisibleLane) {
          hiddenLanesWidth += laneWidth + laneGap
        } else {
          visibleLanesWidth += laneWidth
          if (i < totalLanes - 1) {
            visibleLanesWidth += laneGap
          }
        }
      }

      const requiredKanbanWidth = Math.max(
        visibleLanesWidth,
        hiddenLanesWidth + viewportWidth,
        viewportWidth
      )

      // Calculate the right padding needed to achieve this width
      const currentContentWidth = allLanesWidth
      const rightPadding = Math.max(0, requiredKanbanWidth - currentContentWidth)

      kanbanBoard.style.paddingRight = `${rightPadding}px`
    },

    // Calculate dynamic lane width based on available space and visible lanes
    calculateDynamicLaneWidth () {
      if (!this.currentBoard || !this.currentBoard.lanes) return 280

      const boardContainer = document.querySelector('.board-container')
      const kanbanBoard = document.querySelector('.kanban-board')

      if (!boardContainer || !kanbanBoard) return 280

      // Get available width (board container width minus scroll buttons and padding)
      const availableWidth = boardContainer.offsetWidth - 120 // Subtract space for scroll buttons
      const gap = 12 // 0.75rem in pixels

      // Calculate visible lanes (excluding hidden ones)
      const totalLanes = this.currentBoard.lanes.length
      const firstVisible = this.currentBoard.firstVisibleLane || 0
      const visibleLanes = totalLanes - firstVisible

      if (visibleLanes <= 0) return 280

      // Calculate ideal width
      const totalGapWidth = (visibleLanes - 1) * gap
      const availableLaneWidth = availableWidth - totalGapWidth
      const idealLaneWidth = availableLaneWidth / visibleLanes

      // Apply constraints
      const MIN_LANE_WIDTH = 250
      const MAX_LANE_WIDTH = 400

      return Math.max(MIN_LANE_WIDTH, Math.min(MAX_LANE_WIDTH, idealLaneWidth))
    },

    // Update lane widths dynamically
    updateLaneWidths () {
      if (!this.currentBoard || !this.currentBoard.lanes) return

      const kanbanBoard = document.querySelector('.kanban-board')
      if (!kanbanBoard) return

      const calculatedWidth = this.calculateDynamicLaneWidth()
      const lanes = kanbanBoard.querySelectorAll('.lane')

      lanes.forEach((lane, index) => {
        // Only apply dynamic width to visible lanes
        if (this.isLaneHidden(index)) {
          lane.style.width = '280px' // Keep fixed width for hidden lanes
        } else {
          lane.style.width = `${calculatedWidth}px`
        }
      })
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

          // Add debounced resize listener for dynamic padding
          let resizeTimeout
          const debouncedResize = () => {
            clearTimeout(resizeTimeout)
            resizeTimeout = setTimeout(() => {
              this.updateKanbanPadding()
              this.updateLaneWidths()
              // Re-scroll to maintain hidden lanes state after resize
              this.setInitialScrollPosition()
            }, 250) // Debounce for 250ms
          }
          window.addEventListener('resize', debouncedResize)

          // Initial padding calculation
          this.updateKanbanPadding()

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

    // WebSocket methods
    initWebSocket (boardName) {
      // Ensure WebSocket client is available
      if (!webSocketClient) {
        console.warn('WebSocket client not available')
        return
      }

      // Check if we're already connected to this board
      if (webSocketClient.connectedBoard === boardName && webSocketClient.isConnected) {
        // Already connected to this board, no need to reconnect
        return
      }

      // Disconnect from any previous board
      webSocketClient.disconnect()

      // Connect to the new board
      webSocketClient.connect(boardName)
      this.webSocketConnected = true

      console.log(`WebSocket initialized for board: ${boardName}`)
    },

    disconnectWebSocket () {
      if (webSocketClient) {
        webSocketClient.disconnect()
        this.webSocketConnected = false
        console.log('WebSocket disconnected')
      }
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
        } else if (this.modalType === 'public-warning') {
          this.modalResolve(true)
          this.showingPublicWarning = false
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
      this.showingPublicWarning = false
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
          const found = lane.notes.find(n => n.sepiaId === noteId)
          if (found) {
            note = found
            laneName = lane.name
          }
        })

        if (!note) return

        // Update the note locally
        note.public = isPublic

        // If we're editing this note, update the edit copy too
        if (this.noteEdit && this.noteEdit.sepiaId === noteId) {
          this.noteEdit.public = isPublic
        }

        // Save to backend using generated API client
        try {
          await this.api.updateNote(this.currentBoardName, noteId, {
            title: note.title,
            tags: note.tags || [],
            content: note.content || '',
            expanded: note.expanded,
            public: isPublic,
            start_date: note.startDate || null,
            end_date: note.endDate || null,
            priority: note.priority || null,
            attachments: note.attachments || []
          }, {
            laneName
          })

          if (isPublic) {
            this.showInfo('Note is now public!')
          } else {
            this.showInfo('Note is now private')
          }
        } catch (error) {
          console.error('Failed to update note public status:', error)
          // Revert the change on error
          note.public = !isPublic
          if (this.noteEdit && this.noteEdit.sepiaId === noteId) {
            this.noteEdit.public = !isPublic
          }
          this.showError('Failed to update note sharing')
        }
      } catch (error) {
        console.error('Error updating note public status:', error)
        this.showError('Failed to update note sharing')
      }
    },

    // Copy permalink to clipboard
    async copyPermalink (noteId) {
      try {
        const url = this.getFullUrl(`/n/${noteId}`)
        await navigator.clipboard.writeText(url)
        this.showSuccess('Link copied to clipboard!')
      } catch (err) {
        console.error('Failed to copy permalink: ', err)
        // Fallback for browsers that don't support clipboard API
        try {
          const url = this.getFullUrl(`/n/${noteId}`)
          const textArea = document.createElement('textarea')
          textArea.value = url
          textArea.style.position = 'fixed'
          textArea.style.opacity = '0'
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()
          document.execCommand('copy')
          document.body.removeChild(textArea)
          this.showSuccess('Link copied to clipboard!')
        } catch (fallbackErr) {
          console.error('Fallback copy failed: ', fallbackErr)
          this.showError('Failed to copy link')
        }
      }
    },

    getSeparatorPosition () {
      if (!this.currentBoard || !this.currentBoard.lanes) return 0

      const laneIndex = this.currentBoard.firstVisibleLane || 0

      // Get dynamic lane width for visible lanes
      const calculatedWidth = this.calculateDynamicLaneWidth()

      // Get gap from kanban board computed style
      const kanbanBoard = document.querySelector('.kanban-board')
      if (kanbanBoard) {
        const boardStyle = window.getComputedStyle(kanbanBoard)
        const gapValue = boardStyle.gap || '0.75rem'
        const laneGap = parseInt(gapValue) || 12

        // For hidden lanes, use standard width; for visible lanes, use dynamic width
        let position = 0
        for (let i = 0; i < laneIndex; i++) {
          const laneWidth = this.isLaneHidden(i) ? 280 : calculatedWidth
          position += laneWidth + laneGap
        }

        // Position separator with its RIGHT EDGE at the LEFT EDGE of the first visible lane
        return position - laneGap
      }

      // Fallback calculation
      return laneIndex * (280 + 12) - 12 // Standard width + gap
    },

    isLaneHidden (index) {
      if (!this.currentBoard || !this.currentBoard.lanes) return false
      return index < (this.currentBoard.firstVisibleLane || 0)
    },

    // Lane visibility control methods
    canDecreaseFirstVisibleLane () {
      if (!this.currentBoard || !this.currentBoard.lanes) return false
      return (this.currentBoard.firstVisibleLane || 0) > 0
    },

    canIncreaseFirstVisibleLane () {
      if (!this.currentBoard || !this.currentBoard.lanes) return false
      return (this.currentBoard.firstVisibleLane || 0) < this.currentBoard.lanes.length
    },

    async decreaseFirstVisibleLane () {
      if (!this.canDecreaseFirstVisibleLane()) return

      try {
        const newFirstVisible = (this.currentBoard.firstVisibleLane || 0) - 1

        console.log('Decreasing firstVisibleLane from', this.currentBoard.firstVisibleLane, 'to', newFirstVisible)

        // Update local state immediately for responsive UI
        this.currentBoard.firstVisibleLane = newFirstVisible

        // Update lane widths after visibility change
        this.$nextTick(() => {
          this.updateLaneWidths()
        })

        // Save to server
        console.log('Calling updateBoard with:', { firstVisibleLane: newFirstVisible })
        const result = await this.api.updateBoard(this.currentBoardName, { firstVisibleLane: newFirstVisible })
        console.log('updateBoard result:', result)

        // Reload board to verify persistence
        const updatedBoard = await this.api.getBoard(this.currentBoardName)
        console.log('After update, board firstVisibleLane is:', updatedBoard.firstVisibleLane)

        // Update scroll position after a brief delay to allow DOM to update
        this.$nextTick(() => {
          // Scrolling is now handled by the HTML template click handlers
        })
      } catch (error) {
        console.error('Error decreasing first visible lane:', error)
        this.showError('Failed to show more lanes')
      }
    },

    async increaseFirstVisibleLane () {
      if (!this.canIncreaseFirstVisibleLane()) return

      try {
        const newFirstVisible = (this.currentBoard.firstVisibleLane || 0) + 1

        console.log('Increasing firstVisibleLane from', this.currentBoard.firstVisibleLane, 'to', newFirstVisible)

        // Update local state immediately for responsive UI
        this.currentBoard.firstVisibleLane = newFirstVisible

        // Update lane widths after visibility change
        this.$nextTick(() => {
          this.updateLaneWidths()
        })

        // Save to server
        console.log('Calling updateBoard with:', { firstVisibleLane: newFirstVisible })
        const result = await this.api.updateBoard(this.currentBoardName, { firstVisibleLane: newFirstVisible })
        console.log('updateBoard result:', result)

        // Reload board to verify persistence
        const updatedBoard = await this.api.getBoard(this.currentBoardName)
        console.log('After update, board firstVisibleLane is:', updatedBoard.firstVisibleLane)

        // Update scroll position after a brief delay to allow DOM to update
        this.$nextTick(() => {
          // Scrolling is now handled by the HTML template click handlers
        })
      } catch (error) {
        console.error('Error increasing first visible lane:', error)
        this.showError('Failed to hide lanes')
      }
    },

    setInitialScrollPosition () {
      if (!this.currentBoard || !this.currentBoard.lanes) return

      const kanbanBoard = document.querySelector('.kanban-board')
      if (!kanbanBoard) return

      // Update padding first to ensure sufficient scrollable space
      this.updateKanbanPadding()

      const firstVisibleLane = this.currentBoard.firstVisibleLane || 0

      // Always use the logic from the "else" branch since show_hidden_lanes is removed
      // This handles normal scroll positioning based on first_visible_lane
      if (firstVisibleLane === 0) {
        kanbanBoard.scrollLeft = 0
        return
      }

      // Use dynamic width calculation for consistent scroll positioning
      const dynamicLaneWidth = this.calculateDynamicLaneWidth()
      const boardStyle = window.getComputedStyle(kanbanBoard)
      const gapValue = boardStyle.gap || '0.75rem'
      const laneGap = parseInt(gapValue) || 12

      // Calculate scroll position needed to bring first_visible_lane to left edge
      let scrollPosition = 0
      for (let i = 0; i < firstVisibleLane; i++) {
        const laneWidth = this.isLaneHidden(i) ? 280 : dynamicLaneWidth
        scrollPosition += laneWidth + laneGap
      }

      kanbanBoard.scrollLeft = scrollPosition
    },

    // Lane dragging functions
    handleLaneDragStart (event, lane) {
      this.draggedLane = lane
      this.draggedLaneIndex = this.currentBoard.lanes.findIndex(l => l.name === lane.name)
      event.target.classList.add('dragging')
      event.dataTransfer.effectAllowed = 'move'
    },

    handleLaneDragEnd (event) {
      event.target.classList.remove('dragging')
      // Remove any existing drop indicators
      const indicator = document.querySelector('.lane-drop-indicator')
      if (indicator) {
        indicator.remove()
      }
      this.draggedLane = null
      this.draggedLaneIndex = null
    },

    handleLaneDragOver (event) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'

      // No visual indicator needed - just handle the drag over
    },

    handleLaneDrop (event) {
      event.preventDefault()

      if (!this.draggedLane || this.draggedLaneIndex === null) {
        return
      }

      // Get cursor position to determine drop location
      const kanbanBoard = document.querySelector('.kanban-board')
      if (!kanbanBoard) return

      const boardRect = kanbanBoard.getBoundingClientRect()
      const cursorX = event.clientX - boardRect.left
      const laneElements = kanbanBoard.querySelectorAll('.lane')

      // Find which gap position to insert at
      let targetPosition = 0
      for (let i = 0; i < laneElements.length; i++) {
        const laneElement = laneElements[i]
        const laneRect = laneElement.getBoundingClientRect()
        const laneCenterX = laneRect.left - boardRect.left + laneRect.width / 2

        if (cursorX < laneCenterX) {
          targetPosition = i
          break
        }
        targetPosition = i + 1
      }

      // Don't do anything if dropping in the same position
      if (targetPosition === this.draggedLaneIndex) {
        return
      }

      // Create a copy of the lanes array
      const lanes = [...this.currentBoard.lanes]

      // Remove from original position
      lanes.splice(this.draggedLaneIndex, 1)

      // Insert at new position
      lanes.splice(targetPosition, 0, this.draggedLane)

      // Update the board
      this.currentBoard.lanes = lanes

      // Save to server
      this.saveLaneOrder()
    },

    async saveLaneOrder () {
      try {
        await this.api.updateBoard(this.currentBoardName, {
          lanes: this.currentBoard.lanes.map(lane => ({ name: lane.name }))
        })
      } catch (error) {
        console.error('Error saving lane order:', error)
        this.showError('Failed to save lane order')
      }
    },

    // Show public board warning modal
    showPublicWarning (type) {
      this.publicWarningType = type
      this.showingPublicWarning = true
      this.modalType = 'public-warning'
      this.showModal = true

      if (type === 'make-public') {
        this.modalTitle = '⚠️ Make Board Public?'
        this.modalMessage = `Making this board public will expose:

• ALL notes on this board (including private notes)
• All attachments and files
• All note content and metadata

Anyone with the link will be able to view everything.
This is a permanent action that cannot be easily undone.`
        this.modalConfirmText = 'Make Public Anyway'
        this.modalCancelText = 'Cancel'
      }

      return new Promise((resolve) => {
        this.modalResolve = resolve
      })
    },

    // Make board public
    async makeBoardPublic () {
      if (!this.currentBoard) return

      try {
        // Show warning and wait for user confirmation
        const confirmed = await this.showPublicWarning('make-public')
        if (!confirmed) return

        console.log('makeBoardPublic: confirmed, setting public to true')
        console.log('makeBoardPublic: calling API with:', { public: true })
        // Update the board public status
        await this.api.updateBoard(this.currentBoardName, { public: true })

        console.log('makeBoardPublic: API call completed, reloading board...')
        // Reload board data to get updated state from server
        await this.loadBoard(this.currentBoardName)

        console.log('makeBoardPublic: board reloaded, new public status:', this.currentBoard.public)
        // Show success message
        if (this.currentBoard.public) {
          this.showSuccess(`Board "${this.currentBoardName}" is now public!`)
          // Auto copy public link
          this.copyPublicLink()
        } else {
          this.showError('Failed to make board public - please try again')
        }
      } catch (error) {
        console.error('Error making board public:', error)
        this.showError('Failed to make board public')
      }
    },

    // Make board private
    async makeBoardPrivate () {
      if (!this.currentBoard) return

      try {
        // No warning for making a board private.
        await this.api.updateBoard(this.currentBoardName, { public: false })
        await this.loadBoard(this.currentBoardName)

        if (!this.currentBoard.public) {
          this.showSuccess(`Board "${this.currentBoardName}" is now private.`)
        } else {
          this.showError('Failed to make board private - please try again')
        }
      } catch (error) {
        console.error('Error making board private:', error)
        this.showError('Failed to make board private')
      }
    },

    // Copy public link to clipboard
    async copyPublicLink () {
      try {
        if (!this.currentBoardName) {
          throw new Error('No board selected')
        }

        const publicUrl = this.getFullUrl(`/public/${this.currentBoard.id}`)
        await navigator.clipboard.writeText(publicUrl)

        this.showSuccess('Public link copied to clipboard!')
      } catch (err) {
        console.error('Failed to copy public link: ', err)
        // Fallback for browsers that don't support clipboard API
        try {
          const publicUrl = this.getFullUrl(`/public/${this.currentBoard.id}`)
          const textArea = document.createElement('textarea')
          textArea.value = publicUrl
          textArea.style.position = 'fixed'
          textArea.style.opacity = '0'
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()
          document.execCommand('copy')
          document.body.removeChild(textArea)

          this.showSuccess('Public link copied to clipboard!')
        } catch (fallbackErr) {
          console.error('Fallback copy failed: ', fallbackErr)
          this.showError('Failed to copy public link')
        }
      }
    }

  }
}

// Export the createToCryStore function for use in app.js
export { createToCryStore }

// Note: Store is registered via Alpine.data('toCryApp') in app.js
// This prevents race conditions and ensures single source of truth
