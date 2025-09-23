/* global localStorage */
// app.js - Main application entry point and orchestrator

import { initializeAuthStatus } from './ui/auth.js'
import { applyTheme, handleThemeSwitch, initializeColorSchemeSelector } from './ui/theme.js'
import { updateScrollButtonsVisibility, handleScrollButtonClick, handleKeyDown } from './ui/scroll.js'
import { getBoardNameFromURL, initializeBoardSelector, setupBoardSelectorListener } from './features/board.js'
import { initializeLanes, handleAddLaneButtonClick } from './features/lane.js'
import { handleSearchInput } from './features/search.js' // This line was already correct
import { handleEditNoteSubmit, closeEditModal } from './features/note.js'
import { handleAttachmentDelete } from './features/note-attachments.js'
import { state } from './features/state.js' // Corrected import: directly import the 'state' object

// Utility function to simplify event listener setup
function setupEventListener (selector, event, handler) {
  const element = document.getElementById(selector) || document.querySelector(selector)
  if (element) {
    element.addEventListener(event, handler)
    return true
  }
  return false
}

// Utility function to close modal dialogs with animation
function closeModal (modalId) {
  return () => {
    const modal = document.getElementById(modalId)
    if (modal) {
      const isTestMode = document.documentElement.hasAttribute('data-test-mode')

      if (isTestMode) {
        // Skip animation in test mode
        modal.close()
      } else {
        modal.classList.add('dialog-exit')
        setTimeout(() => {
          modal.close()
          modal.classList.remove('dialog-exit', 'dialog-enter')
        }, 200) // Match the exit animation duration
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
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

  // Add event listeners using utility function
  setupEventListener('theme-switcher', 'click', handleThemeSwitch)
  setupEventListener('add-lane-btn', 'click', handleAddLaneButtonClick)
  setupEventListener('search', 'input', handleSearchInput)

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

        // Close dialog with animation
        const isTestMode = document.documentElement.hasAttribute('data-test-mode')

        if (isTestMode) {
          // Skip animation in test mode
          dialog.close()
        } else {
          dialog.classList.add('dialog-exit')
          setTimeout(() => {
            dialog.close()
            dialog.classList.remove('dialog-exit', 'dialog-enter')
          }, 200) // Match the exit animation duration
        }
      })
    }
  })

  // Global '/' key listener to focus search bar
  document.addEventListener('keydown', (event) => {
    if (event.key === '/') {
      const activeElement = document.activeElement
      // Only focus search if not already typing in an input field
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
        return
      }
      event.preventDefault() // Prevent default browser behavior (e.g., quick find)
      const searchInput = document.getElementById('search')
      if (searchInput) {
        searchInput.focus()
      }
    }
  })

  // --- Scroll Button Setup ---
  const mainContent = document.querySelector('.main-content')

  if (mainContent) {
    mainContent.addEventListener('scroll', updateScrollButtonsVisibility)
    window.addEventListener('resize', updateScrollButtonsVisibility)
  }

  setupEventListener('.scroll-btn--left', 'click', () => handleScrollButtonClick('left'))
  setupEventListener('.scroll-btn--right', 'click', () => handleScrollButtonClick('right'))

  // Wire up modal forms and close buttons
  setupEventListener('edit-note-form', 'submit', handleEditNoteSubmit)
  setupEventListener('edit-note-cancel-btn', 'click', closeEditModal)
  setupEventListener('edit-note-close-btn', 'click', closeEditModal)
  setupEventListener('permalink-close-btn', 'click', closeModal('modal-permalink'))
  setupEventListener('attach-file-close-btn', 'click', closeModal('modal-attach-file'))
  // Wire up attachment deletion (works for both modal and expanded notes)
  document.addEventListener('click', (event) => {
    if (event.target.classList.contains('delete-attachment-btn')) {
      handleAttachmentDelete(event)
    }
  })

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

  // Particle Animation for ToCry Title
  function createParticleAnimation () {
    const particlesContainer = document.getElementById('particles-container')
    const titleElement = document.getElementById('tocry-title')

    if (!particlesContainer || !titleElement) return

    // Create initial burst of particles
    function createParticleBurst () {
      const numParticles = 12

      for (let i = 0; i < numParticles; i++) {
        createParticle()
      }
    }

    // Create a single particle
    function createParticle () {
      const particle = document.createElement('div')
      particle.className = 'particle'

      // Random size between 3px and 8px
      const size = Math.random() * 5 + 3
      particle.style.width = `${size}px`
      particle.style.height = `${size}px`

      // Random position around the title
      const x = Math.random() * 100 // Random percentage across the width
      const y = Math.random() * 100 // Random percentage across the height

      particle.style.left = `${x}%`
      particle.style.top = `${y}%`

      // Random animation delay
      const delay = Math.random() * 2000 // 0-2 seconds delay
      particle.style.animationDelay = `${delay}ms`

      // Random animation duration between 2-4 seconds
      const duration = Math.random() * 2000 + 2000
      particle.style.animationDuration = `${duration}ms`

      particlesContainer.appendChild(particle)

      // Remove particle after animation completes
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle)
        }
      }, delay + duration)
    }

    // Create continuous particles on hover
    function startContinuousParticles () {
      const interval = setInterval(() => {
        if (titleElement.matches(':hover')) {
          createParticle()
        } else {
          clearInterval(interval)
        }
      }, 200)
    }

    // Initial particle burst on page load (after a short delay for title animation)
    setTimeout(() => {
      createParticleBurst()
    }, 500)

    // Add hover effect for continuous particles
    titleElement.addEventListener('mouseenter', () => {
      startContinuousParticles()
    })

    // Add click effect for extra particles
    titleElement.addEventListener('click', (e) => {
      e.preventDefault()
      for (let i = 0; i < 8; i++) {
        setTimeout(() => createParticle(), i * 50)
      }
      // Still allow the link to work after animation
      setTimeout(() => {
        window.open(titleElement.href, '_blank')
      }, 300)
    })
  }

  // Initialize particle animation when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createParticleAnimation)
  } else {
    createParticleAnimation()
  }
})
