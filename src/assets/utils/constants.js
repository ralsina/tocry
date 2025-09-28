export const BOARD_SELECTOR_OPTIONS = {
  NEW_BOARD: '__NEW_BOARD__',
  RENAME_BOARD: '__RENAME_BOARD__',
  DELETE_BOARD: '__DELETE_BOARD__',
  SHARE_BOARD: '__SHARE_BOARD__',
  SEND_MESSAGE: '__SEND_MESSAGE__',
  SEPARATOR: '---'
}

/**
 * Extracts the original filename from a UUID-prefixed filename.
 * Assumes the format is "uuid_originalFilename.ext".
 * @param {string} uuidPrefixedFilename The filename with a UUID prefix.
 * @returns {string} The original filename without the UUID prefix.
 */
export function getOriginalFileName (uuidPrefixedFilename) {
  const parts = uuidPrefixedFilename.split('_')
  // Check if the first part looks like a UUID (e.g., "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx")
  // and if there's more than one part.
  if (parts.length > 1 && parts[0].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return parts.slice(1).join('_')
  }
  return uuidPrefixedFilename // Return as is if not in the expected format
}
