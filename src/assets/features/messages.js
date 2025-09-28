/* global window */
import {
  fetchMessages,
  fetchUnreadMessageCount,
  fetchMessage,
  sendMessage,
  markMessageAsRead,
  archiveMessage
} from '../api.js'
import { showNotification } from '../ui/dialogs.js'
import { handleUIError } from '../utils/errorHandler.js'

// Message center state
const state = {
  messages: [],
  unreadCount: 0,
  pollingInterval: null,
  currentMessage: null
}

// Initialize message center
export function initializeMessageCenter () {
  const messageCenterBtn = document.getElementById('message-center-btn')
  const mobileMessageCenterBtn = document.getElementById('mobile-message-center-btn')
  const composeMessageBtn = document.getElementById('compose-message-btn')
  const composeMessageForm = document.getElementById('compose-message-form')
  const replyMessageBtn = document.getElementById('reply-message-btn')
  const archiveMessageBtn = document.getElementById('archive-message-btn')

  // Set up event listeners
  if (messageCenterBtn) {
    messageCenterBtn.addEventListener('click', toggleMessageCenter)
  }

  if (mobileMessageCenterBtn) {
    mobileMessageCenterBtn.addEventListener('click', () => {
      // Close mobile menu when opening messages
      const mobileMenuOverlay = document.getElementById('mobile-menu-overlay')
      if (mobileMenuOverlay) {
        mobileMenuOverlay.classList.remove('active')
        document.body.style.overflow = 'auto'
      }
      // Open message center
      toggleMessageCenter()
    })
  }

  if (composeMessageBtn) {
    composeMessageBtn.addEventListener('click', openComposeMessageDialog)
  }

  if (composeMessageForm) {
    composeMessageForm.addEventListener('submit', handleSendMessage)
  }

  if (replyMessageBtn) {
    replyMessageBtn.addEventListener('click', handleReplyMessage)
  }

  if (archiveMessageBtn) {
    archiveMessageBtn.addEventListener('click', handleArchiveMessage)
  }

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('message-center-dropdown')
    const container = document.querySelector('.message-center-container')

    if (dropdown && container && !container.contains(e.target)) {
      dropdown.style.display = 'none'
    }
  })

  // Start polling for new messages
  startPolling()

  // Initial load
  loadMessages()
}

// Toggle message center dropdown
async function toggleMessageCenter () {
  const dropdown = document.getElementById('message-center-dropdown')

  if (dropdown.style.display === 'none' || !dropdown.style.display) {
    await loadMessages()
    dropdown.style.display = 'block'
  } else {
    dropdown.style.display = 'none'
  }
}

// Load messages into the dropdown
async function loadMessages () {
  try {
    const response = await fetchMessages({ status: 'unread', limit: 5 })
    state.messages = response

    const messageList = document.getElementById('message-list')
    if (!messageList) return

    if (response.length === 0) {
      messageList.innerHTML = '<div class="no-messages">No new messages</div>'
    } else {
      messageList.innerHTML = response.map(message => `
        <div class="message-item ${message.status}" data-message-id="${message.id}">
          <div class="message-item-header">
            <span class="message-from">${message.from_user}</span>
            <span class="message-date">${formatDate(message.created_at)}</span>
          </div>
          <div class="message-subject">${escapeHtml(message.subject)}</div>
          <div class="message-preview">${escapeHtml(message.preview)}</div>
        </div>
      `).join('')

      // Add click listeners to messages
      messageList.querySelectorAll('.message-item').forEach(item => {
        item.addEventListener('click', () => {
          const messageId = item.dataset.messageId
          openMessageDetail(messageId)
        })
      })
    }
  } catch (error) {
    console.error('Failed to load messages:', error)
  }
}

// Load and update unread count
async function updateUnreadCount () {
  try {
    const response = await fetchUnreadMessageCount()
    state.unreadCount = response.count

    // Update desktop unread count
    const unreadCountEl = document.getElementById('unread-count')
    if (unreadCountEl) {
      if (response.count > 0) {
        unreadCountEl.textContent = response.count > 99 ? '99+' : response.count
        unreadCountEl.style.display = 'inline-block'
      } else {
        unreadCountEl.style.display = 'none'
      }
    }

    // Update mobile unread count
    const mobileUnreadCountEl = document.getElementById('mobile-unread-count')
    if (mobileUnreadCountEl) {
      if (response.count > 0) {
        mobileUnreadCountEl.textContent = response.count > 99 ? '99+' : response.count
        mobileUnreadCountEl.style.display = 'inline-block'
      } else {
        mobileUnreadCountEl.style.display = 'none'
      }
    }
  } catch (error) {
    console.error('Failed to update unread count:', error)
  }
}

// Open compose message dialog
function openComposeMessageDialog (recipient = '', subject = '', content = '') {
  const dialog = document.getElementById('compose-message-dialog')
  const form = document.getElementById('compose-message-form')

  if (form) {
    form.reset()
    if (recipient) {
      document.getElementById('message-to').value = recipient
    }
    if (subject) {
      document.getElementById('message-subject').value = subject.startsWith('Re: ') ? subject : `Re: ${subject}`
    }
    if (content) {
      document.getElementById('message-content').value = `\n\n---\nOriginal message:\n${content}`
    }
  }

  if (dialog) {
    dialog.showModal()
    dialog.classList.add('dialog-enter')
  }
}

// Close compose message dialog
function closeComposeMessageDialog () {
  const dialog = document.getElementById('compose-message-dialog')
  if (dialog) {
    dialog.classList.add('dialog-exit')
    setTimeout(() => {
      dialog.close()
      dialog.classList.remove('dialog-enter', 'dialog-exit')
    }, 200)
  }
}

// Handle send message
async function handleSendMessage (e) {
  e.preventDefault()

  const form = e.target
  const formData = new FormData(form)

  try {
    const response = await sendMessage(
      formData.get('to'),
      formData.get('subject'),
      formData.get('content')
    )

    if (response.success) {
      showNotification('Message sent successfully!', 'success')
      closeComposeMessageDialog()
      loadMessages()
    }
  } catch (error) {
    handleUIError(error, 'Failed to send message.')
  }
}

// Open message detail dialog
async function openMessageDetail (messageId) {
  try {
    const message = await fetchMessage(messageId)
    state.currentMessage = message

    const dialog = document.getElementById('message-detail-dialog')

    // Populate dialog content
    document.getElementById('message-detail-subject').textContent = message.subject
    document.getElementById('message-detail-from').textContent = `From: ${message.from_user}`
    document.getElementById('message-detail-date').textContent = formatDate(message.created_at)
    document.getElementById('message-detail-body').innerHTML = formatMessageContent(message.content)

    // Show dialog
    if (dialog) {
      dialog.showModal()
      dialog.classList.add('dialog-enter')
    }

    // Mark as read
    if (message.status === 'unread') {
      await markMessageAsRead(messageId)
      updateUnreadCount()
    }
  } catch (error) {
    handleUIError(error, 'Failed to load message.')
  }
}

// Close message detail dialog
function closeMessageDetailDialog () {
  const dialog = document.getElementById('message-detail-dialog')
  if (dialog) {
    dialog.classList.add('dialog-exit')
    setTimeout(() => {
      dialog.close()
      dialog.classList.remove('dialog-enter', 'dialog-exit')
    }, 200)
  }
}

// Handle reply message
function handleReplyMessage () {
  if (state.currentMessage) {
    closeMessageDetailDialog()
    openComposeMessageDialog(
      state.currentMessage.from_user,
      state.currentMessage.subject,
      state.currentMessage.content
    )
  }
}

// Handle archive message
async function handleArchiveMessage () {
  if (!state.currentMessage) return

  try {
    await archiveMessage(state.currentMessage.id)
    showNotification('Message archived', 'success')
    closeMessageDetailDialog()
    loadMessages()
    updateUnreadCount()
  } catch (error) {
    handleUIError(error, 'Failed to archive message.')
  }
}

// Start polling for new messages
function startPolling () {
  // Update unread count every 30 seconds
  state.pollingInterval = setInterval(() => {
    updateUnreadCount()
  }, 30000)
}

// Stop polling
function stopPolling () {
  if (state.pollingInterval) {
    clearInterval(state.pollingInterval)
    state.pollingInterval = null
  }
}

// Export stopPolling for external use
export { stopPolling }

// Utility functions
function formatDate (dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

function escapeHtml (text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function formatMessageContent (content) {
  // Simple markdown-like formatting
  return content
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
}

// Global functions for template onclick handlers
window.closeComposeMessageDialog = closeComposeMessageDialog
window.closeMessageDetailDialog = closeMessageDetailDialog

export { updateUnreadCount, openComposeMessageDialog }
