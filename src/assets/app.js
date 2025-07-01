/* global localStorage */
// app.js - Main application entry point and orchestrator

import { initializeAuthStatus } from './ui/auth.js'
import { applyTheme, handleThemeSwitch, initializeColorSchemeSelector } from './ui/theme.js'
import { updateScrollButtonsVisibility, handleScrollButtonClick, handleKeyDown } from './ui/scroll.js'
import { getBoardNameFromURL, initializeBoardSelector, setupBoardSelectorListener } from './features/board.js'
import { initializeLanes, handleAddLaneButtonClick } from './features/lane.js'
import { handleSearchInput } from './features/search.js' // This line was already correct
import { handleEditNoteSubmit, closeEditModal } from './features/note.js'
import { state } from './features/state.js' // Corrected import: directly import the 'state' object

document.addEventListener('DOMContentLoaded', () => {
  // --- Theme & Color Scheme Setup ---
  const themeSwitcher = document.getElementById('theme-switcher')

  // Initialize auth status display
  initializeAuthStatus()

  // Populate the color scheme selector and set up its listener
  initializeColorSchemeSelector()

  // Set initial theme from localStorage (this will also trigger the initial color scheme application via applyTheme)
  const savedTheme =
    localStorage.getItem('theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light')
  applyTheme(savedTheme)

  // Add event listeners
  if (themeSwitcher) {
    themeSwitcher.addEventListener('click', handleThemeSwitch)
  }

  // Set up the board selector event listener once.
  setupBoardSelectorListener();

  // Wrap the main app initialization in an async function to handle dependencies correctly.
  (async () => {
    // 1. Determine the initial board from URL.
    const initialBoardName = getBoardNameFromURL()
    if (initialBoardName) {
      state.setBoardName(initialBoardName)
      state.setPreviousBoardSelection(initialBoardName)
    }

    // 2. Initialize the board selector. It will use `currentBoardName` to set
    //    its value and may correct it if the URL board is invalid.
    await initializeBoardSelector()

    // 3. Now that the selector is set and `currentBoardName` is finalized,
    //    load the lanes for that board.
    await initializeLanes(state.currentBoardName)
  })()

  const addLaneButton = document.getElementById('add-lane-btn')
  if (addLaneButton) {
    addLaneButton.addEventListener('click', handleAddLaneButtonClick)
  }

  const searchInput = document.getElementById('search')
  if (searchInput) {
    searchInput.addEventListener('input', handleSearchInput)
  }

  // Wire up keyboard shortcuts for scrolling
  document.addEventListener('keydown', handleKeyDown)

  // Global Escape key listener to close dialogs
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const openDialogs = document.querySelectorAll('dialog[open]')
      openDialogs.forEach(dialog => {
        // Prevent closing dialogs if the Escape key was pressed within an input field
        // where it might have a different intended behavior (e.g., clearing input)
        const activeElement = document.activeElement
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
          return // Do not close dialog if typing in an input
        }
        dialog.close()
      })
    }
  })

  // --- Scroll Button Setup ---
  const mainContent = document.querySelector('.main-content')
  const scrollLeftBtn = document.querySelector('.scroll-btn--left')
  const scrollRightBtn = document.querySelector('.scroll-btn--right')

  if (mainContent) {
    mainContent.addEventListener('scroll', updateScrollButtonsVisibility)
    window.addEventListener('resize', updateScrollButtonsVisibility)
  }
  if (scrollLeftBtn) {
    scrollLeftBtn.addEventListener('click', () =>
      handleScrollButtonClick('left')
    )
  }
  if (scrollRightBtn) {
    scrollRightBtn.addEventListener('click', () =>
      handleScrollButtonClick('right')
    )
  }

  // Wire up the edit modal's form and buttons
  const editNoteForm = document.getElementById('edit-note-form')
  const cancelEditBtn = document.getElementById('edit-note-cancel-btn')
  const closeEditBtn = document.getElementById('edit-note-close-btn')

  editNoteForm.addEventListener('submit', handleEditNoteSubmit)
  cancelEditBtn.addEventListener('click', closeEditModal)
  closeEditBtn.addEventListener('click', closeEditModal)

  // Wire up the permalink modal's close button
  const permalinkCloseBtn = document.getElementById('permalink-close-btn')
  if (permalinkCloseBtn) {
    permalinkCloseBtn.addEventListener('click', () => {
      document.getElementById('modal-permalink').close()
    })
  }

  // --- Click-to-show for color scheme selector ---
  const themeSwitcherContainer = document.querySelector(
    '.theme-and-color-switcher'
  )
  const colorSwatch = document.getElementById('current-color-swatch')

  if (themeSwitcherContainer && colorSwatch) {
    colorSwatch.addEventListener('click', (e) => {
      e.stopPropagation() // Prevent the document click listener from firing immediately
      themeSwitcherContainer.classList.toggle('is-open')
    })

    // Add a listener to the whole document to close the selector if the user clicks away
    document.addEventListener('click', (e) => {
      if (
        !themeSwitcherContainer.contains(e.target) &&
        themeSwitcherContainer.classList.contains('is-open')
      ) {
        themeSwitcherContainer.classList.remove('is-open')
      }
    })
  }

  // --- Auto-hide footer ---
  const footer = document.querySelector('.page-footer')
  if (footer) {
    // Wait 10 seconds before enabling the auto-hide feature
    setTimeout(() => {
      // Hide the footer to start
      footer.classList.add('page-footer--hidden')

      let isFooterVisible = false

      // Listen for mouse movement on the whole document
      document.addEventListener('mousemove', (e) => {
        // Define a trigger zone at the bottom of the viewport.
        // The footer's own height is a good trigger size.
        const triggerZoneHeight =
          footer.offsetHeight > 0 ? footer.offsetHeight : 50
        const isMouseNearBottom =
          e.clientY > window.innerHeight - triggerZoneHeight

        if (isMouseNearBottom) {
          // If mouse is in the zone, show the footer
          if (!isFooterVisible) {
            footer.classList.remove('page-footer--hidden')
            isFooterVisible = true
          }
        } else {
          // If mouse is outside the zone, hide the footer
          if (isFooterVisible) {
            footer.classList.add('page-footer--hidden')
            isFooterVisible = false
          }
        }
      })

      // A fallback for when the mouse leaves the window entirely
      document.documentElement.addEventListener('mouseleave', () => {
        if (isFooterVisible) {
          footer.classList.add('page-footer--hidden')
          isFooterVisible = false
        }
      })
    }, 10000) // 10 seconds
  }
})
