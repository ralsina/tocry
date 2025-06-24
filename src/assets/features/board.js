/* global history */
import { fetchBoards, createBoard } from '../api.js'
import { showPrompt, showNotification } from '../ui/dialogs.js'
import { state } from './state.js'
import { initializeLanes } from './lane.js'

// Function to get the board name from the URL path (e.g., /b/my_board)
export function getBoardNameFromURL () {
  const pathParts = window.location.pathname.split('/')
  // URL is /b/{board_name}, so parts are ["", "b", "{board_name}"]
  if (pathParts[1] === 'b' && pathParts[2]) {
    return decodeURIComponent(pathParts[2])
  }
  return null // No board name in URL
}

// --- Board Selector ---
export async function initializeBoardSelector () {
  const boardSelector = document.getElementById('board-selector')
  if (!boardSelector) return

  try {
    const boards = await fetchBoards()
    boardSelector.innerHTML = '' // Clear existing options

    if (boards.length === 0) {
      // Handle case where no boards exist (e.g., first run)
      const option = document.createElement('option')
      option.value = ''
      option.textContent = 'No boards available'
      boardSelector.appendChild(option)
      boardSelector.disabled = true
      showNotification('No boards found. Please create a new board.', 'info')
      return
    }

    boards.forEach((boardName) => {
      const option = document.createElement('option')
      option.value = boardName
      option.textContent = `Board: ${boardName}`
      boardSelector.appendChild(option)
    })

    // Add the "New board..." option
    const newBoardOption = document.createElement('option')
    newBoardOption.value = '__NEW_BOARD__'
    newBoardOption.textContent = 'New board...'
    boardSelector.appendChild(newBoardOption)

    // Set initial selection based on currentBoardName (default or from URL later)
    boardSelector.value = state.currentBoardName
    if (!boardSelector.value) {
      // If currentBoardName is not in the list, select the first one
      state.setBoardName(boards[0])
      boardSelector.value = state.currentBoardName
    }
    state.setPreviousBoardSelection(boardSelector.value) // Store current selection
    boardSelector.disabled = false

    boardSelector.addEventListener('change', async (event) => {
      // Make this async
      const selectedValue = event.target.value
      if (selectedValue === '__NEW_BOARD__') {
        // If "New board..." is selected, trigger the add board flow
        // Store the current URL state before the prompt, so we can revert if cancelled
        history.pushState(
          { board: state.previousBoardSelection },
          '',
          `/b/${state.previousBoardSelection}`
        )
        // Revert the selector immediately to the previous valid board (using the getter)
        boardSelector.value = state.previousBoardSelection

        await handleAddBoardButtonClick()
        // After attempting to add, revert the selector to the previous valid board (using the getter)
        boardSelector.value = state.previousBoardSelection
        // The handleAddBoardButtonClick already updates the URL if successful.
        // If it failed or was cancelled, the URL should remain previousBoardSelection.
        // So, no need to update URL here for __NEW_BOARD__.
      } else {
        state.setPreviousBoardSelection(selectedValue) // Update previous selection
        initializeLanes(selectedValue) // Load lanes for the selected board
        // Update the URL to reflect the selected board
        history.pushState({ board: selectedValue }, '', `/b/${selectedValue}`)
      }
    })
  } catch (error) {
    console.error('Error initializing board selector:', error)
    showNotification('Failed to load boards. Please try again.', 'error')
    boardSelector.disabled = true
  }
}

export async function handleAddBoardButtonClick () {
  const boardName = await showPrompt(
    'Enter the name for the new board:',
    'Create New Board'
  )

  if (boardName !== null && boardName.trim() !== '') {
    try {
      const trimmedBoardName = boardName.trim()
      const response = await createBoard(trimmedBoardName)
      if (response.ok) {
        showNotification(
          `Board "${trimmedBoardName}" created successfully.`,
          'info'
        )
        history.pushState(
          { board: trimmedBoardName },
          '',
          `/b/${trimmedBoardName}`
        ) // Update URL
        state.setBoardName(trimmedBoardName) // Update currentBoardName BEFORE re-initializing the selector
        await initializeBoardSelector() // Re-populate selector and set its value
        initializeLanes(trimmedBoardName) // Load the new board
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Failed to parse error response' }))
        showNotification(
          `Failed to create board: ${errorData.error || response.statusText}`
        )
      }
    } catch (error) {
      console.error('Error creating board:', error)
      showNotification('An error occurred while trying to create the board.')
    }
  }
}
