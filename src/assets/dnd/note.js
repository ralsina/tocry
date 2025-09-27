import { fetchLanes, updateNote, uploadImage } from '../api.js'
import { showNotification } from '../ui/dialogs.js'
import { initializeLanes } from '../features/lane.js'
import { handleApiError, handleUIError } from '../utils/errorHandler.js'
import { state } from '../features/state.js'
import { handleDragAutoScroll, stopDragAutoScroll } from '../ui/scroll.js'

// --- Drag and Drop Handlers for Notes ---

function getDragAfterElement (container, y) {
  const draggableElements = [
    ...container.querySelectorAll('.note-card:not(.note-card--dragging)')
  ]

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect()
      const offset = y - box.top - box.height / 2
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child }
      } else {
        return closest
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element
}

function handleNoteDragStart (event) {
  event.stopPropagation() // Prevent the lane's drag handler from firing
  const noteCard = event.currentTarget
  // Set the primary data for our application
  event.dataTransfer.setData(
    'application/json',
    JSON.stringify({
      noteId: noteCard.dataset.noteId,
      originalLane: noteCard.dataset.laneName
    })
  )
  // Also set a text/plain fallback for better browser compatibility.
  // The value can be simple, like the note ID.
  event.dataTransfer.setData('text/plain', noteCard.dataset.noteId)
  event.dataTransfer.effectAllowed = 'move'

  // Add a global listener to handle auto-scrolling when dragging near the viewport edges
  document.addEventListener('dragover', handleDragAutoScroll)

  setTimeout(() => {
    noteCard.classList.add('note-card--dragging')
  }, 0)
}

function handleNoteDragOver (event) {
  // Check if we are dragging a note by looking for our specific data type.
  // The note drag handler sets 'application/json', but the lane handler does not.
  const isNoteDrag = event.dataTransfer.types.includes('application/json')

  // If we are NOT dragging a note, do not handle the event here.
  // Let it bubble up to the parent lane's dragover handler.
  if (!isNoteDrag) {
    return
  }

  event.preventDefault()
  event.stopPropagation() // Prevent the lane's dragover handler from firing
  const container = event.currentTarget.closest('.notes-list')
  if (container) {
    container.classList.add('notes-list--drag-over')
  }
}

function handleNoteDragLeave (event) {
  const container = event.currentTarget.closest('.notes-list')
  if (container) {
    container.classList.remove('notes-list--drag-over')
  }
}

async function handleNoteDrop (event) {
  event.preventDefault()

  // Handle dropped files (e.g., images)
  if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
    const targetLane = event.target.closest('.lane')
    if (!targetLane) {
      return
    }
    event.stopPropagation() // We are handling it, don't let it bubble to the lane.
    const file = event.dataTransfer.files[0]
    if (file.type.startsWith('image/')) {
      const noteCard = event.target.closest('.note-card')
      if (!noteCard) {
        return
      }
      const noteId = noteCard.dataset.noteId

      // Find note in state
      let noteToUpdate
      for (const lane of state.currentLanes) {
        noteToUpdate = lane.notes.find((n) => n.id === noteId)
        if (noteToUpdate) break
      }

      if (!noteToUpdate) {
        showNotification('Could not find the note to update.')
        return
      }

      try {
        const formData = new FormData()
        formData.append('image', file)

        const uploadResponse = await uploadImage(formData)
        const imageUrl = uploadResponse.url

        // Append image markdown to existing content
        const { id, ...notePayload } = noteToUpdate
        notePayload.content = `${noteToUpdate.content}\n\n![${file.name || 'Dropped Image'}](${imageUrl})`

        const response = await updateNote(state.currentBoardName, noteId, {
          note: notePayload,
          lane_name: null, // Not moving lane
          position: null // Not changing position
        })

        if (response.ok) {
          showNotification('Image added to note!', 'success')
          await initializeLanes() // Re-render to show updated note content
        } else {
          await handleApiError(response, 'Failed to add image to note.')
        }
      } catch (error) {
        handleUIError(
          error,
          'An unexpected error occurred while adding the image.'
        )
      }
      return // Stop processing, file drop handled
    }
  }

  // Check if the dragged data is for a note. The note drag handler sets
  // 'application/json', while the lane handler only sets 'text/plain'.
  const jsonData = event.dataTransfer.getData('application/json')
  if (!jsonData) {
    // This is not a note drop. Do nothing and let the event bubble up
    // to the lane's drop handler.
    return
  }

  // This is a note drop, so we handle it and stop it from bubbling.
  event.stopPropagation()

  const notesListContainer = event.currentTarget.closest('.notes-list')
  if (!notesListContainer) return

  notesListContainer.classList.remove('notes-list--drag-over')

  const dragData = JSON.parse(jsonData)
  const { noteId, originalLane } = dragData
  const targetLaneName = notesListContainer.dataset.laneName

  const afterElement = getDragAfterElement(notesListContainer, event.clientY)
  const allNotesInTarget = [
    ...notesListContainer.querySelectorAll('.note-card')
  ]
  let newPosition =
    afterElement == null
      ? allNotesInTarget.length
      : allNotesInTarget.indexOf(afterElement)

  const draggedElement = document.querySelector(
    `.note-card[data-note-id='${noteId}']`
  )
  if (targetLaneName === originalLane && draggedElement) {
    const originalDOMPosition = allNotesInTarget.indexOf(draggedElement)
    if (originalDOMPosition !== -1 && originalDOMPosition < newPosition) {
      newPosition--
    }
  }

  const allLanes = await fetchLanes(state.currentBoardName)
  if (!allLanes) {
    return showNotification('Could not fetch board data to complete the move.')
  }

  const originalLaneObject = allLanes.find(
    (lane) => lane.name === originalLane
  )
  const originalNoteObject = originalLaneObject?.notes.find(
    (note) => note.id === noteId
  )
  if (!originalNoteObject) {
    return showNotification('Could not find the original note data.')
  }

  const originalPositionInModel = originalLaneObject.notes.findIndex(
    (note) => note.id === noteId
  )
  if (
    targetLaneName === originalLane &&
    newPosition === originalPositionInModel
  ) {
    return
  }

  // Optimistic UI update - move the card immediately
  if (draggedElement) {
    // Remove the dragging class
    draggedElement.classList.remove('note-card--dragging')

    // Insert the element at the new position
    if (afterElement == null) {
      notesListContainer.appendChild(draggedElement)
    } else {
      notesListContainer.insertBefore(draggedElement, afterElement)
    }

    // Update the visual state immediately
    draggedElement.style.opacity = '1'
    draggedElement.style.transform = 'none'
  }

  try {
    const response = await updateNote(state.currentBoardName, noteId, {
      note: originalNoteObject,
      lane_name: targetLaneName,
      position: newPosition
    })

    if (!response.ok) {
      // If the API call failed, revert to the server state
      await handleApiError(response, 'Failed to move note.')
      await initializeLanes()
    }
    // If successful, the UI is already updated, no need to re-render
  } catch (error) {
    handleUIError(
      error,
      'An unexpected error occurred while trying to move the note.'
    )
    showNotification('An error occurred while trying to move the note.')
    // Revert to server state on error
    await initializeLanes()
  }
}

function handleNoteDragEnd (event) {
  event.currentTarget.classList.remove('note-card--dragging')
  document
    .querySelectorAll('.notes-list--drag-over')
    .forEach((el) => el.classList.remove('notes-list--drag-over'))

  // Clean up the auto-scroll listener and stop any active scrolling
  document.removeEventListener('dragover', handleDragAutoScroll)
  stopDragAutoScroll()
}

export const noteDragAndDropCallbacks = {
  dragstart: handleNoteDragStart,
  dragover: handleNoteDragOver,
  dragleave: handleNoteDragLeave,
  drop: handleNoteDrop,
  dragend: handleNoteDragEnd
}
