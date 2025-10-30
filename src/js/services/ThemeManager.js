/**
 * Theme Manager for ToCry Application
 *
 * Centralized management of theme and color scheme functionality.
 * This module handles light/dark mode switching, color scheme validation,
 * CSS variable management, and theme persistence.
 */

export class ThemeManager {
  constructor (store, showToastCallback, showErrorCallback) {
    this.store = store // Reference to main store for API access
    this.showSuccess = showToastCallback
    this.showError = showErrorCallback

    // Theme state
    this.isDarkMode = false
    this.showColorSelector = false
    this.colorSchemes = {
      amber: {
        light: { 'primary-rgb': '255, 193, 7' },
        dark: { 'primary-rgb': '255, 202, 44' }
      },
      blue: {
        light: { 'primary-rgb': '0, 123, 255' },
        dark: { 'primary-rgb': '55, 125, 255' }
      },
      cyan: {
        light: { 'primary-rgb': '23, 162, 184' },
        dark: { 'primary-rgb': '79, 195, 214' }
      },
      fuchsia: {
        light: { 'primary-rgb': '255, 0, 255' },
        dark: { 'primary-rgb': '255, 102, 255' }
      },
      grey: {
        light: { 'primary-rgb': '115, 130, 144' },
        dark: { 'primary-rgb': '161, 172, 184' }
      },
      green: {
        light: { 'primary-rgb': '56, 142, 60' },
        dark: { 'primary-rgb': '102, 187, 106' }
      },
      indigo: {
        light: { 'primary-rgb': '102, 16, 242' },
        dark: { 'primary-rgb': '154, 104, 247' }
      },
      jade: {
        light: { 'primary-rgb': '0, 168, 107' },
        dark: { 'primary-rgb': '0, 200, 130' }
      },
      lime: {
        light: { 'primary-rgb': '205, 220, 57' },
        dark: { 'primary-rgb': '220, 231, 117' }
      },
      orange: {
        light: { 'primary-rgb': '255, 152, 0' },
        dark: { 'primary-rgb': '255, 183, 77' }
      },
      pink: {
        light: { 'primary-rgb': '233, 30, 99' },
        dark: { 'primary-rgb': '244, 143, 177' }
      },
      pumpkin: {
        light: { 'primary-rgb': '255, 112, 0' },
        dark: { 'primary-rgb': '255, 144, 51' }
      },
      purple: {
        light: { 'primary-rgb': '156, 39, 176' },
        dark: { 'primary-rgb': '186, 104, 200' }
      },
      red: {
        light: { 'primary-rgb': '211, 47, 47' },
        dark: { 'primary-rgb': '255, 82, 82' }
      },
      sand: {
        light: { 'primary-rgb': '215, 194, 169' },
        dark: { 'primary-rgb': '227, 211, 189' }
      },
      slate: {
        light: { 'primary-rgb': '82, 105, 129' },
        dark: { 'primary-rgb': '132, 151, 171' }
      },
      violet: {
        light: { 'primary-rgb': '126, 87, 194' },
        dark: { 'primary-rgb': '179, 157, 219' }
      },
      yellow: {
        light: { 'primary-rgb': '255, 235, 59' },
        dark: { 'primary-rgb': '255, 241, 118' }
      },
      zinc: {
        light: { 'primary-rgb': '112, 112, 112' },
        dark: { 'primary-rgb': '144, 144, 144' }
      }
    }

    // Computed property - current color scheme from board
    this._currentColorScheme = 'blue'

    // Initialize theme from localStorage
    this.initializeTheme()
  }

  // === Getter for Current Color Scheme ===
  get currentColorScheme () {
    return this._currentColorScheme
  }

  set currentColorScheme (value) {
    this._currentColorScheme = this.validateColorScheme(value)
  }

  // === Theme Initialization ===

  /**
   * Initialize theme from localStorage and apply it
   */
  initializeTheme () {
    const savedTheme = globalThis.localStorage.getItem('theme')
    if (savedTheme) {
      this.isDarkMode = savedTheme === 'dark'
      document.documentElement.setAttribute('data-theme', savedTheme)
    }

    // Load saved color scheme
    const savedColorScheme = globalThis.localStorage.getItem('colorScheme')
    if (savedColorScheme) {
      this.currentColorScheme = savedColorScheme
    }
  }

  // === Theme Management ===

  /**
   * Toggle between light and dark theme
   */
  toggleTheme () {
    this.isDarkMode = !this.isDarkMode
    document.documentElement.setAttribute('data-theme', this.isDarkMode ? 'dark' : 'light')
    globalThis.localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light')

    // Re-apply color scheme to get correct theme variant
    this.updateColorScheme()

    // Show toast notification
    this.showSuccess(`Switched to ${this.isDarkMode ? 'dark' : 'light'} theme`)
  }

  /**
   * Set theme to specific mode (light or dark)
   * @param {boolean} isDark - true for dark mode, false for light mode
   */
  setTheme (isDark) {
    if (this.isDarkMode !== isDark) {
      this.isDarkMode = isDark
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
      globalThis.localStorage.setItem('theme', isDark ? 'dark' : 'light')

      // Re-apply color scheme to get correct theme variant
      this.updateColorScheme()
    }
  }

  // === Color Scheme Management ===

  /**
   * Validate and normalize color scheme name
   * @param {string} colorScheme - The color scheme to validate
   * @returns {string} - Valid color scheme name
   */
  validateColorScheme (colorScheme) {
    if (!colorScheme) {
      return 'blue'
    }

    // Normalize to lowercase for comparison
    const normalized = colorScheme.toLowerCase()

    // Check if it's a valid scheme
    if (this.colorSchemes[normalized]) {
      return normalized
    }

    // Invalid scheme - log warning and return blue
    console.warn(`Invalid color scheme "${colorScheme}" - falling back to blue`)
    return 'blue'
  }

  /**
   * Update the color scheme and apply it to the DOM
   * @param {boolean} saveToBackend - Whether to save to backend API
   */
  async updateColorScheme (saveToBackend = true) {
    // Update the Pico.css stylesheet link
    const picoThemeLink = document.querySelector(
      'link[href*="pico.min.css"], link[href*="pico."][href*=".min.css"]'
    )

    if (picoThemeLink) {
      const cssFileName = `pico.${this.currentColorScheme.toLowerCase()}.min.css`
      picoThemeLink.href = `https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/${cssFileName}`
    }

    // Update the --primary-rgb variable for custom styles
    const scheme = this.colorSchemes[this.currentColorScheme]
    if (scheme) {
      const currentTheme = this.isDarkMode ? 'dark' : 'light'
      const colors = scheme[currentTheme] || scheme.light

      // Set the primary-rgb variable
      const primaryRgb = colors['primary-rgb']
      if (primaryRgb) {
        document.documentElement.style.setProperty('--primary-rgb', primaryRgb)
      }

      globalThis.localStorage.setItem('colorScheme', this.currentColorScheme)

      // Save to backend only if requested and we have a current board
      if (saveToBackend && this.store.currentBoardName && this.store.currentBoardName !== '') {
        try {
          await this.store.api.updateBoard(this.store.currentBoardName, { color_scheme: this.currentColorScheme })
        } catch (error) {
          console.error('Error saving color scheme:', error)
          this.showError('Failed to save color scheme')
        }
      }
    }
  }

  /**
   * Set color scheme and apply it
   * @param {string} colorScheme - The color scheme to set
   * @param {boolean} saveToBackend - Whether to save to backend API
   */
  async setColorScheme (colorScheme, saveToBackend = true) {
    this.currentColorScheme = colorScheme
    await this.updateColorScheme(saveToBackend)
  }

  // === Color Selector Management ===

  /**
   * Open the color selector
   */
  openColorSelector () {
    this.showColorSelector = true
  }

  /**
   * Close the color selector
   */
  closeColorSelector () {
    this.showColorSelector = false
  }

  /**
   * Toggle the color selector
   */
  toggleColorSelector () {
    this.showColorSelector = !this.showColorSelector
  }

  // === Utility Methods ===

  /**
   * Convert hex color to RGB
   * @param {string} hex - Hex color string
   * @returns {Object|null} - RGB object or null if invalid
   */
  hexToRgb (hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : null
  }

  /**
   * Convert RGB to hex color
   * @param {number} r - Red component (0-255)
   * @param {number} g - Green component (0-255)
   * @param {number} b - Blue component (0-255)
   * @returns {string} - Hex color string
   */
  rgbToHex (r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('')
  }

  /**
   * Get the current theme name
   * @returns {string} - 'dark' or 'light'
   */
  getThemeName () {
    return this.isDarkMode ? 'dark' : 'light'
  }

  /**
   * Get the current primary color RGB value
   * @returns {string|null} - RGB string or null if not available
   */
  getCurrentPrimaryRgb () {
    const scheme = this.colorSchemes[this.currentColorScheme]
    if (scheme) {
      const currentTheme = this.isDarkMode ? 'dark' : 'light'
      const colors = scheme[currentTheme] || scheme.light
      return colors['primary-rgb'] || null
    }
    return null
  }

  /**
   * Get all available color scheme names
   * @returns {string[]} - Array of color scheme names
   */
  getAvailableColorSchemes () {
    return Object.keys(this.colorSchemes).sort()
  }

  /**
   * Get color scheme details for a specific scheme
   * @param {string} schemeName - The color scheme name
   * @returns {Object|null} - Color scheme object or null if not found
   */
  getColorSchemeDetails (schemeName) {
    return this.colorSchemes[schemeName.toLowerCase()] || null
  }

  /**
   * Reset theme to default settings
   */
  resetToDefaults () {
    this.isDarkMode = false
    this.currentColorScheme = 'blue'
    document.documentElement.setAttribute('data-theme', 'light')
    globalThis.localStorage.removeItem('theme')
    globalThis.localStorage.removeItem('colorScheme')
    this.updateColorScheme(false)
  }

  /**
   * Get theme state for debugging
   * @returns {Object} - Current theme state
   */
  getThemeState () {
    return {
      isDarkMode: this.isDarkMode,
      showColorSelector: this.showColorSelector,
      currentColorScheme: this.currentColorScheme,
      availableSchemes: this.getAvailableColorSchemes(),
      currentPrimaryRgb: this.getCurrentPrimaryRgb(),
      themeName: this.getThemeName()
    }
  }
}
