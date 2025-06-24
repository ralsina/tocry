/**
 * Displays a custom confirmation dialog.
 * @param {string} message The message to display in the dialog.
 * @param {string} title The title of the dialog. Defaults to 'Confirm Action'.
 * @returns {Promise<boolean>} A promise that resolves to true if confirmed, false if canceled.
 */
export function showConfirmation(message, title = "Confirm Action") {
  return new Promise((resolve) => {
    const dialog = document.getElementById("custom-confirm-dialog");
    const titleElement = document.getElementById("confirm-dialog-title");
    const messageElement = document.getElementById("confirm-dialog-message");
    const okButton = document.getElementById("confirm-dialog-ok-btn");
    const cancelButton = document.getElementById("confirm-dialog-cancel-btn");

    if (
      !dialog ||
      !titleElement ||
      !messageElement ||
      !okButton ||
      !cancelButton
    ) {
      console.error("Confirmation dialog elements not found.");
      return resolve(window.confirm(message)); // Fallback to native confirm
    }

    titleElement.textContent = title;
    messageElement.textContent = message;

    // Clear previous listeners to prevent multiple calls
    okButton.onclick = null;
    cancelButton.onclick = null;

    okButton.onclick = () => {
      dialog.close();
      resolve(true);
    };
    cancelButton.onclick = () => {
      dialog.close();
      resolve(false);
    };

    dialog.showModal();
  });
}

/**
 * Displays a custom prompt dialog.
 * @param {string} message The message to display in the dialog.
 * @param {string} title The title of the dialog.
 * @param {string} [defaultValue=''] The default value for the input field.
 * @returns {Promise<string|null>} A promise that resolves with the input value, or null if canceled.
 */
export function showPrompt(message, title, defaultValue = "") {
  return new Promise((resolve) => {
    const dialog = document.getElementById("custom-prompt-dialog");
    const titleElement = document.getElementById("prompt-dialog-title");
    const messageElement = document.getElementById("prompt-dialog-message");
    const form = document.getElementById("prompt-dialog-form");
    const input = document.getElementById("prompt-dialog-input");
    const okButton = document.getElementById("prompt-dialog-ok-btn");
    const cancelButton = document.getElementById("prompt-dialog-cancel-btn");

    if (
      !dialog ||
      !titleElement ||
      !messageElement ||
      !form ||
      !input ||
      !okButton ||
      !cancelButton
    ) {
      console.error("Prompt dialog elements not found.");
      return resolve(window.prompt(message, defaultValue)); // Fallback to native prompt
    }

    titleElement.textContent = title;
    messageElement.textContent = message;
    input.value = defaultValue;

    const closeDialog = () => {
      dialog.close();
    };

    form.onsubmit = (e) => {
      e.preventDefault();
      closeDialog();
      resolve(input.value);
    };
    cancelButton.onclick = () => {
      closeDialog();
      resolve(null);
    };

    dialog.showModal();
    input.focus();
    input.select();
  });
}

/**
 * Displays a toast notification.
 * @param {string} message The message to display.
 * @param {string} type The type of notification ('info' or 'error'). Defaults to 'error'.
 */
export function showNotification(message, type = "error") {
  const container = document.getElementById("notification-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `notification-toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Trigger the animation
  setTimeout(() => {
    toast.classList.add("show");
  }, 10); // Small delay to allow the element to be added to the DOM first

  // Remove the toast after 5 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    toast.addEventListener("transitionend", () => toast.remove());
  }, 5000);
}
