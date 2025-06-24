/* global history */
import { fetchBoards, createBoard, renameBoard, deleteBoard } from '../api.js'
import { showPrompt, showNotification, showConfirmation } from '../ui/dialogs.js'
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

const setupBoardSelectorListener = () => {
  const boardSelector = document.getElementById('board-selector')
  if (!boardSelector) return

  boardSelector.addEventListener('change', async (event) => {
    const selectedValue = event.target.value
    if (selectedValue === '__NEW_BOARD__') {
      await handleAddBoardButtonClick(boardSelector)
    } else if (selectedValue === '__RENAME_BOARD__') {
      await handleRenameBoardButtonClick(boardSelector)
    } else if (selectedValue === '__DELETE_BOARD__') {
      await handleDeleteBoardButtonClick(boardSelector)
    } else if (selectedValue) { // A regular board was selected, and it's not the separator
      await selectBoard(selectedValue)
    } else {
      // This handles selecting the separator. Revert to the previous valid selection.
      boardSelector.value = state.previousBoardSelection
    }
  })
}
export { setupBoardSelectorListener }

// --- Board Selector ---
export async function initializeBoardSelector () {
  const boardSelector = document.getElementById('board-selector')
  if (!boardSelector) return

  try {
    const boards = await fetchBoards()
    boardSelector.innerHTML = '' // Clear existing options

    // Add the "New board..." option first
    const newBoardOption = document.createElement('option')
    newBoardOption.value = '__NEW_BOARD__'
    newBoardOption.textContent = 'New board...'
    boardSelector.appendChild(newBoardOption)

    // Add "Rename current board..." option
    const renameBoardOption = document.createElement('option')
    renameBoardOption.value = '__RENAME_BOARD__'
    renameBoardOption.textContent = 'Rename current board...'
    boardSelector.appendChild(renameBoardOption)

    // Add "Delete current board..." option
    const deleteBoardOption = document.createElement('option')
    deleteBoardOption.value = '__DELETE_BOARD__'
    deleteBoardOption.textContent = 'Delete current board...'
    boardSelector.appendChild(deleteBoardOption)

    // Add a separator
    const separatorOption = document.createElement('option')
    separatorOption.value = '' // No value
    separatorOption.textContent = '---' // Visual separator
    separatorOption.disabled = true // Make it unselectable
    boardSelector.appendChild(separatorOption)

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

    // Set initial selection based on currentBoardName (default or from URL later)
    boardSelector.value = state.currentBoardName
    if (!boardSelector.value) {
      // If currentBoardName is not in the list, select the first one
      state.setBoardName(boards[0])
      boardSelector.value = state.currentBoardName
    }
    state.setPreviousBoardSelection(boardSelector.value) // Store current selection
    boardSelector.disabled = false
    return boardSelector // Return the selector element
  } catch (error) {
    console.error('Error initializing board selector:', error)
    showNotification('Failed to load boards. Please try again.', 'error')
    boardSelector.disabled = true
  }
}

export async function handleAddBoardButtonClick (boardSelector) {
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
        const updatedSelector = await initializeBoardSelector() // Re-populate selector
        updatedSelector.value = trimmedBoardName // Explicitly set value on the refreshed selector
        await selectBoard(trimmedBoardName) // Load lanes and update URL
      } else {
        // Revert the selector immediately to the previous valid board
        boardSelector.value = state.previousBoardSelection
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
  // If prompt was cancelled or input was empty, revert the selector
  if (boardName === null || boardName.trim() === '') {
    boardSelector.value = state.previousBoardSelection
  }
}

export async function handleRenameBoardButtonClick (boardSelector) {
  const currentBoardName = state.currentBoardName
  if (!currentBoardName) {
    showNotification('No board selected to rename.')
    boardSelector.value = state.previousBoardSelection
    return
  }

  if (currentBoardName === 'default') {
    showNotification('The "default" board cannot be renamed.', 'error')
    // Revert the selector to the current (default) board
    boardSelector.value = state.previousBoardSelection
    return
  }

  const newBoardName = await showPrompt(
    `Rename board "${currentBoardName}" to:`,
    'Rename Board',
    currentBoardName
  )

  if (newBoardName !== null && newBoardName.trim() !== '' && newBoardName.trim() !== currentBoardName) {
    try {
      const trimmedNewBoardName = newBoardName.trim()
      const response = await renameBoard(currentBoardName, trimmedNewBoardName)
      if (response.ok) {
        showNotification(`Board "${currentBoardName}" renamed to "${trimmedNewBoardName}" successfully.`, 'info')
        await initializeBoardSelector() // Re-populate selector
        await selectBoard(trimmedNewBoardName) // Then select the new name
      } else {
        // Revert the selector immediately to the previous valid board
        boardSelector.value = state.previousBoardSelection
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }))
        showNotification(`Failed to rename board: ${errorData.error || response.statusText}`)
      }
    } catch (error) {
      console.error('Error renaming board:', error)
      showNotification('An error occurred while trying to rename the board.')
    }
  } else {
    // If prompt was cancelled, input was empty, or name was unchanged, revert the selector
    boardSelector.value = state.previousBoardSelection
  }
}

export async function handleDeleteBoardButtonClick (boardSelector) {
  const currentBoardName = state.currentBoardName
  if (!currentBoardName) {
    showNotification('No board selected to delete.')
    boardSelector.value = state.previousBoardSelection
    return
  }

  if (currentBoardName === 'default') {
    showNotification('The "default" board cannot be deleted.', 'error')
    // Revert the selector to the current (default) board
    boardSelector.value = state.previousBoardSelection
    return
  }

  if (await showConfirmation(`Are you sure you want to delete the board "${currentBoardName}"? This action cannot be undone.`, 'Delete Board')) {
    try {
      const response = await deleteBoard(currentBoardName)
      if (response.ok) {
        showNotification(`Board "${currentBoardName}" deleted successfully.`, 'info')
        // After deleting, try to load the default board or the first available board
        const boards = await fetchBoards()
        let nextBoardName = 'default' // Fallback to 'default'
        if (boards.length > 0) {
          // If 'default' exists, use it. Otherwise, use the first board in the list.
          if (boards.includes('default')) {
            nextBoardName = 'default'
          } else {
            nextBoardName = boards[0]
          }
        } else {
          // No boards left, prompt to create a new one
          showNotification('All boards deleted. Please create a new board.', 'info')
          nextBoardName = null // Indicate no board to select
        }
        await initializeBoardSelector() // Re-populate selector
        if (nextBoardName) {
          await selectBoard(nextBoardName)
        } else {
          // If no boards left, clear lanes and URL
          document.getElementById('lanes-container').innerHTML = ''
          history.pushState({}, '', '/')
          state.setBoardName(null)
        }
      } else {
        boardSelector.value = state.previousBoardSelection // Revert on failure
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }))
        showNotification(`Failed to delete board: ${errorData.error || response.statusText}`)
      }
    } catch (error) {
      console.error('Error deleting board:', error)
      showNotification('An error occurred while trying to delete the board.')
    }
  } else {
    boardSelector.value = state.previousBoardSelection // Revert if cancelled
  }
}

async function selectBoard (boardName) {
  const boardSelector = document.getElementById('board-selector')
  state.setPreviousBoardSelection(boardName) // Update previous selection
  state.setBoardName(boardName) // Update currentBoardName
  if (boardSelector) {
    // Ensure the dropdown visually reflects the selected board
    boardSelector.value = boardName
  }
  initializeLanes(boardName) // Load lanes for the selected board
  // Update the URL to reflect the selected board
  history.pushState({ board: boardName }, '', `/b/${boardName}`)
}
