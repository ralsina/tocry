export const BOARD_SELECTOR_OPTIONS = {
  NEW_BOARD: '__NEW_BOARD__',
  RENAME_BOARD: '__RENAME_BOARD__',
  DELETE_BOARD: '__DELETE_BOARD__',
  SHARE_BOARD: '__SHARE_BOARD__',
  SEPARATOR: '---'
}

/**
 * UUID validation regex pattern
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Validates if a string is a valid UUID
 * @param {string} uuid The string to validate
 * @returns {boolean} True if valid UUID format
 */
export function isValidUuid (uuid) {
  return UUID_REGEX.test(uuid)
}

/**
 * Extracts the original filename from a UUID-prefixed filename.
 * Assumes the format is "uuid_originalFilename.ext".
 * @param {string} uuidPrefixedFilename The filename with a UUID prefix.
 * @returns {string} The original filename without the UUID prefix.
 */
export function getOriginalFileName (uuidPrefixedFilename) {
  const parts = uuidPrefixedFilename.split('_')
  // Check if the first part looks like a UUID and if there's more than one part.
  if (parts.length > 1 && isValidUuid(parts[0])) {
    return parts.slice(1).join('_')
  }
  return uuidPrefixedFilename // Return as is if not in the expected format
}
