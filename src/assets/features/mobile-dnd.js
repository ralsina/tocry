// Mobile touch-based drag and drop for notes
import { fetchLanes, updateNote } from '../api.js'
import { showNotification } from '../ui/dialogs.js'
import { initializeLanes } from '../features/lane.js'
import { handleApiError, handleUIError } from '../utils/errorHandler.js'
import { state } from '../features/state.js'

export class MobileDragDrop {
  constructor() {
    this.draggedNote = null
    this.draggedElement = null
    this.touchOffset = { x: 0, y: 0 }
    this.originalLane = null
    this.placeholder = null
    this.activeDropZones = new Set()
    this.autoScrollInterval = null
    this.scrollSpeed = 8
    this.edgeThreshold = 80 // pixels from edge
    this.lastTouchPosition = null

    this.initializeTouchSupport()
  }

  initializeTouchSupport() {
    // Use event delegation for better performance
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false })
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false })
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false })
  }

  handleTouchStart(event) {
    const touch = event.touches[0]
    const element = document.elementFromPoint(touch.clientX, touch.clientY)

    // Don't start drag if clicking on buttons, links, or form elements
    if (element?.closest('button, a, input, select, textarea, .editor-container')) return

    const noteCard = element?.closest('.note-card')

    if (!noteCard) return

    // Only allow dragging on mobile devices
    if (window.innerWidth > 768) return

    event.preventDefault()

    this.draggedNote = {
      noteId: noteCard.dataset.noteId,
      originalLane: noteCard.dataset.laneName
    }
    this.draggedElement = noteCard

    // Calculate touch offset
    const rect = noteCard.getBoundingClientRect()
    this.touchOffset = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    }

    this.startDragging(touch)
  }

  startDragging(touch) {
    // Add drag active class to body
    document.body.classList.add('mobile-drag-active')

    // Create a placeholder
    this.placeholder = this.draggedElement.cloneNode(true)
    this.placeholder.style.opacity = '0.3'
    this.placeholder.style.position = 'absolute'
    this.placeholder.style.zIndex = '1000'
    this.placeholder.style.width = this.draggedElement.offsetWidth + 'px'
    this.placeholder.style.pointerEvents = 'none'

    // Hide original element
    this.draggedElement.style.visibility = 'hidden'

    // Add placeholder to DOM
    document.body.appendChild(this.placeholder)

    // Highlight drop zones
    this.highlightDropZones(true)

    // Position placeholder
    this.updatePlaceholderPosition(touch)
  }

  handleTouchMove(event) {
    if (!this.draggedElement) return

    event.preventDefault()
    const touch = event.touches[0]
    this.lastTouchPosition = touch
    this.updatePlaceholderPosition(touch)

    // Handle auto-scrolling at screen edges
    this.handleAutoScroll(touch)

    // Find current drop zone
    const element = document.elementFromPoint(touch.clientX, touch.clientY)
    const dropZone = element?.closest('.notes-list')

    // Update visual feedback
    this.updateDropZoneFeedback(dropZone, touch.clientY)
  }

  updatePlaceholderPosition(touch) {
    if (!this.placeholder) return

    const x = touch.clientX - this.touchOffset.x
    const y = touch.clientY - this.touchOffset.y

    this.placeholder.style.left = x + 'px'
    this.placeholder.style.top = y + 'px'
  }

  updateDropZoneFeedback(dropZone, touchY) {
    // Remove previous highlights
    document.querySelectorAll('.notes-list--drag-over-mobile').forEach(el => {
      el.classList.remove('notes-list--drag-over-mobile')
    })

    if (dropZone) {
      dropZone.classList.add('notes-list--drag-over-mobile')

      // Find position for insertion indicator
      const afterElement = this.getDragAfterElementMobile(dropZone, touchY)
      this.showInsertionIndicator(dropZone, afterElement)
    }
  }

  getDragAfterElementMobile(container, y) {
    const draggableElements = [
      ...container.querySelectorAll('.note-card:not([style*="visibility: hidden"])')
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

  showInsertionIndicator(container, afterElement) {
    // Remove existing indicators
    document.querySelectorAll('.mobile-drop-indicator').forEach(el => el.remove())

    // Create insertion indicator
    const indicator = document.createElement('div')
    indicator.className = 'mobile-drop-indicator'
    indicator.style.height = '3px'
    indicator.style.backgroundColor = 'var(--pico-primary)'
    indicator.style.margin = '4px 0'

    if (afterElement) {
      container.insertBefore(indicator, afterElement)
    } else {
      container.appendChild(indicator)
    }
  }

  handleTouchEnd(event) {
    if (!this.draggedElement) return

    event.preventDefault()
    const touch = event.changedTouches[0]
    const element = document.elementFromPoint(touch.clientX, touch.clientY)
    const dropZone = element?.closest('.notes-list')

    if (dropZone && dropZone.dataset.laneName) {
      this.handleDrop(dropZone, touch.clientY)
    } else {
      this.cancelDrag()
    }
  }

  async handleDrop(dropZone, touchY) {
    const targetLaneName = dropZone.dataset.laneName

    // Calculate position
    const afterElement = this.getDragAfterElementMobile(dropZone, touchY)
    const allNotesInTarget = [
      ...dropZone.querySelectorAll('.note-card:not([style*="visibility: hidden"])')
    ]
    let newPosition =
      afterElement == null
        ? allNotesInTarget.length
        : allNotesInTarget.indexOf(afterElement)

    // Adjust position if moving within same lane
    if (targetLaneName === this.draggedNote.originalLane) {
      const originalDOMPosition = allNotesInTarget.findIndex(
        note => note.dataset.noteId === this.draggedNote.noteId
      )
      if (originalDOMPosition !== -1 && originalDOMPosition < newPosition) {
        newPosition--
      }
    }

    // Check if position actually changed
    const allLanes = await fetchLanes(state.currentBoardName)
    if (!allLanes) {
      showNotification('Could not fetch board data to complete the move.')
      this.cleanup()
      return
    }

    const originalLaneObject = allLanes.find(
      lane => lane.name === this.draggedNote.originalLane
    )
    const originalNoteObject = originalLaneObject?.notes.find(
      note => note.id === this.draggedNote.noteId
    )

    if (!originalNoteObject) {
      showNotification('Could not find the original note data.')
      this.cleanup()
      return
    }

    const originalPositionInModel = originalLaneObject.notes.findIndex(
      note => note.id === this.draggedNote.noteId
    )

    if (
      targetLaneName === this.draggedNote.originalLane &&
      newPosition === originalPositionInModel
    ) {
      this.cleanup()
      return
    }

    try {
      const response = await updateNote(state.currentBoardName, this.draggedNote.noteId, {
        note: originalNoteObject,
        lane_name: targetLaneName,
        position: newPosition
      })

      if (response.ok) {
        showNotification('Note moved successfully!', 'success')
        await initializeLanes()
      } else {
        await handleApiError(response, 'Failed to move note.')
        await initializeLanes()
      }
    } catch (error) {
      handleUIError(
        error,
        'An unexpected error occurred while trying to move the note.'
      )
      showNotification('An error occurred while trying to move the note.')
      await initializeLanes()
    }

    this.cleanup()
  }

  cancelDrag() {
    this.cleanup()
  }

  handleAutoScroll(touch) {
    const mainContent = document.querySelector('.main-content')
    if (!mainContent) return

    const rect = mainContent.getBoundingClientRect()
    const scrollLeft = mainContent.scrollLeft
    const scrollWidth = mainContent.scrollWidth
    const clientWidth = mainContent.clientWidth

    // Calculate distance from edges
    const distanceFromLeft = touch.clientX - rect.left
    const distanceFromRight = rect.right - touch.clientX

    // Stop any existing auto-scroll
    this.stopAutoScroll()

    // Start auto-scroll if near edges
    if (distanceFromLeft < this.edgeThreshold && scrollLeft > 0) {
      this.startAutoScroll('left', distanceFromLeft)
    } else if (distanceFromRight < this.edgeThreshold && scrollLeft < scrollWidth - clientWidth) {
      this.startAutoScroll('right', distanceFromRight)
    }
  }

  startAutoScroll(direction, distance) {
    // Calculate scroll speed based on distance (closer = faster)
    const speedMultiplier = 1 - (distance / this.edgeThreshold)
    const currentSpeed = this.scrollSpeed * speedMultiplier

    // Add visual feedback class
    document.body.classList.add(`mobile-scroll-${direction}`)

    this.autoScrollInterval = setInterval(() => {
      const mainContent = document.querySelector('.main-content')
      if (!mainContent) return

      if (direction === 'left') {
        mainContent.scrollLeft = Math.max(0, mainContent.scrollLeft - currentSpeed)
      } else {
        mainContent.scrollLeft = Math.min(
          mainContent.scrollWidth - mainContent.clientWidth,
          mainContent.scrollLeft + currentSpeed
        )
      }

      // Update placeholder position after scroll
      if (this.placeholder && this.draggedElement && this.lastTouchPosition) {
        this.updatePlaceholderPosition(this.lastTouchPosition)
      }
    }, 16) // ~60fps
  }

  stopAutoScroll() {
    // Remove visual feedback classes
    document.body.classList.remove('mobile-scroll-left', 'mobile-scroll-right')

    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval)
      this.autoScrollInterval = null
    }
  }

  cleanup() {
    // Stop auto-scroll
    this.stopAutoScroll()

    // Remove drag active class
    document.body.classList.remove('mobile-drag-active')

    // Remove placeholder
    if (this.placeholder) {
      this.placeholder.remove()
      this.placeholder = null
    }

    // Show original element
    if (this.draggedElement) {
      this.draggedElement.style.visibility = ''
      this.draggedElement = null
    }

    // Remove highlights
    this.highlightDropZones(false)
    document.querySelectorAll('.notes-list--drag-over-mobile').forEach(el => {
      el.classList.remove('notes-list--drag-over-mobile')
    })

    // Remove indicators
    document.querySelectorAll('.mobile-drop-indicator').forEach(el => el.remove())

    // Reset state
    this.draggedNote = null
    this.touchOffset = { x: 0, y: 0 }
    this.lastTouchPosition = null
  }

  highlightDropZones(highlight) {
    document.querySelectorAll('.notes-list').forEach(zone => {
      if (highlight) {
        zone.classList.add('mobile-drop-zone-highlight')
      } else {
        zone.classList.remove('mobile-drop-zone-highlight')
      }
    })
  }
}

// Initialize mobile drag and drop when DOM is ready
let mobileDragDrop = null

export function initializeMobileDragDrop() {
  if (window.innerWidth <= 768 && !mobileDragDrop) {
    mobileDragDrop = new MobileDragDrop()
  }
}

// Re-initialize on window resize
export function handleMobileDragDropResize() {
  if (window.innerWidth <= 768 && !mobileDragDrop) {
    mobileDragDrop = new MobileDragDrop()
  } else if (window.innerWidth > 768 && mobileDragDrop) {
    // Clean up mobile drag drop when switching to desktop
    mobileDragDrop.cleanup()
    mobileDragDrop = null
  }
}