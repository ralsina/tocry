/**
 * @module ui/messages
 * Provides functions to render various UI messages and onboarding content.
 */

/**
 * Renders the message displayed when no boards are available.
 * @returns {string} HTML string for the empty board message.
 */
export function renderEmptyBoardMessage () {
  return `
    <div class="empty-board-message">
      <article>
        <header><h2>Welcome to ToCry.</h2></header>
        <p>You have no boards yet, you can create one by clicking this button</p>
        <button id="create-first-board-btn" class="primary">Create Your First Board</button>
      </article>
    </div>
  `
}

/**
 * Renders the message displayed when a board exists but has no lanes.
 * @returns {string} HTML string for the empty lane message.
 */
export function renderEmptyLaneMessage () {
  return `
    <div class="empty-board-message">
      <article>
        <header><h2>Welcome to your new board!</h2></header>
        <p>This board is currently empty. Get started by adding your first lane.</p>
        <p>Click the pulsing <strong>+</strong> button in the header to create a lane and begin organizing your notes.</p>
      </article>
    </div>
  `
}

/**
 * Renders the onboarding message for the first note in a lane.
 * @returns {string} HTML string for the empty lane message.
 */
export function renderEmptyLaneFirstNoteMessage () {
  return `
    <div class="empty-lane-message">
      <article>
        <header><h4>Great! Your first lane is ready.</h4></header>
        <p>Now you can add your first task by clicking the pulsing <strong>+</strong> button in this lane's header.</p>
        <p>You can also add more lanes using the button in the main header.</p>
      </article>
    </div>
  `
}
