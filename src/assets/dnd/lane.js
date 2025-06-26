import { updateLanePosition, addNote, uploadImage } from '../api.js'
import { showNotification } from '../ui/dialogs.js'
import { initializeLanes } from '../features/lane.js'
import { handleApiError, handleUIError } from '../utils/errorHandler.js'
import { state } from '../features/state.js'

// --- Drag and Drop Handlers for Lanes ---

function handleLaneDragStart (event) {
  // Set data for the drag operation
  event.dataTransfer.setData(
    'text/plain',
    event.currentTarget.dataset.laneName
  )
  event.dataTransfer.effectAllowed = 'move'
  // Add a class to the dragged element for visual feedback
  event.currentTarget.classList.add('lane--dragging')
}

function handleLaneDragOver (event) {
  // Prevent default to allow dropping
  event.preventDefault()
  // Add visual feedback to the potential drop target
  if (
    event.currentTarget.dataset.laneName !==
    event.dataTransfer.getData('text/plain')
  ) {
    event.currentTarget.classList.add('lane--drag-over')
  }
}

function handleLaneDragLeave (event) {
  // Remove visual feedback when dragging leaves the target
  event.currentTarget.classList.remove('lane--drag-over')
}

async function handleLaneDrop (event) {
  event.preventDefault()
  event.currentTarget.classList.remove('lane--drag-over')

  const targetLaneName = event.currentTarget.dataset.laneName

  // 1. Handle dropped files (e.g., images)
  if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
    const file = event.dataTransfer.files[0] // Process only the first dropped file
    if (file.type.startsWith('image/')) {
      try {
        const formData = new FormData()
        formData.append('image', file)

        const uploadResponse = await uploadImage(formData)
        const imageUrl = uploadResponse.url

        const title = file.name || 'Dropped Image'
        const content = `![${title}](${imageUrl})`

        const addNoteResponse = await addNote(
          state.currentBoardName,
          targetLaneName,
          title,
          content,
          []
        )

        if (addNoteResponse.ok) {
          showNotification('Image note created successfully!', 'success')
          await initializeLanes() // Re-render lanes to show new note
        } else {
          await handleApiError(addNoteResponse, 'Failed to create image note.')
        }
      } catch (error) {
        handleUIError(error, 'An unexpected error occurred while creating the image note.')
      }
      return // Stop processing, file drop handled
    }
  }

  const draggedLaneName = event.dataTransfer.getData('text/plain')
  // Check if the dropped text corresponds to a lane reorder (i.e., it's a lane name)
  const isLaneReorder = state.currentLanes.some(lane => lane.name === draggedLaneName)

  if (draggedLaneName && !isLaneReorder) {
    // It's plain text that is NOT a lane name, so create a new text note
    try {
      const lines = draggedLaneName.trim().split('\n')
      const title = lines[0].trim()
      const content = lines.slice(1).join('\n').trim()
      await addNote(state.currentBoardName, targetLaneName, title, content, [])
      await initializeLanes()
    } catch (error) {
      handleUIError(error, 'An unexpected error occurred while trying to create the text note.')
    }
    return // Stop processing, text note created
  }

  if (!draggedLaneName || draggedLaneName === targetLaneName) {
    return // No change needed if dropped on itself or invalid drag data
  }

  // Use the cache to determine positions
  const draggedLaneIndex = state.currentLanes.findIndex(
    (lane) => lane.name === draggedLaneName
  )
  const targetLaneIndex = state.currentLanes.findIndex(
    (lane) => lane.name === targetLaneName
  )

  if (draggedLaneIndex === -1 || targetLaneIndex === -1) {
    showNotification('Error finding lanes to move. Refreshing.')
    return initializeLanes()
  }

  const isMovingRight = draggedLaneIndex < targetLaneIndex

  // Calculate the new position for the API call.
  // The backend expects the position in the list *after* the dragged item is removed.
  const tempLanes = state.currentLanes.filter(
    (lane) => lane.name !== draggedLaneName
  )
  const targetIndexInTemp = tempLanes.findIndex(
    (lane) => lane.name === targetLaneName
  )
  const newPosition = isMovingRight ? targetIndexInTemp + 1 : targetIndexInTemp

  try {
    const response = await updateLanePosition(
      state.currentBoardName,
      draggedLaneName,
      newPosition
    )
    if (response.ok) {
      // The API call was successful. The UI is already updated optimistically.
      // We'll call initializeLanes to sync the cache and ensure consistency.
      await initializeLanes()
    } else {
      await handleApiError(response, 'Failed to move lane.')
      // Revert UI on failure
      await initializeLanes()
    }
  } catch (error) {
    // This catch is for network errors or if updateLanePosition itself throws
    handleUIError(error, 'An unexpected error occurred while moving the lane.')
    // Revert UI on failure
    await initializeLanes()
  }
}

function handleLaneDragEnd (event) {
  event.currentTarget.classList.remove('lane--dragging')
}

// Object containing all drag and drop callbacks to pass to renderLanes
export const laneDragAndDropCallbacks = {
  dragstart: handleLaneDragStart,
  dragover: handleLaneDragOver,
  dragleave: handleLaneDragLeave,
  drop: handleLaneDrop,
  dragend: handleLaneDragEnd
}
