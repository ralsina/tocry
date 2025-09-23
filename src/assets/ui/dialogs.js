/**
 * Displays a custom confirmation dialog.
 * @param {string} message The message to display in the dialog.
 * @param {string} title The title of the dialog. Defaults to 'Confirm Action'.
 * @returns {Promise<boolean>} A promise that resolves to true if confirmed, false if canceled.
 */
export function showConfirmation (message, title = 'Confirm Action') {
  return new Promise((resolve) => {
    const dialog = document.getElementById('custom-confirm-dialog')
    const titleElement = document.getElementById('confirm-dialog-title')
    const messageElement = document.getElementById('confirm-dialog-message')
    const okButton = document.getElementById('confirm-dialog-ok-btn')
    const cancelButton = document.getElementById('confirm-dialog-cancel-btn')

    if (
      !dialog ||
      !titleElement ||
      !messageElement ||
      !okButton ||
      !cancelButton
    ) {
      console.error('Confirmation dialog elements not found.')
      return resolve(window.confirm(message)) // Fallback to native confirm
    }

    titleElement.textContent = title
    messageElement.textContent = message

    // Function to close dialog with animation
    const closeDialog = (result) => {
      const isTestMode = document.documentElement.hasAttribute('data-test-mode')

      if (isTestMode) {
        // Skip animation in test mode
        dialog.close()
        resolve(result)
      } else {
        dialog.classList.add('dialog-exit')
        setTimeout(() => {
          dialog.close()
          dialog.classList.remove('dialog-exit', 'dialog-enter')
          resolve(result)
        }, 200) // Match the exit animation duration
      }
    }

    // Clear previous listeners to prevent multiple calls
    okButton.onclick = null
    cancelButton.onclick = null

    okButton.onclick = () => closeDialog(true)
    cancelButton.onclick = () => closeDialog(false)

    dialog.showModal()

    const isTestMode = document.documentElement.hasAttribute('data-test-mode')
    if (!isTestMode) {
      dialog.classList.add('dialog-enter')
    }
  })
}

/**
 * Displays a custom prompt dialog.
 * @param {string} message The message to display in the dialog.
 * @param {string} title The title of the dialog.
 * @param {string} [defaultValue=''] The default value for the input field.
 * @returns {Promise<string|null>} A promise that resolves with the input value, or null if canceled.
 */
export function showPrompt (message, title, defaultValue = '') {
  return new Promise((resolve) => {
    const dialog = document.getElementById('custom-prompt-dialog')
    const titleElement = document.getElementById('prompt-dialog-title')
    const messageElement = document.getElementById('prompt-dialog-message')
    const form = document.getElementById('prompt-dialog-form')
    const input = document.getElementById('prompt-dialog-input')
    const okButton = document.getElementById('prompt-dialog-ok-btn')
    const cancelButton = document.getElementById('prompt-dialog-cancel-btn')

    if (
      !dialog ||
      !titleElement ||
      !messageElement ||
      !form ||
      !input ||
      !okButton ||
      !cancelButton
    ) {
      console.error('Prompt dialog elements not found.')
      return resolve(window.prompt(message, defaultValue)) // Fallback to native prompt
    }

    titleElement.textContent = title
    messageElement.textContent = message
    input.value = defaultValue

    // Function to close dialog with animation
    const closeDialog = (result) => {
      const isTestMode = document.documentElement.hasAttribute('data-test-mode')

      if (isTestMode) {
        // Skip animation in test mode
        dialog.close()
        resolve(result)
      } else {
        dialog.classList.add('dialog-exit')
        setTimeout(() => {
          dialog.close()
          dialog.classList.remove('dialog-exit', 'dialog-enter')
          resolve(result)
        }, 200) // Match the exit animation duration
      }
    }

    form.onsubmit = (e) => {
      e.preventDefault()
      closeDialog(input.value)
    }
    cancelButton.onclick = () => {
      closeDialog(null)
    }

    dialog.showModal()

    const isTestMode = document.documentElement.hasAttribute('data-test-mode')
    if (!isTestMode) {
      dialog.classList.add('dialog-enter')
    }

    input.focus()
    input.select()
  })
}

/**
 * Displays a toast notification.
 * @param {string} message The message to display.
 * @param {string} type The type of notification ('success', 'error', or 'info'). Defaults to 'error'.
 */
export function showNotification (message, type = 'error') {
  const editModal = document.getElementById('modal-edit-note')
  let targetContainer

  if (editModal && editModal.open) {
    // If the edit modal is open, append the notification inside it
    // We'll append to the article element within the dialog for now.
    // A more specific container might be added later for better positioning.
    targetContainer = editModal.querySelector('article')
    if (!targetContainer) {
      console.error('Could not find article element inside edit modal.')
      return
    }
  } else {
    // Otherwise, append to the global notification container
    targetContainer = document.getElementById('notification-container')
    if (!targetContainer) {
      console.error('Global notification container not found.')
      return
    }
  }

  const toast = document.createElement('div')
  toast.className = `notification-toast ${type}`
  toast.textContent = message

  targetContainer.appendChild(toast)

  // Trigger the animation
  setTimeout(() => {
    toast.classList.add('show')
  }, 10) // Small delay to allow the element to be added to the DOM first

  // Remove the toast after 5 seconds
  setTimeout(() => {
    toast.classList.remove('show')
    toast.addEventListener('transitionend', () => toast.remove())
  }, 5000)
}
