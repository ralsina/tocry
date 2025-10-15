// Alpine.js store for ToCry reactive app
/* global toastui, history, marked, hljs, localStorage, ResizeObserver */

// Modern API Service using generated ToCryApiClient
class BoardApiService {
  constructor (store) {
    this.store = store
    this.apiClient = new window.ToCryApiClient()
    this.loadingStates = new Set()
    this.requestQueue = new Map()
  }

  // Generic HTTP request helper with enhanced error handling and loading states
  async request (apiCall, silent = false) {
    const requestKey = apiCall.toString()

    // Manage request deduplication
    if (this.requestQueue.has(requestKey)) {
      return this.requestQueue.get(requestKey)
    }

    // Set loading state
    if (!silent) {
      this.setLoading(requestKey, true)
    }

    const requestPromise = this.executeRequest(apiCall, silent, requestKey)
    this.requestQueue.set(requestKey, requestPromise)

    try {
      const result = await requestPromise
      return result
    } finally {
      this.requestQueue.delete(requestKey)
      if (!silent) {
        this.setLoading(requestKey, false)
      }
    }
  }

  async executeRequest (apiCall, silent, requestKey) {
    try {
      return await apiCall()
    } catch (error) {
      console.error(`API request failed: ${requestKey}`, error)

      if (!silent && error.name !== 'TypeError') { // Don't show network errors twice
        this.store.showError(`Request failed: ${error.message}`)
      }
      throw error
    }
  }

  setLoading (requestKey, isLoading) {
    if (isLoading) {
      this.loadingStates.add(requestKey)
    } else {
      this.loadingStates.delete(requestKey)
    }

    // Update global loading state
    this.store.apiLoading = this.loadingStates.size > 0
  }

  isLoading (requestKey) {
    return this.loadingStates.has(requestKey)
  }

  // Board operations using generated API client
  async getBoard (boardName) {
    return this.request(() => this.apiClient.getBoard(boardName))
  }

  async updateBoard (boardName, updates) {
    return this.request(() => this.apiClient.updateBoard(boardName, updates))
  }

  async createBoard (boardData) {
    return this.request(() => this.apiClient.createBoard(boardData.name, boardData.color_scheme))
  }

  async deleteBoard (boardName) {
    return this.request(() => this.apiClient.deleteBoard(boardName))
  }

  async getAllBoards () {
    return this.request(() => this.apiClient.getBoards())
  }

  // State-based lane management
  async updateBoardLanes (boardName, lanes) {
    return this.updateBoard(boardName, { lanes })
  }

  // Note operations using generated API client
  async createNote (boardName, laneName, noteData) {
    return this.request(() => this.apiClient.createNote(boardName, laneName, noteData))
  }

  async updateNote (boardName, noteId, noteData, options = {}) {
    return this.request(() => this.apiClient.updateNote(boardName, noteId, noteData, {
      laneName: options.laneName,
      position: options.position
    }))
  }

  async deleteNote (boardName, noteId) {
    return this.request(() => this.apiClient.deleteNote(boardName, noteId))
  }

  // File upload operations using generated API client
  async uploadImage (file) {
    return this.request(() => this.apiClient.uploadImage(file))
  }

  async uploadAttachment (boardName, noteId, file) {
    return this.request(() => this.apiClient.attachFileToNote(boardName, noteId, file))
  }

  async deleteAttachment (boardName, noteId, attachment) {
    return this.request(() => this.apiClient.deleteAttachment(boardName, noteId, attachment))
  }

  // Auth operations using generated API client
  async getAuthMode () {
    return this.request(() => this.apiClient.getAuthMode())
  }

  async getCurrentUser () {
    // This endpoint doesn't exist in the generated client, keep manual fetch
    const response = await fetch(this.resolvePath('/api/v1/me'))

    if (!response.ok) {
      throw new Error(`Failed to get current user: ${response.statusText}`)
    }

    return response.json()
  }

  // Utility operations using generated API client
  async shareBoard (boardName, email) {
    return this.request(() => this.apiClient.shareBoard(boardName, email))
  }

  async updateColorScheme (boardName, colorScheme) {
    return this.updateBoard(boardName, { color_scheme: colorScheme })
  }

  // Lane operations using generated API client
  async createLane (boardName, laneName) {
    const newLanes = [...this.store.currentBoard.lanes, { name: laneName.trim() }]
    return this.updateBoard(boardName, { lanes: newLanes })
  }

  async updateLane (boardName, oldLaneName, laneData, position) {
    const laneIndex = this.store.currentBoard.lanes.findIndex(l => l.name === oldLaneName)
    if (laneIndex === -1) return this.store.showError('Lane not found')

    const newLanes = [...this.store.currentBoard.lanes]
    newLanes[laneIndex] = { name: laneData.name || oldLaneName, position: position || 0 }
    return this.updateBoard(boardName, { lanes: newLanes })
  }

  async deleteLane (boardName, laneName) {
    const confirmed = await this.store.showAlert(
      'Delete Lane',
      'Are you sure you want to delete this lane? All notes in it will be deleted.',
      'Delete Anyway'
    )
    if (!confirmed) return

    try {
      // Find the lane index
      const laneIndex = this.store.currentBoard.lanes.findIndex(l => l.name === laneName)
      if (laneIndex === -1) return this.store.showError('Lane not found')

      // Remove lane from lanes array
      const newLanes = [...this.store.currentBoard.lanes.slice(0, laneIndex), ...this.store.currentBoard.lanes.slice(laneIndex + 1)]
      return this.updateBoard(boardName, { lanes: newLanes })
    } catch (error) {
      this.store.showError('Failed to delete lane')
    }
  }

  async reorderLanes (boardName, laneOrder) {
    return this.updateBoard(boardName, { lanes: laneOrder })
  }

  // Optimistic update helper
  async withOptimisticUpdate (updateFn, rollbackFn, errorMessage = 'Operation failed') {
    const previousState = JSON.parse(JSON.stringify(this.store.currentBoard))

    try {
      // Apply optimistic update
      updateFn()

      // Execute API call
      const result = await updateFn()
      return result
    } catch (error) {
      // Rollback on error
      if (rollbackFn) {
        rollbackFn(previousState)
      }

      this.store.showError(`${errorMessage}: ${error.message}`)
      throw error
    }
  }

  // Debounced update helper
  debouncedUpdate (fn, delay = 1000) {
    let timeout
    return (...args) => {
      clearTimeout(timeout)
      return new Promise((resolve) => {
        timeout = setTimeout(async () => {
          try {
            const result = await fn(...args)
            resolve(result)
          } catch (error) {
            resolve({ error })
          }
        }, delay)
      })
    }
  }
}

// eslint-disable-next-line no-unused-vars
function createToCryStore () {
  return {
    // State
    boards: [],
    currentBoardName: '',
    currentBoard: null,
    loading: true,
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

    // WebSocket State
    webSocketConnected: false,

    // Note Title Editing Lane Context
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
      this.api = new BoardApiService(this)

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

      this.loading = true
      this.error = null
      this.boardNotFound = false

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
          showHiddenLanes: boardData.showHiddenLanes || false,
          public: boardData._public || false
        }
        console.log('Set currentBoard:', this.currentBoard)
        console.log('Board public field from API:', boardData._public)
        console.log('Current board public field after assignment:', this.currentBoard.public)

        // Apply color scheme immediately to ensure lane borders are visible (don't save to backend)
        this.updateColorScheme(false)

        this.currentBoardName = boardName
        this.boardNotFound = false

        // Set initial scroll position after DOM is updated
        if (scrollToInitialPosition) {
          this.$nextTick(() => {
            this.setInitialScrollPosition()
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
      const note = lane?.notes.find(n => n.sepiaId === this.editingNoteContent)

      if (!note || note.content === newContent) {
        this.cancelNoteContentEdit()
        return
      }

      // Declare variable in the outer scope
      let originalContent = null

      try {
        // Use optimistic updates for better UX
        originalContent = note.content
        note.content = newContent
        this.showInfo('Updating note content...')

        // Use API service to update the note
        await this.api.updateNote(this.currentBoardName, this.editingNoteContent, {
          title: note.title,
          tags: note.tags || [],
          content: newContent,
          expanded: note.expanded,
          public: note.public || false,
          start_date: note.startDate || null,
          end_date: note.endDate || null,
          priority: note.priority || null,
          attachments: note.attachments || []
        }, {
          laneName: this.editingNoteContentLane
        })

        this.showSuccess('Note content updated')
      } catch (error) {
        // Revert optimistic update on error
        if (originalContent !== null) {
          note.content = originalContent
        }
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

      // Get actual lane dimensions from DOM
      const firstLane = kanbanBoard.querySelector('.lane')
      const laneWidth = firstLane ? firstLane.offsetWidth : 280
      const boardStyle = window.getComputedStyle(kanbanBoard)
      const gapValue = boardStyle.gap || '0.75rem'
      const laneGap = parseInt(gapValue) || 12

      const viewportWidth = window.innerWidth

      // Calculate required kanban width
      const totalLanes = this.currentBoard.lanes.length
      const allLanesWidth = totalLanes * (laneWidth + laneGap)

      let requiredKanbanWidth

      if (this.currentBoard.show_hidden_lanes) {
        // When showing hidden lanes, kanban should fit all lanes or window width, whichever is larger
        requiredKanbanWidth = Math.max(allLanesWidth, viewportWidth)
      } else {
        // When hiding lanes, kanban should fit:
        // 1. All visible lanes, OR
        // 2. All hidden lanes + window width (so we can scroll hidden lanes completely off-screen)
        // 3. Window width (minimum)

        const visibleLanes = totalLanes - firstVisibleLane
        const visibleLanesWidth = visibleLanes * (laneWidth + laneGap)
        const hiddenLanesWidth = firstVisibleLane * (laneWidth + laneGap)

        requiredKanbanWidth = Math.max(
          visibleLanesWidth,
          hiddenLanesWidth + viewportWidth,
          viewportWidth
        )
      }

      // Calculate the right padding needed to achieve this width
      const currentContentWidth = allLanesWidth
      const rightPadding = Math.max(0, requiredKanbanWidth - currentContentWidth)

      kanbanBoard.style.paddingRight = `${rightPadding}px`

      console.log('Dynamic padding:', {
        firstVisibleLane,
        laneWidth,
        laneGap,
        totalLanes,
        allLanesWidth,
        viewportWidth,
        showHiddenLanes: this.currentBoard.show_hidden_lanes,
        visibleLanes: totalLanes - firstVisibleLane,
        visibleLanesWidth: (totalLanes - firstVisibleLane) * (laneWidth + laneGap),
        hiddenLanesWidth: firstVisibleLane * (laneWidth + laneGap),
        requiredKanbanWidth,
        rightPadding
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
      if (!window.toCryWebSocket) {
        console.warn('WebSocket client not available')
        return
      }

      // Disconnect from any previous board
      window.toCryWebSocket.disconnect()

      // Connect to the new board
      window.toCryWebSocket.connect(boardName)
      this.webSocketConnected = true

      console.log(`WebSocket initialized for board: ${boardName}`)
    },

    disconnectWebSocket () {
      if (window.toCryWebSocket) {
        window.toCryWebSocket.disconnect()
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

      // Get actual lane width from computed styles
      const firstLane = document.querySelector('.lane')
      const laneWidth = firstLane ? firstLane.offsetWidth : 280

      // Get gap from kanban board computed style
      const kanbanBoard = document.querySelector('.kanban-board')
      if (kanbanBoard) {
        const boardStyle = window.getComputedStyle(kanbanBoard)
        const gapValue = boardStyle.gap || '0.75rem'
        const laneGap = parseInt(gapValue) || 12

        // Position separator with its RIGHT EDGE at the LEFT EDGE of the first visible lane
        // This is simply: (laneWidth + laneGap) * laneIndex - laneGap
        return (laneWidth + laneGap) * laneIndex - laneGap
      }

      // Fallback calculation
      return laneIndex * 292 - 12 // 292 = 280+12, 12 = gap
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

      if (this.currentBoard.show_hidden_lanes) {
        // Show all lanes from the beginning
        kanbanBoard.scrollLeft = 0
      } else {
        // Scroll to position first_visible_lane at the left edge
        if (firstVisibleLane === 0) {
          kanbanBoard.scrollLeft = 0
          return
        }

        // Use same calculation as getSeparatorPosition() for consistency
        const firstLane = kanbanBoard.querySelector('.lane')
        const laneWidth = firstLane ? firstLane.offsetWidth : 280
        const boardStyle = window.getComputedStyle(kanbanBoard)
        const gapValue = boardStyle.gap || '0.75rem'
        const laneGap = parseInt(gapValue) || 12

        // Scroll position needed to bring first_visible_lane to left edge
        const scrollPosition = (laneWidth + laneGap) * firstVisibleLane
        kanbanBoard.scrollLeft = scrollPosition
      }
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

    // Toggle show_hidden_lanes property and update scroll position
    async toggleShowHiddenLanes () {
      if (!this.currentBoard) return

      // Toggle the property
      this.currentBoard.show_hidden_lanes = !this.currentBoard.show_hidden_lanes

      // Save to backend
      try {
        await this.api.updateBoard(this.currentBoardName, { showHiddenLanes: this.currentBoard.show_hidden_lanes })

        // Update scroll position after property change
        this.$nextTick(() => {
          this.setInitialScrollPosition()
        })
      } catch (error) {
        console.error('Error updating show hidden lanes:', error)
        this.showError('Failed to update show hidden lanes setting')
        // Revert the change on error
        this.currentBoard.show_hidden_lanes = !this.currentBoard.show_hidden_lanes
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
      } else {
        this.modalTitle = '🔒 Make Board Private?'
        this.modalMessage = `Making this board private will:
• Disable public access to the board
• Break any shared public links

Only you and users you've explicitly shared with will be able to access this board.`
        this.modalConfirmText = 'Make Private Anyway'
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
        // Show warning and wait for user confirmation
        const confirmed = await this.showPublicWarning('make-private')
        if (!confirmed) return

        console.log('makeBoardPrivate: confirmed, setting public to false')
        // Update the board public status
        await this.api.updateBoard(this.currentBoardName, { public: false })

        console.log('makeBoardPrivate: API call completed, reloading board...')
        // Reload board data to get updated state from server
        await this.loadBoard(this.currentBoardName)

        console.log('makeBoardPrivate: board reloaded, new public status:', this.currentBoard.public)
        // Show success message
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

// Note: Store is registered via Alpine.data('toCryApp') in app.js
// This prevents race conditions and ensures single source of truth
