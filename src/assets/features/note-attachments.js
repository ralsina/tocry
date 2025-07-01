import { showNotification, showConfirmation } from '../ui/dialogs.js'
import { handleApiError, handleUIError } from '../utils/errorHandler.js'
import { getOriginalFileName } from '../utils/constants.js'
import { initializeLanes } from './lane.js'

const API_BASE_URL = ''

let currentNoteForAttachments = null

export function handleAttachFileRequest (note) {
  currentNoteForAttachments = note
  const modal = document.getElementById('modal-attach-file')
  if (!modal) return

  const attachmentsList = document.getElementById('attachments-list')
  attachmentsList.innerHTML = '' // Clear previous attachments

  if (note.attachments && note.attachments.length > 0) {
    note.attachments.forEach(attachment => {
      const originalFileName = getOriginalFileName(attachment)
      const attachmentElement = document.createElement('div')
      attachmentElement.className = 'attachment-item'
      
      // Create downloadable link for the attachment
      const downloadLink = document.createElement('a')
      downloadLink.href = `/attachments/${note.id}/${attachment}`
      downloadLink.textContent = originalFileName
      downloadLink.download = originalFileName
      downloadLink.className = 'attachment-download-link'
      
      // Create delete button
      const deleteButton = document.createElement('button')
      deleteButton.className = 'delete-attachment-btn'
      deleteButton.textContent = 'X'
      deleteButton.setAttribute('data-attachment-id', attachment)
      
      attachmentElement.appendChild(downloadLink)
      attachmentElement.appendChild(deleteButton)
      attachmentsList.appendChild(attachmentElement)
    })
  } else {
    attachmentsList.innerHTML = '<p>No attachments yet.</p>'
  }

  // Set up drop zone functionality
  setupDropZone()

  modal.showModal()
}

function setupDropZone() {
  const dropZone = document.getElementById('file-drop-zone')
  const fileInput = document.getElementById('attach-file-input')
  
  if (!dropZone || !fileInput) return

  // Click to browse files
  dropZone.addEventListener('click', () => {
    fileInput.click()
  })

  // Handle file input change (when file is selected via browse)
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelection(e.target.files[0])
      // Clear the file input to allow selecting the same file again
      e.target.value = ''
    }
  })

  // Drag and drop events
  dropZone.addEventListener('dragenter', handleDragEnter)
  dropZone.addEventListener('dragover', handleDragOver)
  dropZone.addEventListener('dragleave', handleDragLeave)
  dropZone.addEventListener('drop', handleDrop)
}

function handleDragEnter(e) {
  e.preventDefault()
  e.stopPropagation()
  e.target.closest('.file-drop-zone').classList.add('drag-over')
}

function handleDragOver(e) {
  e.preventDefault()
  e.stopPropagation()
}

function handleDragLeave(e) {
  e.preventDefault()
  e.stopPropagation()
  // Only remove drag-over if we're leaving the drop zone itself, not its children
  if (!e.target.closest('.file-drop-zone').contains(e.relatedTarget)) {
    e.target.closest('.file-drop-zone').classList.remove('drag-over')
  }
}

function handleDrop(e) {
  e.preventDefault()
  e.stopPropagation()
  
  const dropZone = e.target.closest('.file-drop-zone')
  dropZone.classList.remove('drag-over')
  
  const files = e.dataTransfer.files
  if (files.length > 0) {
    handleFileSelection(files[0])
  }
}

async function handleFileSelection(file) {
  if (!currentNoteForAttachments) {
    showNotification('No note selected for attachment.', 'error')
    return
  }

  // Validate file size (10MB limit)
  const maxSize = 10 * 1024 * 1024 // 10MB in bytes
  if (file.size > maxSize) {
    showNotification('File size exceeds the 10MB limit.', 'error')
    return
  }

  try {
    // Create FormData and upload the file
    const formData = new FormData()
    formData.append('attachment', file)

    const response = await fetch(`${API_BASE_URL}/n/${currentNoteForAttachments.id}/attach`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Upload failed: ${errorText}`)
    }

    const result = await response.json()
    showNotification(`File '${file.name}' attached successfully.`, 'success')

    // Refresh the lanes to show the updated note with the new attachment
    await initializeLanes()

    // Update the attachments list in the modal
    currentNoteForAttachments.attachments = currentNoteForAttachments.attachments || []
    currentNoteForAttachments.attachments.push(result.filename)
    
    // Refresh the modal content
    handleAttachFileRequest(currentNoteForAttachments)

  } catch (error) {
    console.error('Error uploading attachment:', error)
    handleUIError(error, 'Failed to upload attachment')
  }
}

export async function handleAttachmentDelete (event) {
  const attachmentId = event.target.dataset.attachmentId
  if (!attachmentId || !currentNoteForAttachments) {
    showNotification('Attachment or note not found.', 'error')
    return
  }

  if (!(await showConfirmation(`Are you sure you want to delete attachment '${attachmentId}'?`))) {
    return
  }

  try {
    const response = await fetch(`${API_BASE_URL}/n/${currentNoteForAttachments.id}/${attachmentId}`, {
      method: 'DELETE'
    })

    if (response.ok) {
      showNotification(`Attachment '${attachmentId}' deleted successfully!`, 'success')
      // Update the note in state and re-render lanes
      currentNoteForAttachments.attachments = currentNoteForAttachments.attachments.filter(att => att !== attachmentId)
      await initializeLanes() // Re-render to show updated attachments
      // Re-open modal to show updated list
      handleAttachFileRequest(currentNoteForAttachments)
    } else {
      await handleApiError(response, 'Failed to delete attachment.')
    }
  } catch (error) {
    handleUIError(error, 'An unexpected error occurred during deletion.')
  }
}
