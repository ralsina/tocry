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

// Use dynamic import to load the generated client APIs
// This allows the file to be loaded as a regular script, not a module
(async function () {
  const {
    BoardsApi,
    NotesApi,
    UploadsApi,
    AuthenticationApi,
    Configuration
  } = await import('../../../../../../api_client_ts_dist/index.js')

  class ToCryApiClient {
    constructor (baseUrl = '') {
      const config = new Configuration({
        basePath: baseUrl || window.location.origin
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
      if (options.showHiddenLanes !== undefined) payload.showHiddenLanes = options.showHiddenLanes
      if (options.colorScheme) payload.colorScheme = options.colorScheme
      if (options.lanes) payload.lanes = options.lanes

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

  // Global assignment for browser usage
  if (typeof window !== 'undefined') {
    window.ToCryApiClient = ToCryApiClient
  }
})() // Close the async IIFE
