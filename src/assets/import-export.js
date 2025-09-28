// import-export.js - Handles data import/export functionality

// Show a toast notification
function showToast (message, type = 'info') {
  const container = document.getElementById('notification-container')
  if (!container) return

  const toast = document.createElement('div')
  toast.className = `notification-toast ${type}`
  toast.textContent = message

  container.appendChild(toast)

  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10)

  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast)
      }
    }, 300)
  }, 3000)
}

// Export user data
export async function handleExportClick () {
  try {
    showToast('Preparing export...', 'info')

    const response = await fetch('/api/export')

    if (!response.ok) {
      const error = await response.json()
      showToast(error.message || 'Export failed', 'error')
      return
    }

    // Get filename from response headers
    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = 'tocry_export.tar.gz'

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/)
      if (filenameMatch) {
        filename = filenameMatch[1]
      }
    }

    // Create blob and download
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    showToast('Export completed successfully!', 'success')
  } catch (error) {
    console.error('Export error:', error)
    showToast('Export failed: ' + error.message, 'error')
  }
}

// Import user data
export async function handleImportClick () {
  // Create file input
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.tar.gz'

  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // First validate the file
    try {
      showToast('Validating export file...', 'info')

      const formData = new FormData()
      formData.append('file', file)

      const validateResponse = await fetch('/api/import/validate', {
        method: 'POST',
        body: formData
      })

      const validateResult = await validateResponse.json()

      if (!validateResult.valid) {
        showToast('Invalid export file: ' + validateResult.message, 'error')
        return
      }

      // Confirm import
      if (!window.confirm('This will import all data from the export file. Are you sure you want to continue?')) {
        return
      }

      showToast('Importing data...', 'info')

      const importFormData = new FormData()
      importFormData.append('file', file)

      const importResponse = await fetch('/api/import', {
        method: 'POST',
        body: importFormData
      })

      const importResult = await importResponse.json()

      if (importResult.success) {
        showToast('Import completed successfully! Reloading page...', 'success')
        // Reload the page after a short delay
        setTimeout(() => window.location.reload(), 2000)
      } else {
        showToast('Import failed: ' + (importResult.message || 'Unknown error'), 'error')
      }
    } catch (error) {
      console.error('Import error:', error)
      showToast('Import failed: ' + error.message, 'error')
    }
  }

  input.click()
}

// Setup import/export button event listeners
export function initializeImportExport () {
  // Desktop buttons
  setupEventListener('export-btn', 'click', handleExportClick)
  setupEventListener('import-btn', 'click', handleImportClick)

  // Mobile buttons
  setupEventListener('mobile-export-btn', 'click', handleExportClick)
  setupEventListener('mobile-import-btn', 'click', handleImportClick)
}

// Utility function to setup event listeners (copied from app.js)
function setupEventListener (selector, event, handler) {
  const element = document.getElementById(selector) || document.querySelector(selector)
  if (element) {
    element.addEventListener(event, handler)
    return true
  }
  return false
}
