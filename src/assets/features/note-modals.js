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

  // Set up public toggle permalink functionality
  const publicToggle = document.getElementById('edit-note-public')
  const modalHeader = document.querySelector('#modal-edit-note .edit-note-modal-header')

  // Create permalink button and add it to the header
  let permalinkButton = document.getElementById('edit-note-permalink-btn')
  if (!permalinkButton) {
    permalinkButton = document.createElement('button')
    permalinkButton.id = 'edit-note-permalink-btn'
    permalinkButton.className = 'permalink-btn edit-note-btn'
    permalinkButton.type = 'button'
    permalinkButton.setAttribute('aria-label', 'Copy permalink to clipboard')

    // Add the same SVG icon used in the board display
    permalinkButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm200 160v-80h160q50 0 85-35t35-85q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280H520Z"/></svg>'

    // Insert it before the public switch label
    const publicSwitchLabel = document.querySelector('.edit-note-public-switch-label')
    publicSwitchLabel.insertAdjacentElement('beforebegin', permalinkButton)
  }

  // Function to update permalink visibility
  const updatePermalinkVisibility = () => {
    const permalinkUrl = `${window.location.origin}/n/${note.id}`

    if (publicToggle.checked) {
      permalinkButton.disabled = false
      permalinkButton.title = 'Copy permalink to clipboard'
      permalinkButton.style.opacity = '1'

      // Remove existing event listener to avoid duplicates
      const newButton = permalinkButton.cloneNode(true)
      permalinkButton.replaceWith(newButton)
      permalinkButton = document.getElementById('edit-note-permalink-btn')

      // Add copy functionality
      permalinkButton.onclick = async (e) => {
        e.stopPropagation()
        try {
          await navigator.clipboard.writeText(permalinkUrl)
          // Temporarily change the SVG to show success
          const originalSvg = permalinkButton.innerHTML
          permalinkButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>'
          permalinkButton.title = 'Link copied!'
          setTimeout(() => {
            permalinkButton.innerHTML = originalSvg
            permalinkButton.title = 'Copy permalink to clipboard'
          }, 2000)
        } catch (err) {
          console.error('Failed to copy permalink: ', err)
          const originalSvg = permalinkButton.innerHTML
          permalinkButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="m406-288-86-86 14-14q8-8 8-18t-8-18l-86-86-14 14q-8 8-18 8t-18-8l-56-56q-8-8-8-18t8-18l56-56q8-8 18-8t18 8l14 14 86-86 86-86-14-14q-8-8-8-18t8-18l56-56q8-8 18-8t18 8l56 56q8 8 8 18t-8 18l-14 14 86 86 86-86-14-14q-8-8-8-18t8-18l56-56q8-8 18-8t18 8l56 56q8 8 8 18t-8 18l-14 14 86 86-86 86 14 14q8 8 8 18t-8 18l-56 56q-8 8-18 8t-18-8l-14-14-86 86Z"/></svg>'
          permalinkButton.title = 'Failed to copy link'
          setTimeout(() => {
            permalinkButton.innerHTML = originalSvg
            permalinkButton.title = 'Copy permalink to clipboard'
          }, 2000)
        }
      }
    } else {
      permalinkButton.disabled = true
      permalinkButton.title = 'Enable public sharing to copy link'
      permalinkButton.style.opacity = '0.4'
      permalinkButton.onclick = null
    }
  }

  // Set initial state and add event listeners
  updatePermalinkVisibility()

  // Add immediate public toggle functionality
  publicToggle.addEventListener('change', async (event) => {
    const isPublic = event.target.checked
    try {
      // Immediately update the note's public status
      const response = await updateNote(state.currentBoardName, note.id, {
        note: { ...note, public: isPublic },
        lane_name: null,
        position: null
      })

      if (response.ok) {
        // Update the note in cache
        for (const lane of state.currentLanes) {
          const noteInCache = lane.notes.find(n => n.id === note.id)
          if (noteInCache) {
            noteInCache.public = isPublic
            break
          }
        }

        // Show success notification
        showNotification(`Note ${isPublic ? 'made public' : 'made private'}.`, 'success')

        // Re-render lanes to update the permalink button visibility
        await initializeLanes()
      } else {
        // Revert the toggle if the update failed
        event.target.checked = !isPublic
        await handleApiError(response, `Failed to ${isPublic ? 'make public' : 'make private'}.`)
      }
    } catch (error) {
      // Revert the toggle if there was an error
      event.target.checked = !isPublic
      handleUIError(error, `An unexpected error occurred while ${isPublic ? 'making public' : 'making private'}.`)
    }

    // Update permalink visibility after the toggle
    updatePermalinkVisibility()
  })

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
