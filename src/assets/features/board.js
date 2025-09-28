/* global history */
import { fetchBoards, createBoard, renameBoard, deleteBoard, shareBoard, fetchAuthMode, fetchBoardDetails } from '../api.js' // Keep createBoard for the new addBoard function
import { showPrompt, showNotification, showConfirmation } from '../ui/dialogs.js'
import { handleApiError, handleUIError } from '../utils/errorHandler.js'
import { BOARD_SELECTOR_OPTIONS } from '../utils/constants.js'
import { state } from './state.js'
import { initializeLanes } from './lane.js'
import { applyColorScheme } from '../ui/theme.js'

// Helper function to create option elements
function createOption (value, textContent, disabled = false) {
  const option = document.createElement('option')
  option.value = value
  option.textContent = textContent
  if (disabled) option.disabled = true
  return option
}

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
  if (!boardSelector) return // No board selector, nothing to set up

  boardSelector.addEventListener('change', async (event) => {
    const selectedValue = event.target.value
    if (selectedValue === BOARD_SELECTOR_OPTIONS.NEW_BOARD) {
      await handleAddBoardButtonClick(boardSelector)
    } else if (selectedValue === BOARD_SELECTOR_OPTIONS.RENAME_BOARD) {
      await handleRenameBoardButtonClick(boardSelector)
    } else if (selectedValue === BOARD_SELECTOR_OPTIONS.DELETE_BOARD) {
      await handleDeleteBoardButtonClick(boardSelector)
    } else if (selectedValue === BOARD_SELECTOR_OPTIONS.SHARE_BOARD) {
      await handleShareBoardButtonClick(boardSelector)
    } else if (selectedValue === BOARD_SELECTOR_OPTIONS.SEND_MESSAGE) {
      await handleSendMessageButtonClick(boardSelector)
    } else if (selectedValue) { // A regular board was selected, and it's not the separator
      await selectBoard(selectedValue)
    } else {
      boardSelector.value = state.previousBoardSelection // Revert to the previous valid selection if separator is chosen
    }
  })
}
export { setupBoardSelectorListener }

// --- Board Selector ---
export async function initializeBoardSelector () {
  const boardSelector = document.getElementById('board-selector')
  if (!boardSelector) return // No board selector, nothing to initialize

  try {
    const boards = await fetchBoards()
    boardSelector.innerHTML = '' // Clear existing options

    // Add the "New board..." option first
    const newBoardOption = createOption(BOARD_SELECTOR_OPTIONS.NEW_BOARD, 'New board...')
    boardSelector.appendChild(newBoardOption)

    // Add "Rename current board..." option
    const renameBoardOption = createOption(BOARD_SELECTOR_OPTIONS.RENAME_BOARD, 'Rename current board...')
    boardSelector.appendChild(renameBoardOption)

    // Add "Delete current board..." option
    const deleteBoardOption = createOption(BOARD_SELECTOR_OPTIONS.DELETE_BOARD, 'Delete current board...')
    boardSelector.appendChild(deleteBoardOption)

    const authMode = await fetchAuthMode()
    console.log('Fetched auth mode:', authMode) // Add this line for debugging

    if (authMode.auth_mode === 'google') {
      // Add "Share current board..." option only if in Google Auth mode
      const shareBoardOption = createOption(BOARD_SELECTOR_OPTIONS.SHARE_BOARD, 'Share current board...')
      boardSelector.appendChild(shareBoardOption)

      // Add "Send Message..." option only if in Google Auth mode
      const sendMessageOption = createOption(BOARD_SELECTOR_OPTIONS.SEND_MESSAGE, 'Send Message...')
      boardSelector.appendChild(sendMessageOption)
    }

    const separatorOption = createOption('', '---', true)
    boardSelector.appendChild(separatorOption)

    if (boards.length === 0) {
      // Handle case where no boards exist (e.g., first run)
      const option = createOption('', 'No boards available')
      boardSelector.appendChild(option)
      boardSelector.disabled = true
      // No notification here, as initializeLanes will show the main welcome message
      state.setBoardName(null) // Explicitly set currentBoardName to null
      await initializeLanes(null) // Trigger initializeLanes with null to show welcome message
      return // Exit early, no boards to select
    }
    boards.forEach((boardName) => {
      const option = createOption(boardName, `Board: ${boardName}`)
      boardSelector.appendChild(option)
    })

    // Set initial selection based on currentBoardName (default or from URL later)
    // The board from the URL (state.currentBoardName) will be attempted.
    // If it's not a valid option, the dropdown will just show the first option.
    boardSelector.value = state.currentBoardName
    state.setPreviousBoardSelection(boardSelector.value) // Store current selection
    boardSelector.disabled = false
    return boardSelector // Return the selector element
  } catch (error) {
    console.error('Error initializing board selector:', error)
    showNotification('Failed to load boards. Please try again.', 'error')
    state.setBoardName(null) // Ensure state is clear on error
    boardSelector.disabled = true
  }
}

// Core function to add a board (backend interaction and notification)
export async function addBoard (boardName) {
  const trimmedBoardName = boardName.trim()
  if (trimmedBoardName === '') {
    showNotification('Board name cannot be empty.', 'error')
    throw new Error('Board name cannot be empty.') // Throw to indicate failure
  }
  try {
    const response = await createBoard(trimmedBoardName)
    if (response.ok) {
      showNotification(`Board "${trimmedBoardName}" created successfully!`, 'success')
      return trimmedBoardName // Return the new board name on success
    } else { // API call failed
      await handleApiError(response, `Failed to create board: ${response.status} ${response.statusText}`)
      throw new Error('API error during board creation.') // Re-throw a generic error for the caller
    }
  } catch (error) {
    console.error('Error creating board:', error)
    handleUIError(error, 'An unexpected error occurred while creating the board.')
    throw error // Re-throw for caller to handle
  }
}

// Handler for the "New board..." option in the selector
async function handleAddBoardButtonClick (boardSelector) {
  const boardName = await showPrompt(
    'Enter the name for the new board:',
    'Create New Board'
  )

  if (boardName === null || boardName.trim() === '') {
    boardSelector.value = state.previousBoardSelection // Revert if cancelled or empty
    return
  }

  try {
    const newBoardName = await addBoard(boardName) // Call the core addBoard function
    const updatedSelector = await initializeBoardSelector() // Re-populate selector
    updatedSelector.value = newBoardName // Explicitly set value on the refreshed selector
    await selectBoard(newBoardName) // Load lanes and update URL
  } catch (error) {
    // Error already handled by addBoard, just revert the selector
    boardSelector.value = state.previousBoardSelection
  }
}

async function handleRenameBoardButtonClick (boardSelector) {
  const currentBoardName = state.currentBoardName
  if (!currentBoardName) {
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
        state.setBoardName(trimmedNewBoardName) // Update state BEFORE calling selectBoard
        await selectBoard(trimmedNewBoardName) // Update UI and URL
        await initializeBoardSelector() // Re-populate selector options
      } else {
        // Revert the selector immediately to the previous valid board
        boardSelector.value = state.previousBoardSelection // Revert on failure
        await handleApiError(response, 'Failed to rename board.')
      }
    } catch (error) {
      console.error('Error renaming board:', error)
      handleUIError(error, 'An unexpected error occurred while trying to rename the board.')
    }
  } else {
    // If prompt was cancelled, input was empty, or name was unchanged, revert the selector
    boardSelector.value = state.previousBoardSelection
  }
}

async function handleDeleteBoardButtonClick (boardSelector) {
  const currentBoardName = state.currentBoardName
  if (!currentBoardName) {
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
        const remainingBoards = await fetchBoards()
        let nextBoardName = null

        if (remainingBoards.length > 0) {
          nextBoardName = remainingBoards[0]
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
        await handleApiError(response, 'Failed to delete board.')
      }
    } catch (error) {
      console.error('Error deleting board:', error)
      handleUIError(error, 'An unexpected error occurred while trying to delete the board.')
    }
  } else {
    boardSelector.value = state.previousBoardSelection // Revert if cancelled
  }
}

// Function to select a board, update UI, and change URL
async function selectBoard (boardName, skipHistoryPush = false) {
  const boardSelector = document.getElementById('board-selector')
  state.setPreviousBoardSelection(boardName) // Update previous selection
  state.setBoardName(boardName) // Update currentBoardName
  if (boardSelector) {
    boardSelector.value = boardName // Ensure the dropdown visually reflects the selected board
  }

  // Apply the board's color scheme
  try {
    const boardDetails = await fetchBoardDetails(boardName)
    if (boardDetails.color_scheme) {
      applyColorScheme(boardDetails.color_scheme)
      // Update the color scheme selector to match
      const colorSchemeSwitcher = document.getElementById('color-scheme-switcher')
      if (colorSchemeSwitcher) {
        colorSchemeSwitcher.value = boardDetails.color_scheme
      }
    }
  } catch (error) {
    console.warn(`Failed to fetch board details for "${boardName}":`, error)
    // Continue with board selection even if color scheme fails
  }

  initializeLanes(boardName) // Load lanes for the selected board
  if (!skipHistoryPush) {
    history.pushState({ board: boardName }, '', `/b/${boardName}`) // Update the URL
  }
}
export { selectBoard }

async function handleShareBoardButtonClick (boardSelector) {
  const currentBoardName = state.currentBoardName
  if (!currentBoardName) {
    boardSelector.value = state.previousBoardSelection
    showNotification('No board selected to share.', 'error')
    return
  }

  const toUserEmail = await showPrompt(
    `Share board "${currentBoardName}" with:`,
    'Share Board',
    ''
  )

  if (toUserEmail !== null && toUserEmail.trim() !== '') {
    try {
      const response = await shareBoard(currentBoardName, toUserEmail.trim())
      if (response.ok) {
        showNotification(`Board "${currentBoardName}" shared with "${toUserEmail}" successfully.`, 'success')
      } else {
        await handleApiError(response, 'Failed to share board.')
      }
    } catch (error) {
      console.error('Error sharing board:', error)
      handleUIError(error, 'An unexpected error occurred while trying to share the board.')
    }
  } else {
    boardSelector.value = state.previousBoardSelection
  }
}

// Function to handle send message button click
async function handleSendMessageButtonClick (boardSelector) {
  // Reset the board selector to the current board
  boardSelector.value = state.previousBoardSelection

  // Open the compose message dialog
  // Import dynamically to avoid circular dependency
  import('../features/messages.js').then(({ openComposeMessageDialog }) => {
    if (typeof openComposeMessageDialog === 'function') {
      openComposeMessageDialog()
    } else {
      showNotification('Message center not available.', 'error')
    }
  }).catch(() => {
    showNotification('Message center not available.', 'error')
  })
}
