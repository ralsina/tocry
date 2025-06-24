/**
 * Updates the visibility of horizontal scroll buttons based on the scroll position.
 */
export function updateScrollButtonsVisibility () {
  const mainContent = document.querySelector('.main-content')
  const scrollLeftBtn = document.querySelector('.scroll-btn--left')
  const scrollRightBtn = document.querySelector('.scroll-btn--right')

  if (!mainContent || !scrollLeftBtn || !scrollRightBtn) return

  const scrollLeft = mainContent.scrollLeft
  const scrollWidth = mainContent.scrollWidth
  const clientWidth = mainContent.clientWidth
  const scrollBuffer = 2 // Buffer for floating point inaccuracies

  // Left button visibility
  if (scrollLeft > scrollBuffer) {
    scrollLeftBtn.classList.add('scroll-btn--visible')
  } else {
    scrollLeftBtn.classList.remove('scroll-btn--visible')
  }

  // Right button visibility
  if (scrollLeft < scrollWidth - clientWidth - scrollBuffer) {
    scrollRightBtn.classList.add('scroll-btn--visible')
  } else {
    scrollRightBtn.classList.remove('scroll-btn--visible')
  }
}

/**
 * Handles clicking the horizontal scroll buttons.
 * @param {string} direction 'left' or 'right'.
 */
export function handleScrollButtonClick (direction) {
  const mainContent = document.querySelector('.main-content')
  if (!mainContent) return

  const scrollAmount = mainContent.clientWidth * 0.8 // Scroll 80% of the visible width
  mainContent.scrollBy({
    left: direction === 'left' ? -scrollAmount : scrollAmount,
    behavior: 'smooth'
  })
}

/**
 * Handles global keydown events for application-wide shortcuts.
 * @param {KeyboardEvent} event The keydown event.
 */
export function handleKeyDown (event) {
  // Ignore key presses if the user is typing in an input, textarea, or contentEditable element.
  // This prevents the page from scrolling when the user is editing text.
  const activeElement = document.activeElement
  const isTyping =
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.isContentEditable

  if (isTyping) return

  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault() // Prevent default browser action (e.g., scrolling the whole window)
      handleScrollButtonClick('left')
      break
    case 'ArrowRight':
      event.preventDefault()
      handleScrollButtonClick('right')
      break
  }
}

let scrollInterval = null
export const SCROLL_SPEED = 15 // Speed of the scroll in pixels
export const EDGE_ZONE_WIDTH = 120 // Width of the edge zone in pixels that triggers scrolling

export function stopDragAutoScroll () {
  if (scrollInterval) {
    clearInterval(scrollInterval.id)
    scrollInterval = null
  }
}

/**
 * Checks the mouse position during a drag event and scrolls the main container
 * horizontally if the cursor is near the left or right edge of the viewport.
 * @param {DragEvent} event The dragover event.
 */
export function handleDragAutoScroll (event) {
  const mainContent = document.querySelector('.main-content')
  if (!mainContent) return

  const x = event.clientX
  const screenWidth = window.innerWidth

  // Check if we are in the right edge zone
  if (x > screenWidth - EDGE_ZONE_WIDTH) {
    // If not already scrolling right, start a new scroll interval
    if (
      !scrollInterval ||
      (scrollInterval && scrollInterval.direction !== 'right')
    ) {
      stopDragAutoScroll() // Stop any left scroll
      scrollInterval = {
        id: setInterval(() => {
          mainContent.scrollLeft += SCROLL_SPEED
        }, 20), // ~50fps
        direction: 'right'
      }
    }
  } else if (x < EDGE_ZONE_WIDTH) { // Check if we are in the left edge zone
    // If not already scrolling left, start a new scroll interval
    if (
      !scrollInterval ||
      (scrollInterval && scrollInterval.direction !== 'left')
    ) {
      stopDragAutoScroll() // Stop any right scroll
      scrollInterval = {
        id: setInterval(() => {
          mainContent.scrollLeft -= SCROLL_SPEED
        }, 20),
        direction: 'left'
      }
    }
  } else { // If we are not in an edge zone, stop any active scrolling
    stopDragAutoScroll()
  }
}
