import { fetchLanes, addLane, deleteLane, updateLane } from '../api.js'
import { renderLanes } from '../render.js'
import { showPrompt, showConfirmation, showNotification } from '../ui/dialogs.js'
import { updateScrollButtonsVisibility } from '../ui/scroll.js'
import { state } from './state.js'
import {
  handleAddNoteRequest,
  handleDeleteNoteRequest,
  handleEditNoteRequest,
  handleUpdateNoteTitleRequest,
  handlePasteAsNoteRequest,
  handlePasteAsImageNoteRequest,
  handleToggleNoteRequest
} from './note.js'
import { laneDragAndDropCallbacks } from '../dnd/lane.js'
import { noteDragAndDropCallbacks } from '../dnd/note.js'

export async function initializeLanes (boardName = state.currentBoardName) {
  const lanesContainer = document.getElementById('lanes-container')
  const addLaneButton = document.getElementById('add-lane-btn')
  state.setBoardName(boardName) // Update the global currentBoardName
  try {
    const lanes = await fetchLanes(state.currentBoardName)
    state.currentLanes = lanes // Update the cache

    // --- Animation Cleanup ---
    // Always remove animations first to reset state on re-render.
    if (addLaneButton) addLaneButton.classList.remove('pulse-animation')
    document
      .querySelectorAll('.add-note-btn.pulse-animation')
      .forEach((btn) => {
        btn.classList.remove('pulse-animation')
      })

    if (lanes.length === 0) {
      // Board is empty, show onboarding message and animate button
      lanesContainer.innerHTML = `
                <div class="empty-board-message">
                    <article>
                        <header><h2>Welcome to your new board!</h2></header>
                        <p>This board is currently empty. Get started by adding your first lane.</p>
                        <p>Click the pulsing <strong>+</strong> button in the header to create a lane and begin organizing your notes.</p>
                    </article>
                </div>
            `
      if (addLaneButton) {
        addLaneButton.classList.add('pulse-animation')
      }
    } else {
      // Board has at least one lane, so render them all.
      const callbacks = {
        onDeleteLane: handleDeleteLaneRequest,
        onAddNote: handleAddNoteRequest,
        onDeleteNote: handleDeleteNoteRequest,
        onEditNote: handleEditNoteRequest,
        onUpdateLaneName: handleUpdateLaneNameRequest,
        onUpdateNoteTitle: handleUpdateNoteTitleRequest,
        onPasteAsNote: handlePasteAsNoteRequest,
        onPasteAsImageNote: handlePasteAsImageNoteRequest,
        onToggleNote: handleToggleNoteRequest
      }
      renderLanes(lanes, callbacks, {
        lane: laneDragAndDropCallbacks,
        note: noteDragAndDropCallbacks
      })

      // Onboarding for the first empty lane
      if (lanes.length === 1 && lanes[0].notes.length === 0) {
        const firstLaneElement = lanesContainer.querySelector('.lane')
        if (firstLaneElement) {
          const addNoteButton = firstLaneElement.querySelector('.add-note-btn')
          const notesList = firstLaneElement.querySelector('.notes-list')

          if (addNoteButton) {
            addNoteButton.classList.add('pulse-animation')
          }
          if (notesList) {
            // Replace the default "No notes" message with the onboarding one.
            notesList.innerHTML = `
                            <div class="empty-lane-message">
                                <article>
                                    <header><h4>Great! Your first lane is ready.</h4></header>
                                    <p>Now you can add your first task by clicking the pulsing <strong>+</strong> button in this lane's header.</p>
                                    <p>You can also add more lanes using the button in the main header.</p>
                                </article>
                            </div>
                        `
          }
        }
      }
    }
    // Use a timeout to ensure the browser has had time to render and calculate scrollWidth
    setTimeout(updateScrollButtonsVisibility, 100)
  } catch (error) {
    console.error('Error initializing lanes:', error)
    if (lanesContainer) {
      let errorMessage = 'Error loading lanes.'
      if (error.status) {
        // If it's an HTTP error
        errorMessage += ` Server responded with ${error.status} ${error.message}.`
        if (error.body && error.body.error) { errorMessage += ` Details: ${error.body.error}` }
      } else {
        // Generic network error
        errorMessage += ` A network or unexpected error occurred: ${error.message}.`
      }
      lanesContainer.innerHTML = `<p>${errorMessage}</p>`
    }
  }
}

export async function handleAddLaneButtonClick () {
  const laneName = await showPrompt(
    'Enter the name for the new lane:',
    'Add New Lane'
  )

  if (laneName !== null && laneName.trim() !== '') {
    // Check for null and empty string
    try {
      const response = await addLane(state.currentBoardName, laneName.trim())
      if (response.ok) {
        // Check the response status code
        console.log('Lane created successfully')
        await initializeLanes() // Re-fetch and render all lanes
        // --- Onboarding for first note ---
        // Check if this is the very first note created on this board.
        const totalNotes = state.currentLanes.reduce(
          (total, lane) => total + lane.notes.length,
          0
        )
        if (state.currentLanes.length === 1 && totalNotes === 1) {
          showNotification(
            'Great! Double-click the note to edit its content, or add more notes.',
            'info'
          )
          const firstNoteElement = document.querySelector('.note-card')
          if (firstNoteElement) {
            // Add a class for a one-time animation to draw attention.
            firstNoteElement.classList.add('pulse-animation-once')
            // Remove the class after the animation completes to keep the DOM clean.
            firstNoteElement.addEventListener(
              'animationend',
              () => {
                firstNoteElement.classList.remove('pulse-animation-once')
              },
              { once: true }
            )
          }
        }
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Failed to parse error response' }))
        console.error(
          'Failed to create lane:',
          response.status,
          response.statusText,
          errorData.error
        )
        showNotification(
          `Failed to create lane: ${errorData.error || response.statusText}`
        )
      }
    } catch (error) {
      console.error('Error creating lane:', error)
      showNotification('An error occurred while trying to create the lane.')
    }
  }
}

// Handler for delete lane requests, passed as a callback to renderLanes
export async function handleDeleteLaneRequest (laneName) {
  if (
    await showConfirmation(
      `Are you sure you want to delete the lane "${laneName}"? All notes in this lane will also be deleted.`,
      'Delete Lane'
    )
  ) {
    try {
      // OPTIMISTIC UI UPDATE: Remove the lane from the DOM and cache immediately.
      const laneElement = document.querySelector(
        `.lane[data-lane-name="${laneName}"]`
      )
      if (laneElement) {
        laneElement.remove()
      }
      // Update cache: Filter out the deleted lane
      state.setCurrentLanes(state.currentLanes.filter((lane) => lane.name !== laneName))
      // Update scroll buttons visibility as lanes might have shifted
      updateScrollButtonsVisibility()

      const response = await deleteLane(state.currentBoardName, laneName)
      if (response.ok) {
        console.log(`Lane "${laneName}" deleted successfully.`)
        await initializeLanes() // Re-fetch and render all lanes
      } else {
        const errorData = await response
          .json()
          .catch(() => ({
            error: 'Failed to parse error response from server'
          }))
        console.error(
          `Failed to delete lane "${laneName}":`,
          response.status,
          response.statusText,
          errorData.error
        )
        showNotification(
          `Failed to delete lane: ${errorData.error || response.statusText}`
        )
      }
    } catch (error) {
      // This catch is for network errors or if deleteLane itself throws
      console.error('Error during delete lane operation:', error)
      showNotification('An error occurred while trying to delete the lane.')
    }
  }
}

// Handler for updating a lane's name. This is more complex because the PUT
// endpoint requires the full lane object and its current position.
export async function handleUpdateLaneNameRequest (laneToUpdate, newName) {
  const trimmedNewName = newName.trim()
  const oldName = laneToUpdate.name

  if (!trimmedNewName || oldName === trimmedNewName) {
    return // No action needed if name is empty or unchanged
  }

  try {
    // Use the cached state to find the position, no need to fetch.
    const currentPosition = state.currentLanes.findIndex(
      (lane) => lane.name === oldName
    )

    if (currentPosition === -1) {
      showNotification(
        `Error: Could not find lane "${oldName}" to determine its position. Refreshing.`
      )
      return initializeLanes() // Refresh to be safe
    }

    const updatedLaneData = { ...laneToUpdate, name: trimmedNewName }

    // OPTIMISTIC UI UPDATE: Update the name in the local cache immediately.
    // Since render.js uses currentLanes, this will update the displayed name.
    laneToUpdate.name = trimmedNewName

    const response = await updateLane(
      state.currentBoardName,
      oldName,
      updatedLaneData,
      currentPosition
    )
    if (response.ok) {
      // On success, the UI is already updated optimistically, so no full re-render is needed.
      console.log(
        `Lane "${oldName}" successfully renamed to "${trimmedNewName}".`
      )
    } else {
      // On failure, alert the user and re-render to revert the optimistic UI change.
      const errorData = await response
        .json()
        .catch(() => ({ error: 'Failed to parse error response' }))
      showNotification(
        `Failed to rename lane: ${errorData.error || response.statusText}`
      )
      await initializeLanes() // Revert UI on failure
    }
  } catch (error) {
    showNotification('An error occurred while trying to rename the lane.')
    await initializeLanes() // Revert UI
  }
}
