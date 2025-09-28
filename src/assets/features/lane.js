import { fetchLanes, addLane, deleteLane, updateLane } from '../api.js'
import { renderLanes } from '../render.js'
import {
  showPrompt,
  showConfirmation,
  showNotification
} from '../ui/dialogs.js'
import { handleApiError, handleUIError } from '../utils/errorHandler.js'
import { updateScrollButtonsVisibility } from '../ui/scroll.js'
import { state } from './state.js'
import {
  handleAddNoteRequest,
  handleDeleteNoteRequest,
  handleToggleNoteRequest,
  handleUpdateNoteTitleRequest
} from './note-crud.js'
import {
  handleEditNoteRequest,
  handlePermalinkRequest
} from './note-modals.js'
import { handleAttachFileRequest } from './note.js'
import {
  handlePasteAsNoteRequest,
  handlePasteAsImageNoteRequest
} from './note-paste.js'
import { laneDragAndDropCallbacks } from '../dnd/lane.js'
import { noteDragAndDropCallbacks } from '../dnd/note.js'
import { initializeBoardSelector, addBoard, selectBoard } from './board.js' // Import selectBoard

// New function to handle creating the first board
async function handleCreateFirstBoardClick () {
  const boardName = await showPrompt(
    'Enter the name for your first board:',
    'Create New Board'
  )

  if (boardName === null || boardName.trim() === '') {
    showNotification('Board creation cancelled or name was empty.', 'info')
    return
  }

  try {
    const newBoardName = await addBoard(boardName) // Call the core addBoard function
    await initializeBoardSelector() // Re-populate board selector to include the new board
    await selectBoard(newBoardName) // Use selectBoard to update UI and URL
  } catch (error) {
    handleUIError(
      error,
      'An unexpected error occurred while trying to create the board.'
    )
  }
}

export async function initializeLanes (boardName = state.currentBoardName) {
  const lanesContainer = document.getElementById('lanes-container')
  const addLaneButton = document.getElementById('add-lane-btn')
  const isReadOnlyMode = window.tocryConfig && window.tocryConfig.readOnlyMode === true

  // If boardName is null (meaning no boards exist at all), display the welcome message directly
  if (!boardName) {
    lanesContainer.innerHTML = `
                <div class="empty-board-message">
                    <article>
                        <header><h2>Welcome to ToCry.</h2></header>
                        <p>You have no boards yet, you can create one by clicking this button</p>
                        <button id="create-first-board-btn" class="primary">Create Your First Board</button>
                    </article>
                </div>
            `
    if (addLaneButton) {
      // addLaneButton.classList.add('pulse-animation') // Removed as new button is primary CTA
      // Ensure the addLaneButton is not pulsing if there are no boards to add lanes to
      addLaneButton.classList.remove('pulse-animation')
    }
    const createFirstBoardBtn = document.getElementById(
      'create-first-board-btn'
    )
    if (createFirstBoardBtn) {
      createFirstBoardBtn.addEventListener(
        'click',
        handleCreateFirstBoardClick
      )
    }
    return // Exit early, no lanes to fetch for a non-existent board (no boards at all)
  }

  state.setBoardName(boardName) // Update the global currentBoardName
  try {
    let lanes
    if (isReadOnlyMode) {
      // For public boards, get lanes from the public board data
      const pathParts = window.location.pathname.split('/')
      if (pathParts[1] === 'public' && pathParts[2] === 'boards' && pathParts[3]) {
        const uuid = pathParts[3]
        const response = await fetch(`/public/boards/${uuid}/data`)
        if (response.ok) {
          const boardData = await response.json()
          lanes = boardData.lanes || []
        } else {
          lanes = []
        }
      } else {
        lanes = []
      }
    } else {
      lanes = await fetchLanes(state.currentBoardName)
    }
    state.currentLanes = lanes // Update the cache

    // --- Animation Cleanup ---
    // Always remove animations first to reset state on re-render.
    if (addLaneButton) {
      addLaneButton.style.display = '' // Ensure the button is visible
      addLaneButton.classList.remove('pulse-animation')
    }
    document
      .querySelectorAll('.add-note-btn.pulse-animation')
      .forEach((btn) => {
        btn.classList.remove('pulse-animation')
      })
    if (lanes.length === 0) {
      // This block is still useful if a board exists but has no lanes
      // Board is empty, show onboarding message for adding first lane
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
      // If there are lanes, render them
      // Board has at least one lane, so render them all.
      const callbacks = {
        onDeleteLane: isReadOnlyMode ? null : handleDeleteLaneRequest,
        onAddNote: isReadOnlyMode ? null : handleAddNoteRequest,
        onDeleteNote: isReadOnlyMode ? null : handleDeleteNoteRequest,
        onEditNote: isReadOnlyMode ? null : handleEditNoteRequest,
        onUpdateLaneName: isReadOnlyMode ? null : handleUpdateLaneNameRequest,
        onUpdateNoteTitle: isReadOnlyMode ? null : handleUpdateNoteTitleRequest,
        onPasteAsNote: isReadOnlyMode ? null : handlePasteAsNoteRequest,
        onPasteAsImageNote: isReadOnlyMode ? null : handlePasteAsImageNoteRequest,
        onToggleNote: isReadOnlyMode ? null : handleToggleNoteRequest,
        onPermalink: handlePermalinkRequest,
        onAttachFile: isReadOnlyMode ? null : handleAttachFileRequest
      }
      renderLanes(lanes, callbacks, {
        lane: isReadOnlyMode ? null : laneDragAndDropCallbacks,
        note: isReadOnlyMode ? null : noteDragAndDropCallbacks
      })

      // Onboarding for the first empty lane (only in edit mode)
      if (!isReadOnlyMode && lanes.length === 1 && lanes[0].notes.length === 0) {
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
    // This catch is for network errors or if fetchLanes itself throws
    handleUIError(error, 'Failed to load lanes.')
    // Display a generic error message in the container, without touching the empty state messages
    lanesContainer.innerHTML = `<p class="error-message">${
      error.message || 'Failed to load lanes due to an unexpected error.'
    }</p>`
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

        // Animate the newly created lane
        const newLaneElement = document.querySelector(`.lane[data-lane-name="${laneName.trim()}"]`)
        if (newLaneElement) {
          newLaneElement.classList.add('lane-enter')
          // Remove the animation class after animation completes
          newLaneElement.addEventListener('animationend', () => {
            newLaneElement.classList.remove('lane-enter')
          }, { once: true })
        }

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
        // API call failed
        await handleApiError(response, 'Failed to create lane.')
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
      // Find the lane element to animate
      const laneElement = document.querySelector(
        `.lane[data-lane-name="${laneName}"]`
      )

      if (laneElement) {
        // Start the exit animation
        laneElement.classList.add('lane-exit')

        // Wait for animation to complete before removing from DOM
        await new Promise((resolve) => {
          laneElement.addEventListener('animationend', () => {
            laneElement.remove()
            resolve()
          }, { once: true })

          // Fallback timeout in case animation doesn't fire
          setTimeout(() => {
            if (laneElement.parentNode) {
              laneElement.remove()
            }
            resolve()
          }, 400) // Slightly longer than animation duration
        })
      }

      // Update cache: Filter out the deleted lane
      state.setCurrentLanes(
        state.currentLanes.filter((lane) => lane.name !== laneName)
      )
      // Update scroll buttons visibility as lanes might have shifted
      updateScrollButtonsVisibility()

      const response = await deleteLane(state.currentBoardName, laneName)
      if (response.ok) {
        showNotification(`Lane "${laneName}" deleted successfully.`, 'success')
        // Don't re-render since we've already updated the UI optimistically
      } else {
        // API call failed - re-render to restore the lane
        await handleApiError(response, `Failed to delete lane: ${laneName}.`)
        await initializeLanes() // Re-fetch and render all lanes to restore state
      }
    } catch (error) {
      // This catch is for network errors or if deleteLane itself throws
      console.error('Error during delete lane operation:', error)
      showNotification('An error occurred while trying to delete the lane.')
      await initializeLanes() // Re-fetch and render all lanes to restore state
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
    // Also update the data-lane-name attribute on the DOM element for consistency
    const laneElement = document.querySelector(
      `.lane[data-lane-name="${oldName}"]`
    )
    if (laneElement) {
      laneElement.dataset.laneName = trimmedNewName
    }

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
      await handleApiError(response, 'Failed to rename lane.')
      await initializeLanes() // Revert UI on failure
    }
  } catch (error) {
    showNotification('An error occurred while trying to rename the lane.')
    await initializeLanes() // Revert UI
  }
}
