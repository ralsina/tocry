/**
 * ThemeManager Tests
 *
 * Tests for the ThemeManager class which handles theme and color scheme functionality.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { ThemeManager } from '../../services/ThemeManager.js'

// Mock global browser APIs that Node.js doesn't provide
global.fetch = () => Promise.resolve({
  ok: true,
  status: 200,
  json: () => Promise.resolve({}),
  text: () => Promise.resolve('')
})

// Mock WebSocket for testing
global.WebSocket = class MockWebSocket {
  constructor () {
    this.readyState = 1 // WebSocket.OPEN
  }

  close () {}
  send () {}
  addEventListener () {}
  removeEventListener () {}
}

// Mock localStorage and sessionStorage
const createStorageMock = () => {
  let store = {}
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString()
    },
    removeItem: (key) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
}

global.localStorage = createStorageMock()
global.sessionStorage = createStorageMock()

// Mock performance.now
global.performance = {
  now: () => Date.now()
}

// Mock crypto.getRandomValues - use Object.defineProperty to handle read-only property
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    }
  },
  writable: true,
  configurable: true
})

// Mock window.location with more complete properties
global.window = {
  location: {
    origin: 'http://localhost:3000',
    pathname: '/',
    host: 'localhost:3000',
    protocol: 'http:',
    href: 'http://localhost:3000/',
    search: '',
    hash: ''
  },
  tocryBasePath: undefined // Explicitly define this property
}

// Mock history API
global.history = {
  pushState: () => {},
  replaceState: () => {}
}

// Mock ResizeObserver
global.ResizeObserver = class MockResizeObserver {
  observe () {}
  unobserve () {}
  disconnect () {}
}

// Mock CustomEvent
global.CustomEvent = class MockCustomEvent {
  constructor (type, options = {}) {
    this.type = type
    this.detail = options.detail
    this.bubbles = options.bubbles || false
    this.cancelable = options.cancelable || false
  }
}

// Mock document basics
const documentMock = {
  createElement: () => ({
    setAttribute: () => {},
    addEventListener: () => {},
    querySelector: () => null,
    textContent: '',
    style: {},
    appendChild: () => {},
    removeChild: () => {}
  }),
  querySelector: () => null,
  body: {
    appendChild: () => {},
    removeChild: () => {}
  },
  documentElement: {
    attributes: {},
    style: {
      properties: {},
      setProperty: (prop, value) => {
        documentMock.documentElement.style.properties[prop] = value
      },
      removeProperty: (prop) => {
        delete documentMock.documentElement.style.properties[prop]
      },
      getPropertyValue: (prop) => {
        return documentMock.documentElement.style.properties[prop] || ''
      }
    },
    setAttribute: (attr, value) => {
      documentMock.documentElement.attributes[attr] = value
    },
    removeAttribute: (attr) => {
      delete documentMock.documentElement.attributes[attr]
    },
    getAttribute: (attr) => {
      return documentMock.documentElement.attributes[attr] || null
    }
  }
}

global.document = documentMock

// Mock console for cleaner test output (optional)
global.console = {
  ...console,
  log: () => {},
  warn: () => {},
  error: () => {}
}

// Mock alert/confirm for browser APIs
global.alert = () => {}
global.confirm = () => true

// Mock URL class if needed
global.URL = class MockURL {
  constructor (url) {
    this.href = url
    this.origin = 'http://localhost:3000'
    this.pathname = '/'
  }
}

describe('ThemeManager', () => {
  const clearDocumentMock = () => {
    documentMock.documentElement.attributes = {}
    documentMock.documentElement.style.properties = {}
  }

  test('should initialize with default values', () => {
    const mockStore = {
      currentBoardName: '',
      api: {
        updateBoard: () => Promise.resolve()
      }
    }
    const mockShowSuccess = () => {}
    const mockShowError = () => {}

    const themeManager = new ThemeManager(mockStore, mockShowSuccess, mockShowError)

    // Check initial state
    assert.strictEqual(themeManager.isDarkMode, false)
    assert.strictEqual(themeManager.showColorSelector, false)
    assert.strictEqual(themeManager.currentColorScheme, 'blue')
  })

  test('should load theme from localStorage', () => {
    clearDocumentMock()
    global.localStorage.setItem('theme', 'dark')

    const mockStore = {
      currentBoardName: '',
      api: {
        updateBoard: () => Promise.resolve()
      }
    }
    const mockShowSuccess = () => {}
    const mockShowError = () => {}

    const newThemeManager = new ThemeManager(mockStore, mockShowSuccess, mockShowError)

    assert.strictEqual(newThemeManager.isDarkMode, true)
    assert.strictEqual(document.documentElement.getAttribute('data-theme'), 'dark')

    global.localStorage.clear()
  })

  test('should load color scheme from localStorage', () => {
    global.localStorage.setItem('colorScheme', 'green')

    const mockStore = {
      currentBoardName: '',
      api: {
        updateBoard: () => Promise.resolve()
      }
    }
    const mockShowSuccess = () => {}
    const mockShowError = () => {}

    const newThemeManager = new ThemeManager(mockStore, mockShowSuccess, mockShowError)

    assert.strictEqual(newThemeManager.currentColorScheme, 'green')

    global.localStorage.clear()
  })

  test('should handle invalid color scheme in localStorage', () => {
    global.localStorage.setItem('colorScheme', 'invalid-scheme')

    const mockStore = {
      currentBoardName: '',
      api: {
        updateBoard: () => Promise.resolve()
      }
    }
    const mockShowSuccess = () => {}
    const mockShowError = () => {}

    const newThemeManager = new ThemeManager(mockStore, mockShowSuccess, mockShowError)

    assert.strictEqual(newThemeManager.currentColorScheme, 'blue') // Should fall back to default

    global.localStorage.clear()
  })

  test('should toggle theme correctly', () => {
    const mockStore = {
      currentBoardName: '',
      api: {
        updateBoard: () => Promise.resolve()
      }
    }
    let successCallCount = 0
    const mockShowSuccess = (message) => {
      successCallCount++
      if (successCallCount === 1) {
        assert.strictEqual(message, 'Switched to dark theme')
      }
    }
    const mockShowError = () => {}

    const themeManager = new ThemeManager(mockStore, mockShowSuccess, mockShowError)

    // Start with light theme
    assert.strictEqual(themeManager.isDarkMode, false)

    // Toggle to dark
    themeManager.toggleTheme()
    assert.strictEqual(themeManager.isDarkMode, true)
    assert.strictEqual(document.documentElement.getAttribute('data-theme'), 'dark')
    assert.strictEqual(global.localStorage.getItem('theme'), 'dark')

    // Toggle back to light
    themeManager.toggleTheme()
    assert.strictEqual(themeManager.isDarkMode, false)
    assert.strictEqual(document.documentElement.getAttribute('data-theme'), 'light')
    assert.strictEqual(global.localStorage.getItem('theme'), 'light')
  })

  test('should set theme to specific mode', () => {
    const mockStore = {
      currentBoardName: '',
      api: {
        updateBoard: () => Promise.resolve()
      }
    }
    const mockShowSuccess = () => {}
    const mockShowError = () => {}

    const themeManager = new ThemeManager(mockStore, mockShowSuccess, mockShowError)

    // Set to dark mode
    themeManager.setTheme(true)
    assert.strictEqual(themeManager.isDarkMode, true)
    assert.strictEqual(document.documentElement.getAttribute('data-theme'), 'dark')

    // Set to light mode
    themeManager.setTheme(false)
    assert.strictEqual(themeManager.isDarkMode, false)
    assert.strictEqual(document.documentElement.getAttribute('data-theme'), 'light')

    // Try to set to same mode (should not change)
    themeManager.setTheme(false)
    assert.strictEqual(themeManager.isDarkMode, false)
  })

  test('should validate color schemes correctly', () => {
    const mockStore = {
      currentBoardName: '',
      api: {
        updateBoard: () => Promise.resolve()
      }
    }
    const mockShowSuccess = () => {}
    const mockShowError = () => {}

    const themeManager = new ThemeManager(mockStore, mockShowSuccess, mockShowError)

    assert.strictEqual(themeManager.validateColorScheme('blue'), 'blue')
    assert.strictEqual(themeManager.validateColorScheme('BLUE'), 'blue') // Should normalize
    assert.strictEqual(themeManager.validateColorScheme('invalid'), 'blue') // Should fall back
    assert.strictEqual(themeManager.validateColorScheme(''), 'blue') // Empty should fall back
    assert.strictEqual(themeManager.validateColorScheme(null), 'blue') // Null should fall back
    assert.strictEqual(themeManager.validateColorScheme(undefined), 'blue') // Undefined should fall back
  })

  test('should set and update color scheme', async () => {
    const mockStore = {
      currentBoardName: '',
      api: {
        updateBoard: () => Promise.resolve()
      }
    }
    const mockShowSuccess = () => {}
    const mockShowError = () => {}

    const themeManager = new ThemeManager(mockStore, mockShowSuccess, mockShowError)

    await themeManager.setColorScheme('red')

    assert.strictEqual(themeManager.currentColorScheme, 'red')
    assert.strictEqual(document.documentElement.style.getPropertyValue('--primary-rgb'), '211, 47, 47')
    assert.strictEqual(global.localStorage.getItem('colorScheme'), 'red')
  })

  test('should open and close color selector', () => {
    const mockStore = {
      currentBoardName: '',
      api: {
        updateBoard: () => Promise.resolve()
      }
    }
    const mockShowSuccess = () => {}
    const mockShowError = () => {}

    const themeManager = new ThemeManager(mockStore, mockShowSuccess, mockShowError)

    // Start closed
    assert.strictEqual(themeManager.showColorSelector, false)

    // Open
    themeManager.openColorSelector()
    assert.strictEqual(themeManager.showColorSelector, true)

    // Close
    themeManager.closeColorSelector()
    assert.strictEqual(themeManager.showColorSelector, false)
  })

  test('should toggle color selector', () => {
    const mockStore = {
      currentBoardName: '',
      api: {
        updateBoard: () => Promise.resolve()
      }
    }
    const mockShowSuccess = () => {}
    const mockShowError = () => {}

    const themeManager = new ThemeManager(mockStore, mockShowSuccess, mockShowError)

    // Start closed
    assert.strictEqual(themeManager.showColorSelector, false)

    // Toggle open
    themeManager.toggleColorSelector()
    assert.strictEqual(themeManager.showColorSelector, true)

    // Toggle closed
    themeManager.toggleColorSelector()
    assert.strictEqual(themeManager.showColorSelector, false)
  })

  test('should convert hex to RGB correctly', () => {
    const mockStore = {
      currentBoardName: '',
      api: {
        updateBoard: () => Promise.resolve()
      }
    }
    const mockShowSuccess = () => {}
    const mockShowError = () => {}

    const themeManager = new ThemeManager(mockStore, mockShowSuccess, mockShowError)

    assert.deepStrictEqual(themeManager.hexToRgb('#ff0000'), { r: 255, g: 0, b: 0 })
    assert.deepStrictEqual(themeManager.hexToRgb('#00ff00'), { r: 0, g: 255, b: 0 })
    assert.deepStrictEqual(themeManager.hexToRgb('#0000ff'), { r: 0, g: 0, b: 255 })
    assert.deepStrictEqual(themeManager.hexToRgb('#ffffff'), { r: 255, g: 255, b: 255 })
    assert.deepStrictEqual(themeManager.hexToRgb('#000000'), { r: 0, g: 0, b: 0 })

    // Test without # prefix
    assert.deepStrictEqual(themeManager.hexToRgb('ff0000'), { r: 255, g: 0, b: 0 })

    // Test invalid hex
    assert.strictEqual(themeManager.hexToRgb('invalid'), null)
    assert.strictEqual(themeManager.hexToRgb('#gggggg'), null)
  })

  test('should convert RGB to hex correctly', () => {
    const mockStore = {
      currentBoardName: '',
      api: {
        updateBoard: () => Promise.resolve()
      }
    }
    const mockShowSuccess = () => {}
    const mockShowError = () => {}

    const themeManager = new ThemeManager(mockStore, mockShowSuccess, mockShowError)

    assert.strictEqual(themeManager.rgbToHex(255, 0, 0), '#ff0000')
    assert.strictEqual(themeManager.rgbToHex(0, 255, 0), '#00ff00')
    assert.strictEqual(themeManager.rgbToHex(0, 0, 255), '#0000ff')
    assert.strictEqual(themeManager.rgbToHex(255, 255, 255), '#ffffff')
    assert.strictEqual(themeManager.rgbToHex(0, 0, 0), '#000000')

    // Test single digit hex values
    assert.strictEqual(themeManager.rgbToHex(1, 2, 3), '#010203')
  })

  test('should get current theme name', () => {
    const mockStore = {
      currentBoardName: '',
      api: {
        updateBoard: () => Promise.resolve()
      }
    }
    const mockShowSuccess = () => {}
    const mockShowError = () => {}

    const themeManager = new ThemeManager(mockStore, mockShowSuccess, mockShowError)

    themeManager.setTheme(false)
    assert.strictEqual(themeManager.getThemeName(), 'light')

    themeManager.setTheme(true)
    assert.strictEqual(themeManager.getThemeName(), 'dark')
  })

  test('should get available color schemes', () => {
    const mockStore = {
      currentBoardName: '',
      api: {
        updateBoard: () => Promise.resolve()
      }
    }
    const mockShowSuccess = () => {}
    const mockShowError = () => {}

    const themeManager = new ThemeManager(mockStore, mockShowSuccess, mockShowError)

    const schemes = themeManager.getAvailableColorSchemes()

    assert.ok(Array.isArray(schemes))
    assert.ok(schemes.length > 0)
    assert.ok(schemes.includes('blue'))
    assert.ok(schemes.includes('red'))
    assert.ok(schemes.includes('green'))
  })

  test('should reset to defaults', () => {
    clearDocumentMock()
    const mockStore = {
      currentBoardName: '',
      api: {
        updateBoard: () => Promise.resolve()
      }
    }
    const mockShowSuccess = () => {}
    const mockShowError = () => {}

    const themeManager = new ThemeManager(mockStore, mockShowSuccess, mockShowError)

    // Change some values
    themeManager.setTheme(true)
    themeManager.setColorScheme('red')

    // Reset
    themeManager.resetToDefaults()

    assert.strictEqual(themeManager.isDarkMode, false)
    assert.strictEqual(themeManager.currentColorScheme, 'blue')
    assert.strictEqual(document.documentElement.getAttribute('data-theme'), 'light') // setTheme(false) sets 'light'
    assert.strictEqual(document.documentElement.style.getPropertyValue('--primary-rgb'), '0, 123, 255') // blue color scheme
    assert.strictEqual(global.localStorage.getItem('theme'), null)
    assert.strictEqual(global.localStorage.getItem('colorScheme'), 'blue') // updateColorScheme always saves to localStorage
  })

  test('should get theme state for debugging', () => {
    const mockStore = {
      currentBoardName: '',
      api: {
        updateBoard: () => Promise.resolve()
      }
    }
    const mockShowSuccess = () => {}
    const mockShowError = () => {}

    const themeManager = new ThemeManager(mockStore, mockShowSuccess, mockShowError)

    themeManager.setTheme(true)
    themeManager.setColorScheme('green')

    const state = themeManager.getThemeState()

    assert.ok(typeof state === 'object')
    assert.strictEqual(state.isDarkMode, true)
    assert.strictEqual(state.currentColorScheme, 'green')
    assert.strictEqual(state.themeName, 'dark')
    assert.ok(state.currentPrimaryRgb)
    assert.ok(Array.isArray(state.availableSchemes))
    assert.ok(state.availableSchemes.length > 0)
  })
})
