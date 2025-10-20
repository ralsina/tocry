/**
 * Jest Setup File
 *
 * This file runs before each test file and sets up the testing environment.
 */

// Mock global browser APIs that Jest doesn't provide
global.fetch = jest.fn()

// Mock WebSocket for testing
global.WebSocket = jest.fn(() => ({
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1 // WebSocket.OPEN
}))

// Mock localStorage and sessionStorage
const createStorageMock = () => {
  let store = {}
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString()
    }),
    removeItem: jest.fn((key) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    })
  }
}

global.localStorage = createStorageMock()
global.sessionStorage = createStorageMock()

// Mock performance.now
global.performance = {
  now: jest.fn(() => Date.now())
}

// Mock crypto.getRandomValues
global.crypto = {
  getRandomValues: jest.fn((arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256)
    }
    return arr
  })
}

// Mock window.location
global.window = {
  location: {
    origin: 'http://localhost:3000',
    pathname: '/',
    host: 'localhost:3000',
    protocol: 'http:'
  }
}

// Mock history API
global.history = {
  pushState: jest.fn(),
  replaceState: jest.fn()
}

// Mock ResizeObserver
global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}))

// Mock CustomEvent
global.CustomEvent = jest.fn((type, options = {}) => ({
  type,
  detail: options.detail,
  bubbles: options.bubbles || false,
  cancelable: options.cancelable || false
}))

// Mock dispatchEvent
Object.defineProperty(EventTarget.prototype, 'dispatchEvent', {
  value: jest.fn()
})

// Console silence for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}
