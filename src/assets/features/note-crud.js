import { addNote, updateNote, deleteNote } from '../api.js'
import { showPrompt, showConfirmation, showNotification } from '../ui/dialogs.js'
import { handleApiError, handleUIError } from '../utils/errorHandler.js'
import { initializeLanes } from './lane.js'
import { state } from './state.js'

export async function handleToggleNoteRequest (noteToUpdate, isExpanded) {
  const updatedNoteData = { ...noteToUpdate, expanded: isExpanded }

  try {
    const response = await updateNote(state.currentBoardName, noteToUpdate.id, {
      note: updatedNoteData,
      lane_name: null,
      position: null
    })

    if (response.ok) {
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
      await handleApiError(response, 'Failed to save note state.')
      await initializeLanes()
    }
  } catch (error) {
    handleUIError(
      error,
      'An unexpected error occurred while saving the note state.'
    )
    await initializeLanes()
  }
}

export async function handleAddNoteRequest (laneName) {
  const noteTitle = await showPrompt(
    `Enter title for new note in "${laneName}":`,
    'Add New Note'
  )
  if (noteTitle !== null && noteTitle.trim() !== '') {
    try {
      const response = await addNote(
        state.currentBoardName,
        laneName,
        noteTitle.trim(),
        '',
        [],
        null, // start_date
        null, // end_date
        null // priority
      )
      if (response.ok) {
        showNotification(`Note "${noteTitle}" added successfully to lane "${laneName}".`, 'success')
        await initializeLanes()
      } else {
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

export async function handleDeleteNoteRequest (noteId, noteTitle) {
  if (
    await showConfirmation(
      `Are you sure you want to delete the note "${noteTitle}"?`,
      'Delete Note'
    )
  ) {
    try {
      const noteCard = document.querySelector(
        `.note-card[data-note-id="${noteId}"]`
      )
      if (noteCard) {
        noteCard.remove()
      }
      for (const lane of state.currentLanes) {
        const initialNoteCount = lane.notes.length
        lane.notes = lane.notes.filter((note) => note.id !== noteId)
        if (lane.notes.length < initialNoteCount) {
          state.setCurrentLanes([...state.currentLanes])
          break
        }
      }
      const response = await deleteNote(state.currentBoardName, noteId)
      if (response.ok) {
        showNotification(`Note "${noteTitle}" (ID: ${noteId}) deleted successfully.`, 'success')
        await initializeLanes()
      } else {
        await handleApiError(response, `Failed to delete note "${noteTitle}".`)
        await initializeLanes()
      }
    } catch (error) {
      console.error('Error during delete note operation:', error)
      handleUIError(error, 'An unexpected error occurred while trying to delete the note.')
    }
  }
}

export async function handleUpdateNoteTitleRequest (noteToUpdate, newTitle) {
  const trimmedNewTitle = newTitle.trim()
  if (!trimmedNewTitle) {
    return initializeLanes()
  }

  try {
    const updatedNoteData = { ...noteToUpdate, title: trimmedNewTitle }

    noteToUpdate.title = trimmedNewTitle

    const response = await updateNote(state.currentBoardName, noteToUpdate.id, {
      note: updatedNoteData,
      lane_name: null,
      position: null
    })

    if (!response.ok) {
      await handleApiError(response, 'Failed to rename note.')
      await initializeLanes()
    } else {
      console.log(`Note "${noteToUpdate.id}" title updated successfully.`)
    }
  } catch (error) {
    handleUIError(error, 'An unexpected error occurred while trying to rename the note.')
    await initializeLanes()
  }
}
