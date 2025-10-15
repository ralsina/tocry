/**
 * WebSocket Client for Real-Time Board Synchronization
 *
 * Handles WebSocket connections to receive real-time updates
 * when boards or notes are modified by other clients.
 */

class ToCryWebSocketClient {
  constructor () {
    // Prevent multiple instances
    if (window.toCryWebSocketInstance) {
      console.warn('WebSocket client instance already exists, reusing existing instance')
      return window.toCryWebSocketInstance
    }

    this.socket = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000 // 1 second
    this.connectedBoard = null
    this.isConnected = false
    this.isInitialized = false
    this.connectionInProgress = false
    this.hasConnectedOnce = false // Track if we've connected successfully before

    // Mark this instance as the global one
    window.toCryWebSocketInstance = this
  }

  /**
   * Initialize WebSocket connection for a specific board
   * @param {string} boardName - The name of the board to connect to
   */
  connect (boardName) {
    // Validate board name
    if (!boardName || typeof boardName !== 'string' || boardName.trim() === '') {
      console.error('[WebSocket] Invalid board name provided to WebSocket connect:', boardName)
      // Use toast notification instead of status indicator
      const store = this.getAlpineStore()
      if (store) store.showError('Invalid board name for WebSocket connection')
      return
    }

    // Prevent duplicate connections
    if (this.connectionInProgress) {
      return
    }

    if (this.socket && this.connectedBoard === boardName && this.isConnected) {
      return
    }

    // Close existing connection if it's for a different board
    if (this.socket && this.connectedBoard !== boardName) {
      this.disconnect()
    }

    // Wait for Alpine store to be ready before connecting
    if (!this.isStoreReady()) {
      this.connectionInProgress = true
      this.waitForStore(() => {
        this.connectionInProgress = false
        this.connect(boardName)
      })
      return
    }

    this.connectedBoard = boardName
    this.reconnectAttempts = 0
    this.connectionInProgress = true

    // Construct WebSocket URL with proper protocol and board parameter
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws?board=${encodeURIComponent(boardName)}`

    console.log(`Connecting to WebSocket for board: ${boardName}`)
    this.socket = new (typeof window !== 'undefined' ? window.WebSocket : require('ws'))(wsUrl)

    this.socket.onopen = () => {
      console.log(`WebSocket connected for board: ${boardName}`)
      this.isConnected = true
      this.connectionInProgress = false
      this.reconnectAttempts = 0
      this.hasConnectedOnce = true // Mark that we've connected successfully at least once

      // Don't show success notification - connections should be silent
      // Only show errors for connection problems
    }

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        this.handleMessage(message)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error, event.data)
      }
    }

    this.socket.onclose = (event) => {
      console.log(`WebSocket disconnected for board: ${boardName}, code: ${event.code}, reason: ${event.reason}`)
      this.isConnected = false
      this.connectionInProgress = false

      // Only show error toast for disconnection after several failed attempts (except normal closures)
      if (event.code !== 1000 && event.code !== 1001 && this.reconnectAttempts >= 2) {
        const store = this.getAlpineStore()
        if (store) store.showError('WebSocket connection lost')
      }

      // Attempt to reconnect if not a normal closure and not due to access denied
      if (event.code !== 1000 && event.code !== 1001 && event.code !== 1011 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect()
      } else if (event.code === 1011) {
        // Don't attempt reconnect for access denied errors
        console.log('WebSocket access denied, not attempting reconnection')
      }
    }

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.connectionInProgress = false

      // Only show error notification after several failed attempts
      if (this.reconnectAttempts >= 2) {
        const store = this.getAlpineStore()
        if (store) store.showError('WebSocket connection failed after multiple attempts')
      }
    }
  }

  /**
   * Disconnect from the current WebSocket
   */
  disconnect () {
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect')
      this.socket = null
    }
    this.isConnected = false
    this.connectedBoard = null
    this.connectionInProgress = false
    this.reconnectAttempts = 0
    this.hasConnectedOnce = false // Reset flag when manually disconnecting
  }

  /**
   * Attempt to reconnect to the WebSocket
   */
  attemptReconnect () {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) // Exponential backoff

    console.log(`Attempting WebSocket reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`)

    // Only show reconnection notifications if we've connected successfully before
    // This prevents annoying notifications on initial page load
    if (this.hasConnectedOnce) {
      const store = this.getAlpineStore()
      if (store) {
        store.showInfo(`Reconnecting to board... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      }
    }

    setTimeout(() => {
      if (this.connectedBoard) {
        this.connect(this.connectedBoard)
      }
    }, delay)
  }

  /**
   * Handle incoming WebSocket messages
   * @param {Object} message - The parsed WebSocket message
   */
  handleMessage (message) {
    console.log('WebSocket message received:', message)

    // Only process messages for the currently connected board
    if (message.boardName !== this.connectedBoard) {
      console.log(`Ignoring message for different board: ${message.boardName} (current: ${this.connectedBoard})`)
      return
    }

    // Access Alpine store safely - get the actual working store instance
    try {
      // Get the actual working store from Alpine.data('toCryApp')
      const store = this.getAlpineStore()
      if (!store) {
        console.error('Alpine store not available - this should not happen with proper initialization')
        // Log error but don't retry infinitely
        return
      }

      switch (message.type) {
        case 'connected':
          console.log('WebSocket connection confirmed')
          break

        case 'board_created':
          console.log('Board created notification received')
          // Refresh board list if user is on main page
          if (store.currentBoardName === null) {
            store.loadBoards()
          }
          break

        case 'board_updated':
          console.log('Board updated notification received')
          // If we're viewing this board, refresh it
          if (store.currentBoardName === message.boardName) {
            store.loadBoard(message.boardName)
          }
          break

        case 'board_deleted':
          console.log('Board deleted notification received')
          // If we were viewing this board, redirect to main page
          if (store.currentBoardName === message.boardName) {
            store.currentBoard = null
            store.currentBoardName = null
            store.board = null
            store.loadBoards()
            // Update URL to root
            window.history.pushState({}, '', '/')
          } else {
            // Refresh board list
            store.loadBoards()
          }
          break

        case 'note_created':
        case 'note_updated':
        case 'note_deleted':
        case 'lane_updated':
          console.log(`${message.type} notification received`)
          // If we're viewing this board, refresh it to get latest changes
          if (store.currentBoardName === message.boardName) {
            store.loadBoard(message.boardName)
          }
          break

        default:
          console.warn('Unknown WebSocket message type:', message.type)
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error)
    }
  }

  /**
   * Check if WebSocket is connected
   * @returns {boolean}
   */
  isSocketConnected () {
    return this.isConnected && this.socket && this.socket.readyState === (typeof window !== 'undefined' && window.WebSocket ? window.WebSocket.OPEN : 1)
  }

  /**
   * Get the actual working Alpine store instance
   * @returns {Object|null}
   */
  getAlpineStore () {
    try {
      // Try to get the store from the DOM - Alpine.data('toCryApp') creates the actual working store
      if (window.Alpine && window.Alpine.data) {
        // Look for an element with the toCryApp data in the DOM
        const appElement = document.querySelector('[x-data*="toCryApp"]') || document.querySelector('[x-data]')
        if (appElement && appElement._x_dataStack) {
          // Get the store from Alpine's internal data stack
          const toCryApp = appElement._x_dataStack.find(data => data && typeof data.loadBoards === 'function')
          if (toCryApp) {
            return toCryApp
          }
        }

        // Fallback: try to get the data directly from Alpine
        const storeData = window.Alpine.data('toCryApp')
        if (storeData && typeof storeData === 'function') {
          // Create an instance to get the store methods
          return storeData()
        }
      }
      return null
    } catch (error) {
      console.error('Error accessing Alpine store:', error)
      return null
    }
  }

  /**
   * Check if Alpine store is ready
   * @returns {boolean}
   */
  isStoreReady () {
    // Check if Alpine is initialized and we can access the store
    if (!window.Alpine || !window.Alpine.data) {
      return false
    }

    const store = this.getAlpineStore()
    return store !== null && typeof store.loadBoards === 'function'
  }

  /**
   * Wait for Alpine store to become ready
   * @param {Function} callback - Function to call when store is ready
   */
  waitForStore (callback) {
    let attempts = 0
    const maxAttempts = 50 // 2.5 seconds max wait

    const checkStore = () => {
      attempts++

      if (this.isStoreReady()) {
        callback()
        return
      }

      if (attempts >= maxAttempts) {
        console.error('Alpine store did not become ready within timeout period')
        // Use toast notification for initialization timeout
        const store = this.getAlpineStore()
        if (store) store.showError('WebSocket initialization failed')
        return
      }

      // Check again in 50ms
      setTimeout(checkStore, 50)
    }

    checkStore()
  }
}

// Create global WebSocket client instance when available (singleton pattern)
if (typeof window !== 'undefined') {
  if (!window.toCryWebSocket) {
    console.log('Creating WebSocket client instance')
    window.toCryWebSocket = new ToCryWebSocketClient()
  } else {
    console.log('WebSocket client instance already exists, reusing existing')
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ToCryWebSocketClient
}
