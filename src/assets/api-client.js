/**
 * Browser-compatible API Client for ToCry
 *
 * This is a hand-written client that provides a simple browser-compatible
 * interface to the ToCry API. It should stay in sync with the OpenAPI specification.
 *
 * A generated client is available in api_client/ for Node.js and future use,
 * but requires a build step for browser compatibility.
 *
 * When making API changes:
 * 1. Update the OpenAPI specification in src/openapi/
 * 2. Run ./generate_clients.sh to update generated clients
 * 3. Update this file to match any new/changed endpoints
 */

class ToCryApiClient {
  constructor (baseUrl = '') {
    this.baseUrl = baseUrl
  }

  /**
   * Helper method to make HTTP requests
   */
  async request (url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }

    const response = await fetch(fullUrl, config)

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorMessage
      } catch (e) {
        // If we can't parse JSON, use the default error message
      }
      throw new Error(errorMessage)
    }

    // For file downloads, return blob
    if (config.responseType === 'blob' || url.includes('/attachment')) {
      return response.blob()
    }

    return response.json()
  }

  /**
   * Boards API
   */

  async getBoards () {
    return this.request('/api/v1/boards')
  }

  async createBoard (name, colorScheme = null) {
    const payload = { name }
    if (colorScheme) {
      payload.color_scheme = colorScheme
    }
    return this.request('/api/v1/boards', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }

  async getBoard (boardName) {
    return this.request(`/api/v1/boards/${encodeURIComponent(boardName)}`)
  }

  async updateBoard (boardName, options = {}) {
    const payload = {}
    if (options.newName) payload.new_name = options.newName
    if (options.firstVisibleLane !== undefined) payload.first_visible_lane = options.firstVisibleLane
    if (options.showHiddenLanes !== undefined) payload.show_hidden_lanes = options.showHiddenLanes
    if (options.colorScheme) payload.color_scheme = options.colorScheme
    if (options.lanes) payload.lanes = options.lanes

    return this.request(`/api/v1/boards/${encodeURIComponent(boardName)}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  }

  async deleteBoard (boardName) {
    return this.request(`/api/v1/boards/${encodeURIComponent(boardName)}`, {
      method: 'DELETE'
    })
  }

  async shareBoard (boardName, toUserEmail) {
    return this.request(`/api/v1/boards/${encodeURIComponent(boardName)}/share`, {
      method: 'POST',
      body: JSON.stringify({ to_user_email: toUserEmail })
    })
  }

  /**
   * Notes API
   */

  async createNote (boardName, laneName, noteData) {
    const payload = {
      lane_name: laneName,
      note: noteData
    }
    return this.request(`/api/v1/boards/${encodeURIComponent(boardName)}/note`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }

  async updateNote (boardName, noteId, noteData, options = {}) {
    const payload = { note: noteData }
    if (options.laneName) payload.lane_name = options.laneName
    if (options.position !== undefined) payload.position = options.position

    return this.request(`/api/v1/boards/${encodeURIComponent(boardName)}/note/${encodeURIComponent(noteId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  }

  async deleteNote (boardName, noteId) {
    return this.request(`/api/v1/boards/${encodeURIComponent(boardName)}/note/${encodeURIComponent(noteId)}`, {
      method: 'DELETE'
    })
  }

  async attachFileToNote (boardName, noteId, file) {
    const formData = new FormData()
    formData.append('file', file)

    return this.request(`/api/v1/boards/${encodeURIComponent(boardName)}/note/${encodeURIComponent(noteId)}/attach`, {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for multipart/form-data
      body: formData
    })
  }

  async deleteAttachment (boardName, noteId, attachment) {
    return this.request(`/api/v1/boards/${encodeURIComponent(boardName)}/note/${encodeURIComponent(noteId)}/${encodeURIComponent(attachment)}`, {
      method: 'DELETE'
    })
  }

  async downloadAttachment (boardName, noteId, attachment) {
    return this.request(`/api/v1/boards/${encodeURIComponent(boardName)}/note/${encodeURIComponent(noteId)}/${encodeURIComponent(attachment)}`, {
      responseType: 'blob'
    })
  }

  async getPublicAttachment (noteId, filename) {
    return this.request(`/api/v1/attachments/${encodeURIComponent(noteId)}/${encodeURIComponent(filename)}`, {
      responseType: 'blob'
    })
  }

  /**
   * Uploads API
   */

  async uploadImage (file) {
    const formData = new FormData()
    formData.append('file', file)

    return this.request('/api/v1/upload/image', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for multipart/form-data
      body: formData
    })
  }

  /**
   * Auth API
   */

  async getAuthMode () {
    return this.request('/api/v1/auth_mode')
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ToCryApiClient
}

// Global assignment for browser usage
if (typeof window !== 'undefined') {
  window.ToCryApiClient = ToCryApiClient
}
