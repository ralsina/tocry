/**
 * ModalManager Tests
 *
 * Comprehensive tests for the ModalManager service to ensure
 * proper modal state management, validation, and user interactions.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { ModalManager } from '../../services/ModalManager.js'

describe('ModalManager', () => {
  let modalManager

  test('should initialize with all modals closed', () => {
    modalManager = new ModalManager()

    assert.strictEqual(modalManager.showAddLane, false)
    assert.strictEqual(modalManager.showNewBoardModal, false)
    assert.strictEqual(modalManager.showBoardMenu, false)
    assert.strictEqual(modalManager.editingNote, false)
    assert.strictEqual(modalManager.showAttachmentModal, false)
  })

  test('should open and close Add Lane modal', () => {
    modalManager = new ModalManager()

    modalManager.openAddLaneModal()
    assert.strictEqual(modalManager.showAddLane, true)

    modalManager.closeAddLaneModal()
    assert.strictEqual(modalManager.showAddLane, false)
  })

  test('should open and close New Board modal', () => {
    modalManager = new ModalManager()

    modalManager.openNewBoardModal()
    assert.strictEqual(modalManager.showNewBoardModal, true)

    modalManager.closeNewBoardModal()
    assert.strictEqual(modalManager.showNewBoardModal, false)
  })

  test('should toggle Board Menu', () => {
    modalManager = new ModalManager()

    assert.strictEqual(modalManager.showBoardMenu, false)

    modalManager.toggleBoardMenu()
    assert.strictEqual(modalManager.showBoardMenu, true)

    modalManager.toggleBoardMenu()
    assert.strictEqual(modalManager.showBoardMenu, false)
  })

  test('should close Board Menu', () => {
    modalManager = new ModalManager()

    modalManager.toggleBoardMenu()
    assert.strictEqual(modalManager.showBoardMenu, true)

    modalManager.closeBoardMenu()
    assert.strictEqual(modalManager.showBoardMenu, false)
  })

  describe('Note Title Editing', () => {
    test('should start editing note title', () => {
      modalManager = new ModalManager()
      const noteId = 'note123'
      const currentTitle = 'Test Note'
      const laneName = 'Todo'

      modalManager.startEditingNoteTitle(noteId, currentTitle, laneName)

      assert.strictEqual(modalManager.editingNoteTitle, noteId)
      assert.strictEqual(modalManager.editingNoteTitleText, currentTitle)
      assert.strictEqual(modalManager.editingNoteTitleLane, laneName)
      assert.strictEqual(modalManager.isEditingNoteTitle(), true)
    })

    test('should finish editing note title with valid data', () => {
      modalManager = new ModalManager()
      const noteId = 'note123'
      const newTitle = 'Updated Note'
      const laneName = 'Todo'

      modalManager.startEditingNoteTitle(noteId, 'Old Title', laneName)
      modalManager.editingNoteTitleText = newTitle

      const result = modalManager.finishEditingNoteTitle()

      assert.deepStrictEqual(result, {
        noteId,
        newTitle,
        laneName
      })
      assert.strictEqual(modalManager.editingNoteTitle, null)
      assert.strictEqual(modalManager.editingNoteTitleText, '')
      assert.strictEqual(modalManager.editingNoteTitleLane, null)
    })

    test('should cancel editing note title when empty', () => {
      modalManager = new ModalManager()
      const noteId = 'note123'
      const laneName = 'Todo'

      modalManager.startEditingNoteTitle(noteId, 'Old Title', laneName)
      modalManager.editingNoteTitleText = '   ' // Empty/whitespace

      const result = modalManager.finishEditingNoteTitle()

      assert.strictEqual(result, null)
      assert.strictEqual(modalManager.editingNoteTitle, null)
    })

    test('should cancel editing note title when not editing', () => {
      modalManager = new ModalManager()
      const result = modalManager.finishEditingNoteTitle()
      assert.strictEqual(result, null)
    })

    test('should manually cancel editing note title', () => {
      modalManager = new ModalManager()
      modalManager.startEditingNoteTitle('note123', 'Test Note', 'Todo')
      assert.strictEqual(modalManager.isEditingNoteTitle(), true)

      modalManager.cancelEditingNoteTitle()

      assert.strictEqual(modalManager.editingNoteTitle, null)
      assert.strictEqual(modalManager.editingNoteTitleText, '')
      assert.strictEqual(modalManager.editingNoteTitleLane, null)
      assert.strictEqual(modalManager.isEditingNoteTitle(), false)
    })
  })

  describe('Note Tags Editing', () => {
    test('should start editing note tags', () => {
      modalManager = new ModalManager()
      const noteId = 'note123'
      const currentTags = ['urgent', 'frontend']
      const laneName = 'Todo'

      modalManager.startEditingNoteTags(noteId, currentTags, laneName)

      assert.strictEqual(modalManager.editingNoteTags, noteId)
      assert.strictEqual(modalManager.editingNoteTagsText, 'urgent, frontend')
      assert.strictEqual(modalManager.editingNoteTagsLane, laneName)
      assert.strictEqual(modalManager.isEditingNoteTags(), true)
    })

    test('should start editing note tags with no existing tags', () => {
      modalManager = new ModalManager()
      const noteId = 'note123'
      const currentTags = null
      const laneName = 'Todo'

      modalManager.startEditingNoteTags(noteId, currentTags, laneName)

      assert.strictEqual(modalManager.editingNoteTags, noteId)
      assert.strictEqual(modalManager.editingNoteTagsText, '')
      assert.strictEqual(modalManager.editingNoteTagsLane, laneName)
    })

    test('should finish editing note tags', () => {
      modalManager = new ModalManager()
      const noteId = 'note123'
      const newTags = 'urgent, frontend, backend'
      const laneName = 'Todo'

      modalManager.startEditingNoteTags(noteId, ['old'], laneName)
      modalManager.editingNoteTagsText = newTags

      const result = modalManager.finishEditingNoteTags()

      assert.deepStrictEqual(result, {
        noteId,
        newTags,
        laneName
      })
      assert.strictEqual(modalManager.editingNoteTags, null)
      assert.strictEqual(modalManager.editingNoteTagsText, '')
      assert.strictEqual(modalManager.editingNoteTagsLane, null)
    })

    test('should finish editing note tags even with empty input', () => {
      modalManager = new ModalManager()
      const noteId = 'note123'
      const laneName = 'Todo'

      modalManager.startEditingNoteTags(noteId, [], laneName) // Start with empty tags

      const result = modalManager.finishEditingNoteTags()

      assert.deepStrictEqual(result, {
        noteId,
        newTags: '',
        laneName
      })
    })

    test('should manually cancel editing note tags', () => {
      modalManager = new ModalManager()
      modalManager.startEditingNoteTags('note123', ['urgent'], 'Todo')
      assert.strictEqual(modalManager.isEditingNoteTags(), true)

      modalManager.cancelEditingNoteTags()

      assert.strictEqual(modalManager.editingNoteTags, null)
      assert.strictEqual(modalManager.editingNoteTagsText, '')
      assert.strictEqual(modalManager.editingNoteTagsLane, null)
      assert.strictEqual(modalManager.isEditingNoteTags(), false)
    })
  })

  describe('Note Editing Modal', () => {
    test('should open and close edit note modal', () => {
      modalManager = new ModalManager()
      assert.strictEqual(modalManager.isEditingNote(), false)

      modalManager.openEditNoteModal({ sepiaId: 'note123' }, 'Todo')
      assert.strictEqual(modalManager.editingNote, true)
      assert.strictEqual(modalManager.isEditingNote(), true)

      modalManager.closeEditNoteModal()
      assert.strictEqual(modalManager.editingNote, false)
      assert.strictEqual(modalManager.isEditingNote(), false)
    })
  })

  describe('Attachment Modal', () => {
    test('should open attachment modal with note data', () => {
      modalManager = new ModalManager()
      const note = { sepiaId: 'note123', title: 'Test Note' }

      modalManager.openAttachmentModal(note)

      assert.strictEqual(modalManager.showAttachmentModal, true)
      assert.deepStrictEqual(modalManager.getAttachmentNote(), note)
    })

    test('should close attachment modal and clear note data', () => {
      modalManager = new ModalManager()
      const note = { sepiaId: 'note123', title: 'Test Note' }

      modalManager.openAttachmentModal(note)
      assert.strictEqual(modalManager.showAttachmentModal, true)

      modalManager.closeAttachmentModal()

      assert.strictEqual(modalManager.showAttachmentModal, false)
      assert.strictEqual(modalManager.getAttachmentNote(), null)
    })

    test('should return null when no attachment note is set', () => {
      modalManager = new ModalManager()
      assert.strictEqual(modalManager.getAttachmentNote(), null)
    })
  })

  describe('Alert/Confirm/Prompt Modals', () => {
    test('should show alert modal', async () => {
      modalManager = new ModalManager()
      const promise = modalManager.showAlert('Test Alert', 'This is a test message', 'Got it')

      assert.strictEqual(modalManager.showModal, true)
      assert.strictEqual(modalManager.modalType, 'alert')
      assert.strictEqual(modalManager.modalTitle, 'Test Alert')
      assert.strictEqual(modalManager.modalMessage, 'This is a test message')
      assert.strictEqual(modalManager.modalConfirmText, 'Got it')
      assert.strictEqual(modalManager.modalCancelText, '')

      modalManager.closeCurrentModal('confirmed')
      const result = await promise

      assert.strictEqual(result, 'confirmed')
      assert.strictEqual(modalManager.showModal, false)
    })

    test('should show confirm modal', async () => {
      modalManager = new ModalManager()
      const promise = modalManager.showConfirm('Confirm Action', 'Are you sure?', 'Yes', 'No')

      assert.strictEqual(modalManager.showModal, true)
      assert.strictEqual(modalManager.modalType, 'confirm')
      assert.strictEqual(modalManager.modalTitle, 'Confirm Action')
      assert.strictEqual(modalManager.modalMessage, 'Are you sure?')
      assert.strictEqual(modalManager.modalConfirmText, 'Yes')
      assert.strictEqual(modalManager.modalCancelText, 'No')

      modalManager.closeCurrentModal(true)
      const result = await promise

      assert.strictEqual(result, true)
    })

    test('should show prompt modal', async () => {
      modalManager = new ModalManager()
      const promise = modalManager.showPrompt('Enter Value', 'Please enter your name:', 'John Doe', 'Save', 'Cancel')

      assert.strictEqual(modalManager.showModal, true)
      assert.strictEqual(modalManager.modalType, 'prompt')
      assert.strictEqual(modalManager.modalTitle, 'Enter Value')
      assert.strictEqual(modalManager.modalMessage, 'Please enter your name:')
      assert.strictEqual(modalManager.modalInput, 'John Doe')
      assert.strictEqual(modalManager.modalConfirmText, 'Save')
      assert.strictEqual(modalManager.modalCancelText, 'Cancel')

      modalManager.modalInput = 'Jane Doe'
      modalManager.closeCurrentModal('Jane Doe')
      const result = await promise

      assert.strictEqual(result, 'Jane Doe')
    })

    test('should handle modal cancellation with null result', async () => {
      modalManager = new ModalManager()
      const promise = modalManager.showConfirm('Confirm', 'Are you sure?')

      modalManager.closeCurrentModal(null)
      const result = await promise

      assert.strictEqual(result, null)
    })
  })

  describe('Public Warning Modal', () => {
    test('should show make public warning', () => {
      modalManager = new ModalManager()
      modalManager.showPublicWarning('make-public')

      assert.strictEqual(modalManager.showingPublicWarning, true)
      assert.strictEqual(modalManager.publicWarningType, 'make-public')
      assert.strictEqual(modalManager.modalType, 'public-warning')
      assert.strictEqual(modalManager.showModal, true)
      assert.strictEqual(modalManager.modalTitle, '⚠️ Make Board Public?')
      assert.ok(modalManager.modalMessage.includes('Making this board public will expose'))
    })

    test('should show make private warning', () => {
      modalManager = new ModalManager()
      modalManager.showPublicWarning('make-private')

      assert.strictEqual(modalManager.showingPublicWarning, true)
      assert.strictEqual(modalManager.publicWarningType, 'make-private')
      assert.strictEqual(modalManager.modalType, 'public-warning')
      assert.strictEqual(modalManager.showModal, true)
      assert.strictEqual(modalManager.modalTitle, '🔒 Make Board Private?')
      assert.ok(modalManager.modalMessage.includes('Making this board private will'))
    })

    test('should clear public warning when closing modal', () => {
      modalManager = new ModalManager()
      modalManager.showPublicWarning('make-public')
      assert.strictEqual(modalManager.showingPublicWarning, true)

      modalManager.closeCurrentModal()

      assert.strictEqual(modalManager.showingPublicWarning, false)
      assert.strictEqual(modalManager.publicWarningType, null)
    })
  })

  describe('Modal State Management', () => {
    test('should detect when any modal is active', () => {
      modalManager = new ModalManager()
      assert.strictEqual(modalManager.hasActiveModal(), false)

      modalManager.openAddLaneModal()
      assert.strictEqual(modalManager.hasActiveModal(), true)

      modalManager.closeAddLaneModal()
      assert.strictEqual(modalManager.hasActiveModal(), false)

      modalManager.startEditingNoteTitle('note123', 'Test', 'Todo')
      assert.strictEqual(modalManager.hasActiveModal(), true)

      modalManager.cancelEditingNoteTitle()
      assert.strictEqual(modalManager.hasActiveModal(), false)
    })

    test('should close all modals at once', () => {
      modalManager = new ModalManager()
      // Open multiple modals
      modalManager.openAddLaneModal()
      modalManager.startEditingNoteTitle('note123', 'Test', 'Todo')
      modalManager.openAttachmentModal({ sepiaId: 'note123' })
      modalManager.showAlert('Test', 'Message')

      // Verify modals are open
      assert.strictEqual(modalManager.hasActiveModal(), true)
      assert.strictEqual(modalManager.showAddLane, true)
      assert.strictEqual(modalManager.isEditingNoteTitle(), true)
      assert.strictEqual(modalManager.showAttachmentModal, true)
      assert.strictEqual(modalManager.showModal, true)

      // Close all modals
      modalManager.closeAllModals()

      // Verify all modals are closed
      assert.strictEqual(modalManager.hasActiveModal(), false)
      assert.strictEqual(modalManager.showAddLane, false)
      assert.strictEqual(modalManager.isEditingNoteTitle(), false)
      assert.strictEqual(modalManager.showAttachmentModal, false)
      assert.strictEqual(modalManager.showModal, false)
      assert.strictEqual(modalManager.getAttachmentNote(), null)
    })

    test('should return modal states for debugging', () => {
      modalManager = new ModalManager()
      modalManager.openAddLaneModal()
      modalManager.startEditingNoteTitle('note123', 'Test', 'Todo')

      const states = modalManager.getModalStates()

      assert.deepStrictEqual(states, {
        showAddLane: true,
        showNewBoardModal: false,
        showBoardMenu: false,
        editingNote: false,
        showAttachmentModal: false,
        showVersionHistory: false,
        editingNoteTitle: 'note123',
        editingNoteTags: null,
        showModal: false,
        showingPublicWarning: false,
        publicWarningType: null
      })
    })
  })

  describe('Keyboard Shortcuts', () => {
    test('should handle escape key for note title editing', () => {
      modalManager = new ModalManager()
      modalManager.startEditingNoteTitle('note123', 'Test', 'Todo')
      assert.strictEqual(modalManager.isEditingNoteTitle(), true)

      const handled = modalManager.handleEscapeKey()

      assert.strictEqual(handled, true)
      assert.strictEqual(modalManager.isEditingNoteTitle(), false)
    })

    test('should handle escape key for note tags editing', () => {
      modalManager = new ModalManager()
      modalManager.startEditingNoteTags('note123', ['urgent'], 'Todo')
      assert.strictEqual(modalManager.isEditingNoteTags(), true)

      const handled = modalManager.handleEscapeKey()

      assert.strictEqual(handled, true)
      assert.strictEqual(modalManager.isEditingNoteTags(), false)
    })

    test('should handle escape key for new board modal', () => {
      modalManager = new ModalManager()
      modalManager.openNewBoardModal()
      assert.strictEqual(modalManager.showNewBoardModal, true)

      const handled = modalManager.handleEscapeKey()

      assert.strictEqual(handled, true)
      assert.strictEqual(modalManager.showNewBoardModal, false)
    })

    test('should handle escape key for add lane modal', () => {
      modalManager = new ModalManager()
      modalManager.openAddLaneModal()
      assert.strictEqual(modalManager.showAddLane, true)

      const handled = modalManager.handleEscapeKey()

      assert.strictEqual(handled, true)
      assert.strictEqual(modalManager.showAddLane, false)
    })

    test('should handle escape key for note editing modal', () => {
      modalManager = new ModalManager()
      modalManager.openEditNoteModal({ sepiaId: 'note123' }, 'Todo')
      assert.strictEqual(modalManager.editingNote, true)

      const handled = modalManager.handleEscapeKey()

      assert.strictEqual(handled, true)
      assert.strictEqual(modalManager.editingNote, false)
    })

    test('should return false when no modals to close with escape', () => {
      modalManager = new ModalManager()
      const handled = modalManager.handleEscapeKey()
      assert.strictEqual(handled, false)
    })

    test('should handle escape key with priority order', () => {
      modalManager = new ModalManager()
      // Open multiple modals
      modalManager.openNewBoardModal()
      modalManager.startEditingNoteTitle('note123', 'Test', 'Todo')

      // Escape should close note title editing first (higher priority)
      const handled = modalManager.handleEscapeKey()

      assert.strictEqual(handled, true)
      assert.strictEqual(modalManager.isEditingNoteTitle(), false)
      assert.strictEqual(modalManager.showNewBoardModal, true) // Still open
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle multiple rapid modal operations', () => {
      modalManager = new ModalManager()
      // Rapid open/close operations
      modalManager.openAddLaneModal()
      modalManager.closeAddLaneModal()
      modalManager.openNewBoardModal()
      modalManager.closeNewBoardModal()
      modalManager.openAddLaneModal()

      assert.strictEqual(modalManager.showAddLane, true)
      assert.strictEqual(modalManager.showNewBoardModal, false)
    })

    test('should handle modal operations without note data', () => {
      modalManager = new ModalManager()
      // These should not throw errors
      assert.doesNotThrow(() => modalManager.openEditNoteModal(null, 'Todo'))
      assert.doesNotThrow(() => modalManager.openAttachmentModal(null))
      assert.doesNotThrow(() => modalManager.startEditingNoteTitle(null, null, null))
      assert.doesNotThrow(() => modalManager.startEditingNoteTags(null, null, null))
    })

    test('should handle closing modal without resolve function', () => {
      modalManager = new ModalManager()
      modalManager.showAlert('Test', 'Message')
      modalManager.modalResolve = null // Clear resolve function

      assert.doesNotThrow(() => modalManager.closeCurrentModal('result'))
      assert.strictEqual(modalManager.showModal, false)
    })

    test('should handle getting attachment note when none exists', () => {
      modalManager = new ModalManager()
      const note = modalManager.getAttachmentNote()
      assert.strictEqual(note, null)
    })
  })

  describe('State Consistency', () => {
    test('should maintain consistent state after modal operations', () => {
      modalManager = new ModalManager()
      // Open note title editing
      modalManager.startEditingNoteTitle('note123', 'Test', 'Todo')
      assert.strictEqual(modalManager.isEditingNoteTitle(), true)

      // Open attachment modal (should not affect note editing)
      modalManager.openAttachmentModal({ sepiaId: 'note456' })
      assert.strictEqual(modalManager.isEditingNoteTitle(), true)
      assert.strictEqual(modalManager.showAttachmentModal, true)

      // Close attachment modal (should not affect note editing)
      modalManager.closeAttachmentModal()
      assert.strictEqual(modalManager.isEditingNoteTitle(), true)
      assert.strictEqual(modalManager.showAttachmentModal, false)

      // Finish note editing
      modalManager.finishEditingNoteTitle()
      assert.strictEqual(modalManager.isEditingNoteTitle(), false)
    })

    test('should reset all state when closing all modals', () => {
      modalManager = new ModalManager()
      // Set up complex state
      modalManager.startEditingNoteTitle('note1', 'Title 1', 'Lane 1')
      modalManager.startEditingNoteTags('note2', ['tag1'], 'Lane 2')
      modalManager.openAttachmentModal({ sepiaId: 'note3' })
      modalManager.addingNewTag = true

      modalManager.closeAllModals()

      // Verify all state is reset
      assert.strictEqual(modalManager.editingNoteTitle, null)
      assert.strictEqual(modalManager.editingNoteTitleText, '')
      assert.strictEqual(modalManager.editingNoteTitleLane, null)
      assert.strictEqual(modalManager.editingNoteTags, null)
      assert.strictEqual(modalManager.editingNoteTagsText, '')
      assert.strictEqual(modalManager.editingNoteTagsLane, null)
      assert.strictEqual(modalManager.showAttachmentModal, false)
      assert.strictEqual(modalManager.attachmentNote, null)
      assert.strictEqual(modalManager.addingNewTag, false)
    })
  })
})
