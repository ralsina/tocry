// Note attachment functionality
import { getOriginalFileName } from '../utils/constants.js'

export function createAttachmentElement (noteId, attachment) {
  const container = document.createElement('div')
  container.className = 'attachment-item'

  const link = document.createElement('a')
  // Use public endpoint for all attachments - backend will handle authorization
  link.href = `/attachments/${noteId}/${encodeURIComponent(attachment)}`
  link.target = '_blank'
  link.rel = 'noopener noreferrer'

  // Extract original filename from UUID-prefixed filename
  const originalFilename = getOriginalFileName(attachment)
  link.textContent = originalFilename
  link.title = `Download ${originalFilename}`

  container.appendChild(link)
  return container
}
