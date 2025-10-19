/**
 * Adapter for TypeScript-generated API Client
 *
 * This adapter wraps the auto-generated TypeScript client to provide
 * the same interface as the old hand-written ToCryApiClient, ensuring
 * backward compatibility with existing frontend code.
 *
 * The generated client is compiled from src/assets/api_client_ts/
 * and provides full type safety and automatic OpenAPI sync.
 */

// Import the generated client APIs
import {
  BoardsApi,
  NotesApi,
  UploadsApi,
  AuthenticationApi,
  Configuration
} from '../assets/api_client_ts_dist/index.js'

// Base path detection for reverse proxy subfolder support
function getBasePath () {
  if (window.tocryBasePath !== undefined) {
    return window.tocryBasePath
  }

  const path = window.location.pathname
  if (path.startsWith('/b/') || path.startsWith('/n/') || path === '/') {
    // Root deployment - no subfolder
    window.tocryBasePath = ''
    return ''
  }

  // Extract base path for subfolder deployment
  // Match patterns like /subfolder/, /subfolder/b/, /subfolder/n/
  const match = path.match(/^(\/[^/]+)/)
  if (match) {
    window.tocryBasePath = match[1]
    return match[1]
  }

  window.tocryBasePath = ''
  return ''
}

class ToCryApiClient {
  constructor (baseUrl = '') {
    const basePath = getBasePath()
    const fullBasePath = basePath ? `${window.location.origin}${basePath}` : (baseUrl || window.location.origin)

    // Get client ID from Alpine store for WebSocket echo prevention
    const getApiClientClientId = () => {
      try {
        // Try to access the Alpine store that contains the client ID
        if (window.Alpine && window.Alpine.store) {
          const store = window.Alpine.store('toCryApp')
          if (store && store.clientId) {
            return store.clientId
          }
        }

        // Fallback: try to get from any element with toCryApp data
        const appElement = document.querySelector('[x-data*="toCryApp"]')
        if (appElement && appElement._x_dataStack) {
          const store = appElement._x_dataStack.find(data => data && data.clientId)
          if (store && store.clientId) {
            return store.clientId
          }
        }

        // Fallback: try global instance if it exists
        if (window.toCryStoreInstance && window.toCryStoreInstance.clientId) {
          return window.toCryStoreInstance.clientId
        }

        console.warn('Could not retrieve client ID from Alpine store for API client')
        return null
      } catch (error) {
        console.error('Error getting client ID for API client:', error)
        return null
      }
    }

    const clientId = getApiClientClientId()

    // Add X-ToCry-Client-ID header if client ID is available
    const headers = clientId ? { 'X-ToCry-Client-ID': clientId } : {}

    const config = new Configuration({
      basePath: fullBasePath,
      headers
    })

    this.boardsApi = new BoardsApi(config)
    this.notesApi = new NotesApi(config)
    this.uploadsApi = new UploadsApi(config)
    this.authApi = new AuthenticationApi(config)
  }

  /**
   * Boards API
   */

  async getBoards () {
    // The generated client returns the whole response object
    const response = await this.boardsApi.getBoardsList()
    // Return just the boards array (API returns array directly)
    return response
  }

  async createBoard (name, colorScheme = null) {
    const payload = { name }
    if (colorScheme) {
      payload.colorScheme = colorScheme
    }
    const response = await this.boardsApi.createBoard({
      boardCreateRequest: payload
    })
    return response
  }

  async getBoard (boardName) {
    const response = await this.boardsApi.getBoardDetails({
      boardName
    })
    // The API returns the board object directly in camelCase
    return response
  }

  async updateBoard (boardName, options = {}) {
    // Build payload with camelCase for TypeScript client
    // The TS client will convert to snake_case when serializing to JSON
    const payload = {}
    if (options.newName) payload.newName = options.newName
    if (options.firstVisibleLane !== undefined) payload.firstVisibleLane = options.firstVisibleLane
    if (options.colorScheme) payload.colorScheme = options.colorScheme
    if (options.lanes) payload.lanes = options.lanes
    if (options.public !== undefined) payload._public = options.public

    const response = await this.boardsApi.updateBoard({
      boardName,
      boardUpdateRequest: payload
    })

    return response
  }

  async deleteBoard (boardName) {
    const response = await this.boardsApi.deleteBoard({
      boardName
    })
    return response
  }

  async shareBoard (boardName, toUserEmail) {
    const response = await this.boardsApi.shareBoard({
      boardName,
      boardShareRequest: { toUserEmail }
    })
    return response
  }

  /**
   * Notes API
   */

  async createNote (boardName, laneName, noteData) {
    const response = await this.notesApi.createNote({
      boardName,
      noteCreateRequest: {
        laneName,
        note: noteData
      }
    })
    return response
  }

  async updateNote (boardName, noteId, noteData, options = {}) {
    const payload = { note: noteData }
    if (options.laneName) payload.laneName = options.laneName
    if (options.position !== undefined) payload.position = options.position

    const response = await this.notesApi.updateNote({
      boardName,
      noteId,
      noteUpdateRequest: payload
    })
    return response
  }

  async deleteNote (boardName, noteId) {
    const response = await this.notesApi.deleteNote({
      boardName,
      noteId
    })
    return response
  }

  async attachFileToNote (boardName, noteId, file) {
    const response = await this.notesApi.attachFileToNote({
      boardName,
      noteId,
      file
    })
    return response
  }

  async deleteAttachment (boardName, noteId, attachment) {
    const response = await this.notesApi.deleteNoteAttachment({
      boardName,
      noteId,
      attachment
    })
    return response
  }

  async downloadAttachment (boardName, noteId, attachment) {
    // The generated client returns a Blob directly for binary data
    const blob = await this.notesApi.downloadNoteAttachment({
      boardName,
      noteId,
      attachment
    })
    return blob
  }

  async getPublicAttachment (noteId, filename) {
    // The generated client returns a Blob directly for binary data
    const blob = await this.notesApi.getPublicAttachment({
      noteId,
      filename
    })
    return blob
  }

  /**
   * Uploads API
   */

  async uploadImage (file) {
    const response = await this.uploadsApi.uploadImage({
      file
    })
    return response
  }

  /**
   * Auth API
   */

  async getAuthMode () {
    const response = await this.authApi.getAuthMode()
    return response
  }
}

// Export for use in other modules
export default ToCryApiClient

// Global assignment for browser usage (backward compatibility)
if (typeof window !== 'undefined') {
  window.ToCryApiClient = ToCryApiClient
}
