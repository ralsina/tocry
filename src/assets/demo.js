// demo.js - Demo-specific functionality for ToCry

// Initialize demo functionality
export function initializeDemo() {
  showDemoElements()
  setupDemoResetButton()
  showDemoWelcomeNotification()
  setupDemoWriteNotification()
}

// Show demo-specific UI elements
function showDemoElements() {
  // Show demo banner
  const demoBanner = document.querySelector('.demo-banner')
  if (demoBanner) {
    demoBanner.style.display = 'block'
  }

  // Show demo reset button
  const resetBtn = document.getElementById('demo-reset-btn')
  if (resetBtn) {
    resetBtn.style.display = 'block'
  }

  // Add demo class to body for styling
  document.body.classList.add('has-demo-banner')
}

// Setup demo reset button functionality
function setupDemoResetButton() {
  const resetBtn = document.getElementById('demo-reset-btn')
  if (!resetBtn) return

  resetBtn.addEventListener('click', async () => {
    if (confirm('Reset all demo data? This will restore the original sample boards.')) {
      try {
        const response = await fetch('/demo/reset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          showNotification('Demo data reset successfully!', 'success')
          // Reload the page to show fresh demo data
          setTimeout(() => window.location.reload(), 1000)
        } else {
          showNotification('Failed to reset demo data', 'error')
        }
      } catch (error) {
        console.error('Error resetting demo:', error)
        showNotification('Error resetting demo data', 'error')
      }
    }
  })
}

// Show welcome notification for demo users
function showDemoWelcomeNotification() {
  // Check if we've already shown the welcome notification in this session
  if (sessionStorage.getItem('demo-welcome-shown')) {
    return
  }

  setTimeout(() => {
    showNotification(`
      <div style="text-align: center;">
        <h4 style="margin: 0 0 0.5rem 0;">Welcome to the ToCry Demo!</h4>
        <p style="margin: 0;">This is a read-only demo showcasing ToCry's features.</p>
        <p style="margin: 0.5rem 0 0 0; font-size: 0.9em; opacity: 0.8;">
          💡 Try dragging notes between lanes, exploring different boards, and testing the search!
        </p>
      </div>
    `, 'info', 8000)

    sessionStorage.setItem('demo-welcome-shown', 'true')
  }, 1000)
}

// Setup notifications for demo write operations
function setupDemoWriteNotification() {
  // Intercept form submissions that would normally write data
  const forms = document.querySelectorAll('form')
  forms.forEach(form => {
    if (form.id === 'search-form') return // Skip search form

    form.addEventListener('submit', (e) => {
      e.preventDefault()
      showDemoWriteMessage()
    })
  })

  // Intercept delete buttons and other write actions
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-demo-write]')) {
      e.preventDefault()
      showDemoWriteMessage()
    }
  })
}

// Show message for demo write operations
function showDemoWriteMessage() {
  showNotification(`
    <div style="text-align: center;">
      <h4 style="margin: 0 0 0.5rem 0;">Demo Mode</h4>
      <p style="margin: 0;">This is a read-only demo. Modifications are disabled.</p>
      <p style="margin: 0.5rem 0 0 0; font-size: 0.9em; opacity: 0.8;">
        🚀 <a href="https://github.com/ralsina/tocry" target="_blank" style="color: inherit;">Get your own copy</a> to make changes!
      </p>
    </div>
  `, 'warning', 5000)
}

// Show a notification (reused from main app)
function showNotification(message, type = 'info', duration = 3000) {
  const container = document.getElementById('notification-container')
  if (!container) return

  const notification = document.createElement('div')
  notification.className = `notification notification-${type}`
  notification.innerHTML = `
    <div class="notification-content">
      ${message}
    </div>
    <button class="notification-close" onclick="this.parentElement.remove()">×</button>
  `

  container.appendChild(notification)

  // Auto-remove after duration
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove()
    }
  }, duration)
}