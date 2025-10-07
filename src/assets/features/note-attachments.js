// Note attachment functionality

export function createAttachmentElement (noteId, attachment) {
  const container = document.createElement('div')
  container.className = 'attachment-item'

  const link = document.createElement('a')
  // Use public endpoint for all attachments - backend will handle authorization
  link.href = `/attachments/${noteId}/${encodeURIComponent(attachment)}`
  link.target = '_blank'
  link.rel = 'noopener noreferrer'

  // Extract original filename from UUID-prefixed filename
  const originalFilename = getOriginalFilename(attachment)
  link.textContent = originalFilename
  link.title = `Download ${originalFilename}`

  container.appendChild(link)
  return container
}

function getOriginalFilename (uuidPrefixedFilename) {
  const parts = uuidPrefixedFilename.split('_')
  // Check if the first part looks like a UUID and if there's more than one part
  if (parts.length > 1 && parts[0].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return parts.slice(1).join('_')
  }
  return uuidPrefixedFilename // Return as is if not in the expected format
}
