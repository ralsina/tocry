/**
 * WebSocket Client for Real-Time Board Synchronization
 *
 * Handles WebSocket connections to receive real-time updates
 * when boards or notes are modified by other clients.
 */

class ToCryWebSocketClient {
  constructor () {
    this.socket = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000 // 1 second
    this.connectedBoard = null
    this.isConnected = false
  }

  /**
   * Initialize WebSocket connection for a specific board
   * @param {string} boardName - The name of the board to connect to
   */
  connect (boardName) {
    if (this.socket && this.connectedBoard === boardName && this.isConnected) {
      // Already connected to this board
      return
    }

    // Close existing connection if it's for a different board
    if (this.socket && this.connectedBoard !== boardName) {
      this.disconnect()
    }

    this.connectedBoard = boardName
    this.reconnectAttempts = 0

    // Construct WebSocket URL with proper protocol and board parameter
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws?board=${encodeURIComponent(boardName)}`

    console.log(`Connecting to WebSocket for board: ${boardName}`)
    this.socket = new (typeof window !== 'undefined' ? window.WebSocket : require('ws'))(wsUrl)

    this.socket.onopen = () => {
      console.log(`WebSocket connected for board: ${boardName}`)
      this.isConnected = true
      this.reconnectAttempts = 0

      // Show connection indicator
      this.showConnectionStatus('Connected', 'success')
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
      this.showConnectionStatus('Disconnected', 'error')

      // Attempt to reconnect if not a normal closure
      if (event.code !== 1000 && event.code !== 1001 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect()
      }
    }

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.showConnectionStatus('Connection Error', 'error')
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
    this.hideConnectionStatus()
  }

  /**
   * Attempt to reconnect to the WebSocket
   */
  attemptReconnect () {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) // Exponential backoff

    console.log(`Attempting WebSocket reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`)
    this.showConnectionStatus(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`, 'warning')

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

    // Access Alpine store safely
    try {
      // Alpine.store('tocry') is the global store instance
      const store = window.Alpine?.store?.('tocry')
      if (!store) {
        console.warn('Alpine store not available, cannot process WebSocket message')
        return
      }

      switch (message.type) {
        case 'connected':
          console.log('WebSocket connection confirmed')
          break

        case 'board_created':
          console.log('Board created notification received')
          // Refresh board list if user is on main page
          if (store.currentBoard === null) {
            store.loadBoards()
          }
          break

        case 'board_updated':
          console.log('Board updated notification received')
          // If we're viewing this board, refresh it
          if (store.currentBoard === message.boardName) {
            store.loadBoard(message.boardName)
          }
          break

        case 'board_deleted':
          console.log('Board deleted notification received')
          // If we were viewing this board, redirect to main page
          if (store.currentBoard === message.boardName) {
            store.currentBoard = null
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
          if (store.currentBoard === message.boardName) {
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
   * Show connection status indicator
   * @param {string} message - Status message
   * @param {string} type - Status type: 'success', 'warning', 'error'
   */
  showConnectionStatus (message, type) {
    // Remove existing status indicator
    this.hideConnectionStatus()

    const indicator = document.createElement('div')
    indicator.id = 'websocket-status'
    indicator.className = `websocket-status websocket-status--${type}`
    indicator.textContent = message

    // Add styles
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      z-index: 9999;
      transition: all 0.3s ease;
    `

    // Set color based on type
    switch (type) {
      case 'success':
        indicator.style.backgroundColor = '#10b981'
        indicator.style.color = 'white'
        break
      case 'warning':
        indicator.style.backgroundColor = '#f59e0b'
        indicator.style.color = 'white'
        break
      case 'error':
        indicator.style.backgroundColor = '#ef4444'
        indicator.style.color = 'white'
        break
      default:
        indicator.style.backgroundColor = '#6b7280'
        indicator.style.color = 'white'
    }

    document.body.appendChild(indicator)

    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        this.hideConnectionStatus()
      }, 3000)
    }
  }

  /**
   * Hide connection status indicator
   */
  hideConnectionStatus () {
    const indicator = document.getElementById('websocket-status')
    if (indicator) {
      indicator.remove()
    }
  }

  /**
   * Check if WebSocket is connected
   * @returns {boolean}
   */
  isSocketConnected () {
    return this.isConnected && this.socket && this.socket.readyState === (typeof window !== 'undefined' && window.WebSocket ? window.WebSocket.OPEN : 1)
  }
}

// Create global WebSocket client instance when available
if (typeof window !== 'undefined') {
  window.toCryWebSocket = new ToCryWebSocketClient()
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ToCryWebSocketClient
}
