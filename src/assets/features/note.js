/* global toastui */
import { addNote, updateNote, deleteNote, uploadImage } from '../api.js'
import {
  showPrompt,
  showConfirmation,
  showNotification
} from '../ui/dialogs.js'
import { createNoteCardElement } from '../render.js'
import { handleApiError, handleUIError } from '../utils/errorHandler.js'
import { initializeLanes } from './lane.js'
import { state } from './state.js'
import { noteDragAndDropCallbacks } from '../dnd/note.js'

// Change to toastuiEditor
let toastuiEditor = null

// Handler for persisting the expanded/collapsed state of a note
export async function handleToggleNoteRequest (noteToUpdate, isExpanded) {
  const updatedNoteData = { ...noteToUpdate, expanded: isExpanded }

  try {
    const response = await updateNote(state.currentBoardName, noteToUpdate.id, {
      note: updatedNoteData,
      lane_name: null,
      position: null
    })

    if (response.ok) {
      // On success, we don't need to re-render the whole board.
      // The UI has already been updated optimistically.
      // We just need to update our local cache to reflect the change.
      const lane = state.currentLanes.find((l) =>
        l.notes.some((n) => n.id === noteToUpdate.id)
      )
      if (lane) {
        const noteInCache = lane.notes.find((n) => n.id === noteToUpdate.id)
        if (noteInCache) {
          noteInCache.expanded = isExpanded
        }
      }
    } else {
      // If the update fails, alert the user and revert the UI by re-rendering.
      await handleApiError(response, 'Failed to save note state.')
      await initializeLanes()
    }
  } catch (error) {
    // This catch is for network errors or if updateNote itself throws
    handleUIError(
      error,
      'An unexpected error occurred while saving the note state.'
    )
    await initializeLanes() // Revert UI on failure
  }
}

// Handler for adding a new note to a lane
export async function handleAddNoteRequest (laneName) {
  const noteTitle = await showPrompt(
    `Enter title for new note in "${laneName}":`,
    'Add New Note'
  )
  if (noteTitle !== null && noteTitle.trim() !== '') {
    try {
      // Placeholder content and tags
      const response = await addNote(
        state.currentBoardName,
        laneName,
        noteTitle.trim(),
        '',
        []
      )
      if (response.ok) {
        console.log(
          `Note "${noteTitle}" added successfully to lane "${laneName}".`
        )
        await initializeLanes()
      } else {
        // API call failed
        await handleApiError(
          response,
          `Failed to add note to lane "${laneName}".`
        )
      }
    } catch (error) {
      handleUIError(error, 'An unexpected error occurred while trying to add the note.')
    }
  } else if (noteTitle !== null) {
    handleUIError(new Error('Note title cannot be empty.'), 'Note title cannot be empty.')
  }
}

// Handler for delete note requests
export async function handleDeleteNoteRequest (noteId, noteTitle) {
  if (
    await showConfirmation(
      `Are you sure you want to delete the note "${noteTitle}"?`,
      'Delete Note'
    )
  ) {
    try {
      // OPTIMISTIC UI UPDATE: Remove the note from the DOM and cache immediately.
      const noteCard = document.querySelector(
        `.note-card[data-note-id="${noteId}"]`
      )
      if (noteCard) {
        noteCard.remove()
      }
      // Update cache: find the lane and remove the note from its notes array
      for (const lane of state.currentLanes) {
        const initialNoteCount = lane.notes.length
        lane.notes = lane.notes.filter((note) => note.id !== noteId)
        if (lane.notes.length < initialNoteCount) {
          // Note was found and removed from this lane, update the cache
          state.setCurrentLanes([...state.currentLanes]) // Trigger reactivity if needed, or just ensure reference is updated
          break
        }
      }
      const response = await deleteNote(state.currentBoardName, noteId)
      if (response.ok) {
        console.log(
          `Note "${noteTitle}" (ID: ${noteId}) deleted successfully.`
        )
        await initializeLanes()
      } else {
        // API call failed
        await handleApiError(response, `Failed to delete note "${noteTitle}".`)
        await initializeLanes() // Revert UI on failure
      }
    } catch (error) {
      console.error('Error during delete note operation:', error)
      handleUIError(error, 'An unexpected error occurred while trying to delete the note.')
    }
  }
}

// Handler for creating a note from pasted text
export async function handlePasteAsNoteRequest (laneName, pastedText) {
  if (!pastedText || pastedText.trim() === '') {
    return
  }

  const lines = pastedText.trim().split('\n')
  const title = lines[0].trim()
  const content = lines.slice(1).join('\n').trim()

  if (!title) {
    showNotification(
      'Pasted text must have at least one line to be used as a title.'
    )
    return
  }

  try {
    const response = await addNote(
      state.currentBoardName,
      laneName,
      title,
      content,
      []
    )
    if (response.ok) {
      console.log(`Note "${title}" created from paste in lane "${laneName}".`)
      await initializeLanes()
    } else {
      // API call failed
      await handleApiError(response, 'Failed to create note from paste.')
    }
  } catch (error) {
    handleUIError(error, 'An unexpected error occurred while trying to create the note from paste.')
  }
}

// Handler for creating a note from a pasted image
export async function handlePasteAsImageNoteRequest (laneName, imageBlob) {
  try {
    const formData = new FormData()
    formData.append('image', imageBlob)

    const uploadResponse = await uploadImage(formData)
    const imageUrl = uploadResponse.url

    const title = 'Pasted Image'
    const content = `![Pasted Image](${imageUrl})`

    const addNoteResponse = await addNote(
      state.currentBoardName,
      laneName,
      title,
      content,
      []
    )
    if (addNoteResponse.ok) {
      console.log(
        `Note "${title}" created from pasted image in lane "${laneName}".`
      )
      await initializeLanes()
    } else {
      // API call failed
      await handleApiError(
        addNoteResponse,
        'Failed to create note from pasted image.'
      )
    }
  } catch (error) {
    handleUIError(error, 'An unexpected error occurred while trying to create the note from the pasted image.')
  }
}

// --- Note Editing Modal Handlers ---

export function handleEditNoteRequest (note) {
  const modal = document.getElementById('modal-edit-note')
  if (!modal) return

  // IMPORTANT FIX: Destroy existing editor instance if it exists
  if (toastuiEditor) {
    toastuiEditor.destroy() // Destroy the Toast UI Editor instance
    toastuiEditor = null // Clear the reference
  }

  const form = document.getElementById('edit-note-form')
  form.dataset.noteId = note.id // Store the ID for submission
  document.getElementById('edit-note-title').value = note.title
  document.getElementById('edit-note-tags').value = note.tags.join(', ')

  const contentTextarea = document.getElementById('edit-note-content')
  // Toast UI Editor takes the element directly and initialValue in options
  toastuiEditor = new toastui.Editor({
    el: contentTextarea,
    initialValue: note.content, // Pass the note content directly
    height: '300px', // Set fixed height here
    previewStyle: 'vertical', // Or 'tab'
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
          // The backend expects the file part to be named anything, 'image' is a good convention.
          formData.append('image', blob)

          const response = await uploadImage(formData)
          const imageUrl = response.url

          // The callback tells the editor to insert the image markdown with the returned URL
          callback(imageUrl, 'alt text')
        } catch (error) {
          handleUIError(error, 'Image upload failed.')
        }
      }
    }
  })

  modal.showModal() // Use the native <dialog> method to open
}

export function closeEditModal () {
  const modal = document.getElementById('modal-edit-note')
  if (toastuiEditor) {
    toastuiEditor.destroy() // Clean up the Toast UI Editor instance
    toastuiEditor = null
  }
  if (modal) {
    modal.close() // Use the native <dialog> method to close
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
    content: toastuiEditor.getMarkdown() // Get markdown content from Toast UI Editor
  }

  // Find the note in the cache and its lane
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

  // Update the note object in the cache with all new data
  Object.assign(noteInCache, updatedNoteData)

  // OPTIMISTIC UI UPDATE: Re-render the card to reflect all changes.
  // This is more robust than trying to patch the DOM manually.
  const oldNoteCardElement = document.querySelector(
    `.note-card[data-note-id="${noteId}"]`
  )
  if (oldNoteCardElement) {
    const callbacks = {
      onDeleteNote: handleDeleteNoteRequest,
      onEditNote: handleEditNoteRequest,
      onUpdateNoteTitle: handleUpdateNoteTitleRequest,
      onToggleNote: handleToggleNoteRequest
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
    await initializeLanes() // Revert UI on failure
  }
}

// Handler for updating a note's title directly from the card
export async function handleUpdateNoteTitleRequest (noteToUpdate, newTitle) {
  const trimmedNewTitle = newTitle.trim()
  if (!trimmedNewTitle) {
    return initializeLanes() // Revert if title is empty
  }

  try {
    const updatedNoteData = { ...noteToUpdate, title: trimmedNewTitle }

    // OPTIMISTIC UI UPDATE: Update the title in the local cache immediately.
    // The DOM is already updated by makeTitleEditable.
    noteToUpdate.title = trimmedNewTitle

    const response = await updateNote(state.currentBoardName, noteToUpdate.id, {
      note: updatedNoteData,
      lane_name: null,
      position: null
    })

    if (!response.ok) {
      await handleApiError(response, 'Failed to rename note.')
      await initializeLanes() // Revert UI on failure
    } else {
      console.log(`Note "${noteToUpdate.id}" title updated successfully.`)
      // UI is already updated, no full re-render needed.
    }
  } catch (error) {
    handleUIError(error, 'An unexpected error occurred while trying to rename the note.')
    await initializeLanes() // Revert UI on failure
  }
}
