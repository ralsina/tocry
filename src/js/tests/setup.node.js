/**
 * Node.js Test Setup File
 *
 * This file sets up the testing environment for Node.js test runner.
 * It mocks global browser APIs that Node.js doesn't provide.
 */

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
global.document = {
  createElement: () => ({
    setAttribute: () => {},
    addEventListener: () => {},
    querySelector: () => null,
    textContent: '',
    style: {},
    appendChild: () => {},
    removeChild: () => {}
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {}
  }
}

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

console.log('Node.js test environment setup complete')
console.log('Window location mock:', global.window.location)
console.log('Window pathname:', global.window.location?.pathname)
