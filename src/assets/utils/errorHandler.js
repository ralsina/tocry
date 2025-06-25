/**
 * @module errorHandler
 * Provides utility functions for handling various types of errors and displaying user notifications.
 */

import { showNotification } from '../ui/dialogs.js'

/**
 * Handles API response errors by parsing the error message and displaying a notification.
 * @param {Response} response The fetch API response object.
 * @param {string} defaultMessage A default message to show if no specific error is found.
 */
export async function handleApiError (response, defaultMessage = 'An unexpected error occurred.') {
  let errorMessage = defaultMessage
  try {
    const errorData = await response.json()
    errorMessage = errorData.error || errorData.message || defaultMessage
  } catch (e) {
    console.error('Failed to parse error response:', e)
    errorMessage = `Failed to parse error: ${response.statusText || defaultMessage}`
  }

  console.error('API Error:', response.status, response.statusText, errorMessage)
  showNotification(errorMessage, 'error')

  // Optionally, re-throw the error to prevent further execution in the calling function
  throw new Error(errorMessage)
}

/**
 * Handles general UI errors by logging them and showing a notification.
 * @param {Error} error The error object.
 * @param {string} defaultMessage A default message to show if the error message is not user-friendly.
 */
export function handleUIError (error, defaultMessage = 'An unexpected error occurred.') {
  console.error('UI Error:', error)
  showNotification(error.message || defaultMessage, 'error')
}
