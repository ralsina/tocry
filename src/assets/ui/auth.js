/**
 * Fetches the current user's authentication status from the server
 * and updates the UI to show their name and a logout button if logged in.
 */
export async function initializeAuthStatus () {
  const userStatusContainer = document.getElementById('user-status')
  const userMenuBtn = document.getElementById('user-menu-btn')
  const userMenuDropdown = document.getElementById('user-menu-dropdown')
  const userNameDropdownElement = document.getElementById('user-name-dropdown')

  if (
    !userStatusContainer ||
    !userMenuBtn ||
    !userMenuDropdown ||
    !userNameDropdownElement
  ) { return }

  try {
    const response = await fetch('/me') // Changed endpoint to /me
    const userData = await response.json()

    if (userData.logged_in) {
      userNameDropdownElement.textContent = userData.name
      userStatusContainer.style.display = '' // Show the container

      userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation() // Prevent the document click listener from firing immediately
        const isHidden = userMenuDropdown.style.display === 'none'
        userMenuDropdown.style.display = isHidden ? 'block' : 'none'
      })

      // Add a listener to the whole document to close the dropdown if the user clicks away
      document.addEventListener('click', (e) => {
        if (
          userMenuDropdown.style.display === 'block' &&
          !userStatusContainer.contains(e.target)
        ) {
          userMenuDropdown.style.display = 'none'
        }
      })
    }
  } catch (error) {
    // This will catch network errors, but not 4xx/5xx responses.
    console.error('Error fetching authentication status:', error)
  }
}
