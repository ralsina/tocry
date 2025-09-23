/* global toastui */
import { updateNote, uploadImage } from '../api.js'
import { showNotification } from '../ui/dialogs.js'
import { createNoteCardElement } from '../render.js'
import { handleApiError, handleUIError } from '../utils/errorHandler.js'
import { initializeLanes } from './lane.js'
import { state } from './state.js'
import { noteDragAndDropCallbacks } from '../dnd/note.js'
import { handleDeleteNoteRequest, handleUpdateNoteTitleRequest, handleToggleNoteRequest } from './note-crud.js'
import { handleAttachFileRequest } from './note-attachments.js'

let toastuiEditor = null

export function handleEditNoteRequest (note) {
  const modal = document.getElementById('modal-edit-note')
  if (!modal) return

  if (toastuiEditor) {
    toastuiEditor.destroy()
    toastuiEditor = null
  }

  const form = document.getElementById('edit-note-form')
  form.dataset.noteId = note.id
  document.getElementById('edit-note-title').value = note.title
  document.getElementById('edit-note-tags').value = note.tags.join(', ')
  document.getElementById('edit-note-public').checked = note.public
  document.getElementById('edit-note-start-date').value = note.start_date || ''
  document.getElementById('edit-note-end-date').value = note.end_date || ''
  document.getElementById('edit-note-priority').value = note.priority || ''

  // Add event listeners to date inputs to ensure picker works in modal context
  const startDateInput = document.getElementById('edit-note-start-date')
  const endDateInput = document.getElementById('edit-note-end-date')

  startDateInput.addEventListener('click', (e) => {
    try {
      startDateInput.showPicker()
    } catch (err) {
      // Fallback for browsers that don't support showPicker
    }
  })

  endDateInput.addEventListener('click', (e) => {
    try {
      endDateInput.showPicker()
    } catch (err) {
      // Fallback for browsers that don't support showPicker
    }
  })

  const contentTextarea = document.getElementById('edit-note-content')
  toastuiEditor = new toastui.Editor({
    el: contentTextarea,
    height: '100%',
    initialValue: note.content,
    previewStyle: 'vertical',
    toolbarItems: [
      ['heading', 'bold', 'italic', 'strike'],
      ['hr', 'quote'],
      ['ul', 'ol', 'task'],
      ['table', 'image', 'link'],
      ['code', 'codeblock']
    ],
    hooks: {
      async addImageBlobHook (blob, callback) {
        try {
          const formData = new FormData()
          formData.append('image', blob)

          const response = await uploadImage(formData)
          const imageUrl = response.url

          callback(imageUrl, 'alt text')
        } catch (error) {
          handleUIError(error, 'Image upload failed.')
        }
      }
    }
  })

  const attachBtn = document.getElementById('edit-note-attach-btn')
  attachBtn.onclick = (e) => {
    e.stopPropagation()
    handleAttachFileRequest(note)
  }

  modal.showModal()

  const isTestMode = document.documentElement.hasAttribute('data-test-mode')
  if (!isTestMode) {
    modal.classList.add('dialog-enter')
  }
}

export function closeEditModal () {
  const modal = document.getElementById('modal-edit-note')
  if (toastuiEditor) {
    toastuiEditor.destroy()
    toastuiEditor = null
  }
  if (modal) {
    const isTestMode = document.documentElement.hasAttribute('data-test-mode')

    if (isTestMode) {
      // Skip animation in test mode
      modal.close()
    } else {
      modal.classList.add('dialog-exit')
      setTimeout(() => {
        modal.close()
        modal.classList.remove('dialog-exit', 'dialog-enter')
      }, 200) // Match the exit animation duration
    }
  }
}

export async function handleEditNoteSubmit (event) {
  event.preventDefault()
  const form = event.currentTarget
  const noteId = form.dataset.noteId

  const updatedNoteData = {
    title: document.getElementById('edit-note-title').value,
    tags: document
      .getElementById('edit-note-tags')
      .value.split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    content: toastuiEditor.getMarkdown(),
    public: document.getElementById('edit-note-public').checked,
    start_date: document.getElementById('edit-note-start-date').value || null,
    end_date: document.getElementById('edit-note-end-date').value || null,
    priority: document.getElementById('edit-note-priority').value
  }

  let noteInCache = null
  let laneOfNote = null
  for (const lane of state.currentLanes) {
    noteInCache = lane.notes.find((n) => n.id === noteId)
    if (noteInCache) {
      laneOfNote = lane
      break
    }
  }

  if (!noteInCache || !laneOfNote) {
    showNotification('Error: Could not find the note to update. Refreshing.')
    return initializeLanes()
  }

  Object.assign(noteInCache, updatedNoteData)

  const oldNoteCardElement = document.querySelector(
    `.note-card[data-note-id="${noteId}"]`
  )
  if (oldNoteCardElement) {
    const callbacks = {
      onDeleteNote: handleDeleteNoteRequest,
      onEditNote: handleEditNoteRequest,
      onUpdateNoteTitle: handleUpdateNoteTitleRequest,
      onToggleNote: handleToggleNoteRequest,
      onPermalink: handlePermalinkRequest
    }
    const newNoteCardElement = createNoteCardElement(
      noteInCache,
      laneOfNote.name,
      callbacks,
      { note: noteDragAndDropCallbacks }
    )
    oldNoteCardElement.replaceWith(newNoteCardElement)
  }

  try {
    const { id, ...notePayload } = noteInCache
    const response = await updateNote(state.currentBoardName, noteId, {
      note: notePayload,
      lane_name: null,
      position: null
    })
    if (response.ok) {
      closeEditModal()
      console.log(`Note "${noteId}" updated successfully.`)
    } else {
      await handleApiError(response, 'Failed to save note.')
    }
  } catch (error) {
    handleUIError(error, 'An unexpected error occurred while saving the note.')
    await initializeLanes()
  }
}

export async function handlePermalinkRequest (note) {
  const modal = document.getElementById('modal-permalink')
  if (!modal) return

  const permalinkUrlInput = document.getElementById('permalink-url')
  const permalinkCopyBtn = document.getElementById('permalink-copy-btn')
  const permalinkPublicSwitch = document.getElementById('permalink-public-switch')
  const permalinkCloseBtn = document.getElementById('permalink-close-btn')

  const noteUrl = `${window.location.origin}/n/${note.id}`
  permalinkUrlInput.value = noteUrl
  permalinkPublicSwitch.checked = note.public

  permalinkCopyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(noteUrl)
      showNotification('Permalink copied to clipboard!', 'success')
    } catch (err) {
      console.error('Failed to copy permalink: ', err)
      showNotification('Failed to copy permalink.', 'error')
    }
  }

  permalinkPublicSwitch.onchange = async (event) => {
    const isPublic = event.target.checked
    const updatedNoteData = { ...note, public: isPublic }
    try {
      const response = await updateNote(state.currentBoardName, note.id, {
        note: updatedNoteData,
        lane_name: null,
        position: null
      })
      if (response.ok) {
        showNotification(`Note visibility updated to ${isPublic ? 'public' : 'private'}.`, 'success')
        const lane = state.currentLanes.find((l) => l.notes.some((n) => n.id === note.id))
        if (lane) {
          const noteInCache = lane.notes.find((n) => n.id === note.id)
          if (noteInCache) {
            noteInCache.public = isPublic
          }
        }
        await initializeLanes()
      } else {
        await handleApiError(response, 'Failed to update note visibility.')
        event.target.checked = !isPublic
      }
    } catch (error) {
      handleUIError(error, 'An unexpected error occurred while updating note visibility.')
      event.target.checked = !isPublic
    }
  }

  permalinkCloseBtn.onclick = () => {
    const isTestMode = document.documentElement.hasAttribute('data-test-mode')

    if (isTestMode) {
      // Skip animation in test mode
      modal.close()
    } else {
      modal.classList.add('dialog-exit')
      setTimeout(() => {
        modal.close()
        modal.classList.remove('dialog-exit', 'dialog-enter')
      }, 200)
    }
  }

  modal.showModal()

  const isTestMode = document.documentElement.hasAttribute('data-test-mode')
  if (!isTestMode) {
    modal.classList.add('dialog-enter')
  }

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.close()
    }
  })
}
