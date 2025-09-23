// Mobile functionality for ToCry
export function initializeMobileMenu () {
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle')
  const mobileMenuOverlay = document.getElementById('mobile-menu-overlay')
  const mobileMenuClose = document.getElementById('mobile-menu-close')

  if (!mobileMenuToggle || !mobileMenuOverlay || !mobileMenuClose) {
    console.warn('Mobile menu elements not found')
    return
  }

  // Open mobile menu
  mobileMenuToggle.addEventListener('click', () => {
    mobileMenuOverlay.classList.add('active')
    document.body.style.overflow = 'hidden' // Prevent scrolling
  })

  // Close mobile menu
  const closeMobileMenu = () => {
    mobileMenuOverlay.classList.remove('active')
    document.body.style.overflow = 'auto' // Re-enable scrolling
  }

  mobileMenuClose.addEventListener('click', closeMobileMenu)

  // Close when clicking overlay
  mobileMenuOverlay.addEventListener('click', (e) => {
    if (e.target === mobileMenuOverlay) {
      closeMobileMenu()
    }
  })

  // Close with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenuOverlay.classList.contains('active')) {
      closeMobileMenu()
    }
  })
}

// Sync mobile controls with desktop controls
export function syncMobileControls () {
  // Sync theme switcher
  const desktopThemeSwitcher = document.getElementById('theme-switcher')
  const mobileThemeSwitcher = document.getElementById('mobile-theme-switcher')

  if (desktopThemeSwitcher && mobileThemeSwitcher) {
    mobileThemeSwitcher.addEventListener('click', () => {
      desktopThemeSwitcher.click()
    })

    // Sync the icon
    const updateMobileThemeIcon = () => {
      mobileThemeSwitcher.textContent = desktopThemeSwitcher.textContent
    }

    updateMobileThemeIcon()
    const observer = new MutationObserver(updateMobileThemeIcon)
    observer.observe(desktopThemeSwitcher, { childList: true })
  }

  // Sync board selector
  const desktopBoardSelector = document.getElementById('board-selector')
  const mobileBoardSelector = document.getElementById('mobile-board-selector')

  if (desktopBoardSelector && mobileBoardSelector) {
    // Copy options from desktop to mobile
    mobileBoardSelector.innerHTML = desktopBoardSelector.innerHTML

    // Sync selection changes
    const syncBoardSelection = (source, target) => {
      target.value = source.value
    }

    desktopBoardSelector.addEventListener('change', () => {
      syncBoardSelection(desktopBoardSelector, mobileBoardSelector)
    })

    mobileBoardSelector.addEventListener('change', () => {
      syncBoardSelection(mobileBoardSelector, desktopBoardSelector)
      // Close mobile menu after board selection
      document.getElementById('mobile-menu-overlay')?.classList.remove('active')
      document.body.style.overflow = 'auto'
    })

    // Initial sync
    syncBoardSelection(desktopBoardSelector, mobileBoardSelector)
  }

  // Sync color scheme selector
  const desktopColorSchemeSelector = document.getElementById('color-scheme-switcher')
  const mobileColorSchemeSelector = document.getElementById('mobile-color-scheme-switcher')

  if (desktopColorSchemeSelector && mobileColorSchemeSelector) {
    // Copy options from desktop to mobile
    mobileColorSchemeSelector.innerHTML = desktopColorSchemeSelector.innerHTML

    // Set initial value from desktop
    mobileColorSchemeSelector.value = desktopColorSchemeSelector.value

    // Add event listener to mobile color scheme selector
    mobileColorSchemeSelector.addEventListener('change', (e) => {
      // Update desktop selector to maintain sync
      desktopColorSchemeSelector.value = e.target.value

      // Trigger the color scheme change
      const event = new Event('change', { bubbles: true })
      desktopColorSchemeSelector.dispatchEvent(event)
    })

    // Listen to desktop changes and update mobile
    desktopColorSchemeSelector.addEventListener('change', (e) => {
      mobileColorSchemeSelector.value = e.target.value
    })
  }

  // Sync search
  const desktopSearch = document.getElementById('search')
  const mobileSearch = document.getElementById('mobile-search')

  if (desktopSearch && mobileSearch) {
    const syncSearch = (source, target) => {
      target.value = source.value
    }

    desktopSearch.addEventListener('input', () => {
      syncSearch(desktopSearch, mobileSearch)
    })

    mobileSearch.addEventListener('input', () => {
      syncSearch(mobileSearch, desktopSearch)
    })
  }

  // Sync user status
  const userStatus = document.getElementById('user-status')
  const mobileUserSection = document.getElementById('mobile-user-section')
  const userName = document.getElementById('user-name-dropdown')
  const mobileUserName = document.getElementById('mobile-user-name')

  if (userStatus && mobileUserSection) {
    // Show/hide mobile user section based on desktop user status
    const updateUserVisibility = () => {
      const isVisible = userStatus.style.display !== 'none'
      mobileUserSection.style.display = isVisible ? 'block' : 'none'

      if (isVisible && userName && mobileUserName) {
        mobileUserName.textContent = userName.textContent
      }
    }

    updateUserVisibility()

    // Watch for changes in user status visibility
    const userObserver = new MutationObserver(updateUserVisibility)
    userObserver.observe(userStatus, { attributes: true, attributeFilter: ['style'] })
  }
}

// Initialize mobile functionality when DOM is ready
export function initializeMobile () {
  initializeMobileMenu()

  // Wait a bit for other components to initialize before syncing
  setTimeout(syncMobileControls, 100)
}