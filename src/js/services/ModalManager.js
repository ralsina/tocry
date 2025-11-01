/**
 * Modal Manager for ToCry Application
 *
 * Centralized management of all modal states and interactions.
 * This module handles the different types of modals used throughout
 * the application, providing a clean interface for modal operations.
 */

export class ModalManager {
  constructor () {
    // Basic modal states
    this.showAddLane = false
    this.showNewBoardModal = false
    this.showBoardMenu = false
    this.editingNote = false
    this.showAttachmentModal = false
    this.showVersionHistory = false

    // Note editing states
    this.editingNoteTitle = null // Store note ID being edited
    this.editingNoteTitleText = ''
    this.editingNoteTitleLane = null // Store lane name for context

    this.editingNoteTags = null // Store note ID being edited
    this.editingNoteTagsText = ''
    this.editingNoteTagsLane = null // Store lane name for context
    this.addingNewTag = false

    // Attachment modal data
    this.attachmentNote = null // Store the note data for attachments modal

    // Version history modal data
    this.versionHistoryNote = null // Store the note data for version history
    this.versionHistoryLane = null // Store the lane name for context
    this.versionHistoryData = [] // Store the version history data
    this.versionHistoryLoading = false // Loading state for version history
    this.versionHistoryError = null // Error state for version history

    // Alert/confirm modal states
    this.showModal = false
    this.modalType = ''
    this.modalTitle = ''
    this.modalMessage = ''
    this.modalInput = ''
    this.modalConfirmText = 'OK'
    this.modalCancelText = 'Cancel'
    this.modalResolve = null
    this.showingPublicWarning = false
    this.publicWarningType = null
  }

  // === Basic Modal Operations ===

  /**
   * Open the Add Lane modal
   */
  openAddLaneModal () {
    this.showAddLane = true
  }

  /**
   * Close the Add Lane modal
   */
  closeAddLaneModal () {
    this.showAddLane = false
  }

  /**
   * Open the New Board modal
   */
  openNewBoardModal () {
    this.showNewBoardModal = true
  }

  /**
   * Close the New Board modal
   */
  closeNewBoardModal () {
    this.showNewBoardModal = false
  }

  /**
   * Toggle the Board Menu
   */
  toggleBoardMenu () {
    this.showBoardMenu = !this.showBoardMenu
  }

  /**
   * Close the Board Menu
   */
  closeBoardMenu () {
    this.showBoardMenu = false
  }

  // === Note Editing Modals ===

  /**
   * Start editing a note title
   * @param {string} noteId - The ID of the note being edited
   * @param {string} currentTitle - The current title of the note
   * @param {string} laneName - The name of the lane containing the note
   */
  startEditingNoteTitle (noteId, currentTitle, laneName) {
    this.editingNoteTitle = noteId
    this.editingNoteTitleText = currentTitle
    this.editingNoteTitleLane = laneName
  }

  /**
   * Stop editing a note title and save changes
   * @returns {Object|null} The title edit data or null if cancelled
   */
  finishEditingNoteTitle () {
    if (!this.editingNoteTitle || !this.editingNoteTitleText.trim()) {
      this.cancelEditingNoteTitle()
      return null
    }

    const editData = {
      noteId: this.editingNoteTitle,
      newTitle: this.editingNoteTitleText.trim(),
      laneName: this.editingNoteTitleLane
    }

    this.cancelEditingNoteTitle()
    return editData
  }

  /**
   * Cancel editing a note title
   */
  cancelEditingNoteTitle () {
    this.editingNoteTitle = null
    this.editingNoteTitleText = ''
    this.editingNoteTitleLane = null
  }

  /**
   * Check if currently editing a note title
   * @returns {boolean}
   */
  isEditingNoteTitle () {
    return this.editingNoteTitle !== null
  }

  /**
   * Start editing note tags
   * @param {string} noteId - The ID of the note being edited
   * @param {Array} currentTags - The current tags of the note
   * @param {string} laneName - The name of the lane containing the note
   */
  startEditingNoteTags (noteId, currentTags, laneName) {
    this.editingNoteTags = noteId
    this.editingNoteTagsText = currentTags ? currentTags.join(', ') : ''
    this.editingNoteTagsLane = laneName
  }

  /**
   * Stop editing note tags and save changes
   * @returns {Object|null} The tags edit data or null if cancelled
   */
  finishEditingNoteTags () {
    if (!this.editingNoteTags) {
      this.cancelEditingNoteTags()
      return null
    }

    const editData = {
      noteId: this.editingNoteTags,
      newTags: this.editingNoteTagsText,
      laneName: this.editingNoteTagsLane
    }

    this.cancelEditingNoteTags()
    return editData
  }

  /**
   * Cancel editing note tags
   */
  cancelEditingNoteTags () {
    this.editingNoteTags = null
    this.editingNoteTagsText = ''
    this.editingNoteTagsLane = null
  }

  /**
   * Check if currently editing note tags
   * @returns {boolean}
   */
  isEditingNoteTags () {
    return this.editingNoteTags !== null
  }

  // === Note Editing Modal ===

  /**
   * Open the note editing modal
   * @param {Object} note - The note object being edited
   * @param {string} laneName - The name of the lane containing the note
   */
  openEditNoteModal (note, laneName) {
    this.editingNote = true
    // Note: noteEdit and related data should be managed by the store
    // This method just handles the modal state
  }

  /**
   * Close the note editing modal
   */
  closeEditNoteModal () {
    this.editingNote = false
  }

  /**
   * Check if currently editing a note
   * @returns {boolean}
   */
  isEditingNote () {
    return this.editingNote
  }

  // === Attachment Modal ===

  /**
   * Open the attachment modal for a specific note
   * @param {Object} note - The note object for attachments
   */
  openAttachmentModal (note) {
    this.showAttachmentModal = true
    this.attachmentNote = note
  }

  /**
   * Close the attachment modal
   */
  closeAttachmentModal () {
    this.showAttachmentModal = false
    this.attachmentNote = null
  }

  /**
   * Get the current attachment note
   * @returns {Object|null}
   */
  getAttachmentNote () {
    return this.attachmentNote
  }

  // === Version History Modal ===

  /**
   * Open the version history modal for a specific note
   * @param {Object} note - The note object for version history
   * @param {string} laneName - The name of the lane containing the note
   */
  openVersionHistory (note, laneName) {
    this.showVersionHistory = true
    this.versionHistoryNote = note
    this.versionHistoryLane = laneName
    this.versionHistoryData = []
    this.versionHistoryLoading = true
    this.versionHistoryError = null
  }

  /**
   * Close the version history modal
   */
  closeVersionHistory () {
    this.showVersionHistory = false
    this.versionHistoryNote = null
    this.versionHistoryLane = null
    this.versionHistoryData = []
    this.versionHistoryLoading = false
    this.versionHistoryError = null
  }

  /**
   * Set the version history data
   * @param {Array} data - The version history data
   */
  setVersionHistoryData (data) {
    this.versionHistoryData = data
    this.versionHistoryLoading = false
    this.versionHistoryError = null
  }

  /**
   * Set version history loading state
   * @param {boolean} loading - The loading state
   */
  setVersionHistoryLoading (loading) {
    this.versionHistoryLoading = loading
    if (loading) {
      this.versionHistoryError = null
    }
  }

  /**
   * Set version history error state
   * @param {string} error - The error message
   */
  setVersionHistoryError (error) {
    this.versionHistoryError = error
    this.versionHistoryLoading = false
  }

  /**
   * Get the current version history note
   * @returns {Object|null}
   */
  getVersionHistoryNote () {
    return this.versionHistoryNote
  }

  /**
   * Get the current version history lane name
   * @returns {string|null}
   */
  getVersionHistoryLane () {
    return this.versionHistoryLane
  }

  // === Alert/Confirm Modal ===

  /**
   * Show a generic modal dialog (internal method)
   * @param {string} type - Modal type ('alert', 'confirm', 'prompt')
   * @param {string} title - Modal title
   * @param {string} message - Modal message
   * @param {string} defaultValue - Default value for prompt modals
   * @param {string} confirmText - Text for confirm button
   * @param {string} cancelText - Text for cancel button
   * @returns {Promise} Promise that resolves with user input
   */
  _showModal (type, title, message, defaultValue = '', confirmText = 'OK', cancelText = 'Cancel') {
    return new Promise((resolve) => {
      this.modalType = type
      this.modalTitle = title
      this.modalMessage = message
      this.modalInput = defaultValue
      this.modalConfirmText = confirmText
      this.modalCancelText = cancelText === 'OK' ? '' : cancelText
      this.modalResolve = resolve
      this.showModal = true
    })
  }

  /**
   * Close the current modal dialog
   * @param {*} result - The result to resolve the modal promise with
   */
  closeCurrentModal (result = null) {
    if (this.modalResolve) {
      this.modalResolve(result)
      this.modalResolve = null
    }
    this.showModal = false
    this.modalType = ''
    this.modalTitle = ''
    this.modalMessage = ''
    this.modalInput = ''
    this.modalConfirmText = 'OK'
    this.modalCancelText = 'Cancel'
    this.showingPublicWarning = false
    this.publicWarningType = null
  }

  /**
   * Show an alert dialog
   * @param {string} title - Alert title
   * @param {string} message - Alert message
   * @param {string} buttonText - Button text
   * @returns {Promise} Promise that resolves when user clicks OK
   */
  showAlert (title, message, buttonText = 'OK') {
    return this._showModal('alert', title, message, '', buttonText, '')
  }

  /**
   * Show a confirmation dialog
   * @param {string} title - Dialog title
   * @param {string} message - Dialog message
   * @param {string} confirmText - Confirm button text
   * @param {string} cancelText - Cancel button text
   * @returns {Promise<boolean>} Promise that resolves with user's choice
   */
  showConfirm (title, message, confirmText = 'OK', cancelText = 'Cancel') {
    return this._showModal('confirm', title, message, '', confirmText, cancelText)
  }

  /**
   * Show a prompt dialog
   * @param {string} title - Dialog title
   * @param {string} message - Dialog message
   * @param {string} defaultValue - Default input value
   * @param {string} confirmText - Confirm button text
   * @param {string} cancelText - Cancel button text
   * @returns {Promise<string|null>} Promise that resolves with user input
   */
  showPrompt (title, message, defaultValue = '', confirmText = 'OK', cancelText = 'Cancel') {
    return this._showModal('prompt', title, message, defaultValue, confirmText, cancelText)
  }

  // === Public Warning Modal ===

  /**
   * Show public board warning modal
   * @param {string} type - Warning type ('make-public' or 'make-private')
   */
  showPublicWarning (type) {
    this.publicWarningType = type
    this.showingPublicWarning = true
    this.modalType = 'public-warning'
    this.showModal = true

    if (type === 'make-public') {
      this.modalTitle = '⚠️ Make Board Public?'
      this.modalMessage = `Making this board public will expose:

• All notes and their content
• All attachments and files
• All lane names and structure
• Board name and color scheme

Anyone with the board URL will be able to view all content but not edit it.

Are you sure you want to proceed?`
    } else if (type === 'make-private') {
      this.modalTitle = '🔒 Make Board Private?'
      this.modalMessage = `Making this board private will:

• Remove public access immediately
• Invalidate all existing public URLs
• Require authentication to access

Only you will be able to access this board after making it private.

Are you sure you want to proceed?`
    }
  }

  /**
   * Check if currently showing any modal
   * @returns {boolean}
   */
  hasActiveModal () {
    return this.showModal ||
           this.showAddLane ||
           this.showNewBoardModal ||
           this.editingNote ||
           this.showAttachmentModal ||
           this.showVersionHistory ||
           this.showingPublicWarning ||
           this.isEditingNoteTitle() ||
           this.isEditingNoteTags()
  }

  /**
   * Close all modals at once
   */
  closeAllModals () {
    this.showAddLane = false
    this.showNewBoardModal = false
    this.showBoardMenu = false
    this.editingNote = false
    this.showAttachmentModal = false
    this.showVersionHistory = false
    this.attachmentNote = null
    this.versionHistoryNote = null
    this.versionHistoryLane = null
    this.versionHistoryData = []
    this.versionHistoryLoading = false
    this.versionHistoryError = null
    this.cancelEditingNoteTitle()
    this.cancelEditingNoteTags()
    this.addingNewTag = false
    this.closeCurrentModal()
  }

  // === Keyboard Shortcuts ===

  /**
   * Handle escape key to close modals
   * @returns {boolean} True if a modal was closed, false otherwise
   */
  handleEscapeKey () {
    if (this.isEditingNoteTitle()) {
      this.cancelEditingNoteTitle()
      return true
    }

    if (this.isEditingNoteTags()) {
      this.cancelEditingNoteTags()
      return true
    }

    if (this.showNewBoardModal) {
      this.closeNewBoardModal()
      return true
    }

    if (this.showAddLane) {
      this.closeAddLaneModal()
      return true
    }

    if (this.editingNote) {
      this.closeEditNoteModal()
      return true
    }

    if (this.showVersionHistory) {
      this.closeVersionHistory()
      return true
    }

    return false
  }

  // === State Getters ===

  /**
   * Get current modal states as an object (useful for debugging)
   * @returns {Object}
   */
  getModalStates () {
    return {
      showAddLane: this.showAddLane,
      showNewBoardModal: this.showNewBoardModal,
      showBoardMenu: this.showBoardMenu,
      editingNote: this.editingNote,
      showAttachmentModal: this.showAttachmentModal,
      showVersionHistory: this.showVersionHistory,
      editingNoteTitle: this.editingNoteTitle,
      editingNoteTags: this.editingNoteTags,
      showModal: this.showModal,
      showingPublicWarning: this.showingPublicWarning,
      publicWarningType: this.publicWarningType
    }
  }
}
