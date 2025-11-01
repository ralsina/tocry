/**
 * API Service Layer for ToCry Board Management
 *
 * This service provides a clean interface between the Alpine.js store
 * and the generated ToCryApiClient. It handles request deduplication,
 * loading states, and error handling consistently across all API calls.
 */

import ToCryApiClient from '../api-client-adapter.js'

export class BoardApiService {
  /**
   * Create a new BoardApiService instance
   * @param {Object} store - Alpine.js store instance for UI state updates
   * @param {Function} resolvePath - Function to resolve paths relative to base path
   */
  constructor (store, resolvePath) {
    this.store = store
    this.resolvePath = resolvePath
    this.apiClient = new ToCryApiClient()
    this.loadingStates = new Set()
    this.requestQueue = new Map()
  }

  /**
   * Generic HTTP request helper with enhanced error handling and loading states
   * @param {Function} apiCall - API call function to execute
   * @param {boolean} silent - Whether to suppress loading states and error messages
   * @returns {Promise} Result of the API call
   */
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

  /**
   * Execute the actual API request with error handling
   * @param {Function} apiCall - API call function to execute
   * @param {boolean} silent - Whether to suppress error messages
   * @param {string} requestKey - Request identifier for logging
   * @returns {Promise} Result of the API call
   */
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

  /**
   * Update loading state for a specific request
   * @param {string} requestKey - Request identifier
   * @param {boolean} isLoading - Whether the request is loading
   */
  setLoading (requestKey, isLoading) {
    if (isLoading) {
      this.loadingStates.add(requestKey)
    } else {
      this.loadingStates.delete(requestKey)
    }

    // Update global loading state
    this.store.apiLoading = this.loadingStates.size > 0
  }

  /**
   * Check if a specific request is currently loading
   * @param {string} requestKey - Request identifier
   * @returns {boolean} Whether the request is loading
   */
  isLoading (requestKey) {
    return this.loadingStates.has(requestKey)
  }

  // Board operations using generated API client

  /**
   * Get board details by name
   * @param {string} boardName - Name of the board to retrieve
   * @returns {Promise<Object>} Board details
   */
  async getBoard (boardName) {
    return this.request(() => this.apiClient.getBoard(boardName))
  }

  /**
   * Update board properties
   * @param {string} boardName - Name of the board to update
   * @param {Object} updates - Properties to update
   * @returns {Promise<Object>} Updated board details
   */
  async updateBoard (boardName, updates) {
    return this.request(() => this.apiClient.updateBoard(boardName, updates))
  }

  /**
   * Create a new board
   * @param {Object} boardData - Board data (name, color_scheme)
   * @returns {Promise<Object>} Created board details
   */
  async createBoard (boardData) {
    return this.request(() => this.apiClient.createBoard(boardData.name, boardData.color_scheme))
  }

  /**
   * Delete a board
   * @param {string} boardName - Name of the board to delete
   * @returns {Promise} Deletion result
   */
  async deleteBoard (boardName) {
    return this.request(() => this.apiClient.deleteBoard(boardName))
  }

  /**
   * Get all boards for the current user
   * @returns {Promise<Array>} Array of board objects
   */
  async getAllBoards () {
    return this.request(() => this.apiClient.getBoards())
  }

  // State-based lane management

  /**
   * Update board lanes
   * @param {string} boardName - Name of the board
   * @param {Array} lanes - Array of lane objects
   * @returns {Promise} Update result
   */
  async updateBoardLanes (boardName, lanes) {
    return this.updateBoard(boardName, { lanes })
  }

  // Note operations using generated API client

  /**
   * Create a new note
   * @param {string} boardName - Name of the board
   * @param {string} laneName - Name of the lane
   * @param {Object} noteData - Note data
   * @returns {Promise<Object>} Created note details
   */
  async createNote (boardName, laneName, noteData) {
    return this.request(() => this.apiClient.createNote(boardName, laneName, noteData))
  }

  /**
   * Update an existing note
   * @param {string} boardName - Name of the board
   * @param {string} noteId - ID of the note to update
   * @param {Object} noteData - Updated note data
   * @param {Object} options - Additional options (laneName, position)
   * @returns {Promise<Object>} Updated note details
   */
  async updateNote (boardName, noteId, noteData, options = {}) {
    return this.request(() => this.apiClient.updateNote(boardName, noteId, noteData, {
      laneName: options.laneName,
      position: options.position
    }))
  }

  /**
   * Delete a note
   * @param {string} boardName - Name of the board
   * @param {string} noteId - ID of the note to delete
   * @returns {Promise} Deletion result
   */
  async deleteNote (boardName, noteId) {
    return this.request(() => this.apiClient.deleteNote(boardName, noteId))
  }

  // File upload operations using generated API client

  /**
   * Upload an image file
   * @param {File} file - Image file to upload
   * @returns {Promise<Object>} Upload result
   */
  async uploadImage (file) {
    return this.request(() => this.apiClient.uploadImage(file))
  }

  /**
   * Attach a file to a note
   * @param {string} boardName - Name of the board
   * @param {string} noteId - ID of the note
   * @param {File} file - File to attach
   * @returns {Promise<Object>} Attachment result
   */
  async uploadAttachment (boardName, noteId, file) {
    return this.request(() => this.apiClient.attachFileToNote(boardName, noteId, file))
  }

  /**
   * Delete an attachment from a note
   * @param {string} boardName - Name of the board
   * @param {string} noteId - ID of the note
   * @param {string} attachment - Attachment filename
   * @returns {Promise} Deletion result
   */
  async deleteAttachment (boardName, noteId, attachment) {
    return this.request(() => this.apiClient.deleteAttachment(boardName, noteId, attachment))
  }

  // Version history operations

  /**
   * Get version history for a note
   * @param {string} boardName - Name of the board
   * @param {string} noteId - ID of the note
   * @returns {Promise<Array>} Array of note versions
   */
  async getNoteVersions (boardName, noteId) {
    const response = await fetch(this.resolvePath(`/api/v1/boards/${encodeURIComponent(boardName)}/note/${encodeURIComponent(noteId)}/versions`))

    if (!response.ok) {
      if (response.status === 503) {
        // Service unavailable - likely generations not enabled
        throw new Error('Version history is not available on this server. The generations feature may not be enabled.')
      }
      throw new Error(`Failed to get note versions: ${response.statusText}`)
    }

    const data = await response.json()
    return data.versions || []
  }

  /**
   * Get a specific version of a note
   * @param {string} boardName - Name of the board
   * @param {string} noteId - ID of the note
   * @param {number} generation - Generation number to retrieve
   * @returns {Promise<Object>} Note version data
   */
  async getNoteVersion (boardName, noteId, generation) {
    const response = await fetch(this.resolvePath(`/api/v1/boards/${encodeURIComponent(boardName)}/note/${encodeURIComponent(noteId)}/versions/${generation}`))

    if (!response.ok) {
      throw new Error(`Failed to get note version: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Revert a note to a specific generation
   * @param {string} boardName - Name of the board
   * @param {string} noteId - ID of the note
   * @param {number} generation - Generation number to revert to
   * @returns {Promise<Object>} Updated note data
   */
  async revertNoteToVersion (boardName, noteId, generation) {
    const response = await fetch(this.resolvePath(`/api/v1/boards/${encodeURIComponent(boardName)}/note/${encodeURIComponent(noteId)}/revert/${generation}`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 503) {
        // Service unavailable - likely generations not enabled
        throw new Error('Version history is not available on this server. The generations feature may not be enabled.')
      }
      throw new Error(`Failed to revert note: ${response.statusText}`)
    }

    return response.json()
  }

  // Auth operations using generated API client

  /**
   * Get the authentication mode for the server
   * @returns {Promise<Object>} Authentication mode details
   */
  async getAuthMode () {
    return this.request(() => this.apiClient.getAuthMode())
  }

  /**
   * Get current user information
   * Note: This endpoint doesn't exist in the generated client, uses manual fetch
   * @returns {Promise<Object>} Current user information
   */
  async getCurrentUser () {
    const response = await fetch(this.resolvePath('/api/v1/me'))

    if (!response.ok) {
      throw new Error(`Failed to get current user: ${response.statusText}`)
    }

    return response.json()
  }

  // Utility operations using generated API client

  /**
   * Share a board with another user via email
   * @param {string} boardName - Name of the board to share
   * @param {string} email - Email address to share with
   * @returns {Promise} Share result
   */
  async shareBoard (boardName, email) {
    return this.request(() => this.apiClient.shareBoard(boardName, email))
  }

  /**
   * Update board color scheme
   * @param {string} boardName - Name of the board
   * @param {string} colorScheme - New color scheme
   * @returns {Promise} Update result
   */
  async updateColorScheme (boardName, colorScheme) {
    return this.updateBoard(boardName, { color_scheme: colorScheme })
  }

  // Lane operations using generated API client

  /**
   * Create a new lane
   * @param {string} boardName - Name of the board
   * @param {string} laneName - Name of the new lane
   * @returns {Promise} Creation result
   */
  async createLane (boardName, laneName) {
    const newLanes = [...this.store.currentBoard.lanes, { name: laneName.trim() }]
    return this.updateBoard(boardName, { lanes: newLanes })
  }

  /**
   * Update an existing lane
   * @param {string} boardName - Name of the board
   * @param {string} oldLaneName - Current lane name
   * @param {Object} laneData - Updated lane data
   * @param {number} position - Lane position
   * @returns {Promise} Update result
   */
  async updateLane (boardName, oldLaneName, laneData, position) {
    const laneIndex = this.store.currentBoard.lanes.findIndex(l => l.name === oldLaneName)
    if (laneIndex === -1) return this.store.showError('Lane not found')

    const newLanes = [...this.store.currentBoard.lanes]
    newLanes[laneIndex] = { name: laneData.name || oldLaneName, position: position || 0 }
    return this.updateBoard(boardName, { lanes: newLanes })
  }

  /**
   * Delete a lane with confirmation
   * @param {string} boardName - Name of the board
   * @param {string} laneName - Name of the lane to delete
   * @returns {Promise} Deletion result
   */
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

  /**
   * Reorder lanes
   * @param {string} boardName - Name of the board
   * @param {Array} laneOrder - New lane order
   * @returns {Promise} Update result
   */
  async reorderLanes (boardName, laneOrder) {
    return this.updateBoard(boardName, { lanes: laneOrder })
  }

  // Advanced utility methods

  /**
   * Execute an operation with optimistic updates
   * @param {Function} updateFn - Function that performs the update and returns API call promise
   * @param {Function} rollbackFn - Function to rollback on error
   * @param {string} errorMessage - Error message to show on failure
   * @returns {Promise} Operation result
   */
  async withOptimisticUpdate (updateFn, rollbackFn, errorMessage = 'Operation failed') {
    const previousState = JSON.parse(JSON.stringify(this.store.currentBoard))

    try {
      // Apply optimistic update and execute API call
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

  /**
   * Create a debounced version of an update function
   * @param {Function} fn - Function to debounce
   * @param {number} delay - Debounce delay in milliseconds
   * @returns {Function} Debounced function
   */
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

export default BoardApiService
