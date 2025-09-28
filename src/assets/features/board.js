/* global history */
import { fetchBoards, createBoard, renameBoard, deleteBoard, shareBoard, fetchAuthMode, fetchBoardDetails, updateBoardPublicStatus } from '../api.js' // Keep createBoard for the new addBoard function
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

  // Initialize public toggle visibility and state
  updatePublicToggleVisibility()
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
  const isReadOnlyMode = window.tocryConfig && window.tocryConfig.readOnlyMode === true

  state.setPreviousBoardSelection(boardName) // Update previous selection
  state.setBoardName(boardName) // Update currentBoardName
  if (boardSelector) {
    boardSelector.value = boardName // Ensure the dropdown visually reflects the selected board
  }

  // Apply the board's color scheme
  try {
    let boardDetails
    if (isReadOnlyMode) {
      // For public boards, we need to extract UUID from URL and fetch public data
      const pathParts = window.location.pathname.split('/')
      if (pathParts[1] === 'public' && pathParts[2] === 'boards' && pathParts[3]) {
        const uuid = pathParts[3]
        const response = await fetch(`/public/boards/${uuid}/data`)
        if (response.ok) {
          boardDetails = await response.json()
        }
      }
    } else {
      boardDetails = await fetchBoardDetails(boardName)
    }

    if (boardDetails && boardDetails.color_scheme) {
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

  // Update public toggle visibility when board changes
  updatePublicToggleVisibility()
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

// Function to update public toggle visibility based on current board
export async function updatePublicToggleVisibility () {
  const publicToggleContainer = document.getElementById('public-toggle-container')
  const publicToggleBtn = document.getElementById('public-toggle-btn')
  const sharePublicContainer = document.getElementById('share-public-container')
  const sharePublicBtn = document.getElementById('share-public-btn')
  const isReadOnlyMode = window.tocryConfig && window.tocryConfig.readOnlyMode === true

  // Hide toggle in read-only mode or if no board is selected
  if (isReadOnlyMode || !state.currentBoardName) {
    if (publicToggleContainer) {
      publicToggleContainer.style.display = 'none'
    }
    if (sharePublicContainer) {
      sharePublicContainer.style.display = 'none'
    }
    return
  }

  // Show toggle for board owners
  if (publicToggleContainer) {
    publicToggleContainer.style.display = 'flex'

    // Fetch current board details to get public status
    try {
      const boardDetails = await fetchBoardDetails(state.currentBoardName)
      if (boardDetails && typeof boardDetails.public === 'boolean') {
        updatePublicToggleUI(boardDetails.public)
        updateShareButtonVisibility(boardDetails.public)
      } else {
        // Default to private if public status is not available
        updatePublicToggleUI(false)
        updateShareButtonVisibility(false)
      }
    } catch (error) {
      console.warn('Failed to fetch board public status:', error)
      // Default to private on error
      updatePublicToggleUI(false)
      updateShareButtonVisibility(false)
    }
  }

  // Add click handler if not already added
  if (publicToggleBtn && !publicToggleBtn.dataset.hasClickListener) {
    publicToggleBtn.addEventListener('click', handlePublicToggleClick)
    publicToggleBtn.dataset.hasClickListener = 'true'
  }

  // Add share button click handler if not already added
  if (sharePublicBtn && !sharePublicBtn.dataset.hasClickListener) {
    sharePublicBtn.addEventListener('click', handleSharePublicClick)
    sharePublicBtn.dataset.hasClickListener = 'true'
  }
}

// Update the public toggle UI to reflect current state
function updatePublicToggleUI (isPublic) {
  const publicToggleText = document.getElementById('public-toggle-text')
  const publicToggleBtn = document.getElementById('public-toggle-btn')

  if (publicToggleText) {
    publicToggleText.textContent = isPublic ? 'Public' : 'Private'
  }

  if (publicToggleBtn) {
    if (isPublic) {
      publicToggleBtn.classList.remove('secondary')
      publicToggleBtn.classList.add('primary')
    } else {
      publicToggleBtn.classList.remove('primary')
      publicToggleBtn.classList.add('secondary')
    }
  }
}

// Update share button visibility based on public status
function updateShareButtonVisibility (isPublic) {
  const sharePublicContainer = document.getElementById('share-public-container')
  if (sharePublicContainer) {
    sharePublicContainer.style.display = isPublic ? 'flex' : 'none'
  }
}

// Handle share button click for public boards
async function handleSharePublicClick () {
  const currentBoardName = state.currentBoardName
  if (!currentBoardName) {
    showNotification('No board selected.', 'error')
    return
  }

  const uuid = await getBoardUuid(currentBoardName)
  if (!uuid) {
    showNotification('Unable to generate share link.', 'error')
    return
  }

  const shareUrl = `${window.location.origin}/public/boards/${uuid}`

  // Copy to clipboard
  try {
    await navigator.clipboard.writeText(shareUrl)
    showNotification('Share link copied to clipboard!', 'success')
  } catch (error) {
    // Fallback for browsers that don't support clipboard API
    const textArea = document.createElement('textarea')
    textArea.value = shareUrl
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    showNotification('Share link copied to clipboard!', 'success')
  }
}

// Handle public toggle button click
async function handlePublicToggleClick () {
  const currentBoardName = state.currentBoardName
  if (!currentBoardName) {
    showNotification('No board selected.', 'error')
    return
  }

  // Get current state from UI
  const publicToggleText = document.getElementById('public-toggle-text')
  const isCurrentlyPublic = publicToggleText && publicToggleText.textContent === 'Public'

  // Confirm before making public
  if (!isCurrentlyPublic) {
    const confirmed = await showConfirmation(
      'Are you sure you want to make this board public? ' +
      'Anyone with the link will be able to view this board in read-only mode.',
      'Make Board Public'
    )

    if (!confirmed) {
      return
    }
  }

  try {
    const response = await updateBoardPublicStatus(currentBoardName, !isCurrentlyPublic)
    if (response.ok) {
      const newStatus = !isCurrentlyPublic
      updatePublicToggleUI(newStatus)
      showNotification(
        `Board is now ${newStatus ? 'public' : 'private'}.`,
        'success'
      )

      // If board was made public, show the share URL
      if (newStatus) {
        const uuid = await getBoardUuid(currentBoardName)
        if (uuid) {
          const shareUrl = `${window.location.origin}/public/boards/${uuid}`
          showNotification(
            `Board is now public! Share this link: ${shareUrl}`,
            'info',
            10000 // Longer display time
          )
        } else {
          showNotification(
            'Board is now public! Unable to generate share URL.',
            'warning'
          )
        }
      }
    } else {
      await handleApiError(response, 'Failed to update board visibility.')
    }
  } catch (error) {
    console.error('Error updating board public status:', error)
    handleUIError(error, 'An unexpected error occurred while updating board visibility.')
  }
}

// Helper function to get board UUID
async function getBoardUuid (boardName) {
  try {
    const boardDetails = await fetchBoardDetails(boardName)
    if (boardDetails && boardDetails.uuid) {
      return boardDetails.uuid
    }
  } catch (error) {
    console.error('Error getting board UUID:', error)
  }
  return null
}
