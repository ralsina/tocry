/**
 * SearchManager Tests
 *
 * Tests for the SearchManager class which handles search functionality for notes.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { SearchManager } from '../../services/SearchManager.js'

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
    setAttribute: () => {},
    removeAttribute: () => {},
    getAttribute: () => null,
    style: {
      setProperty: () => {},
      removeProperty: () => {},
      getPropertyValue: () => ''
    }
  },
  activeElement: null,
  addEventListener: () => {},
  removeEventListener: () => {}
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

describe('SearchManager', () => {
  const createMockStore = () => {
    return {
      currentBoard: {
        lanes: []
      },
      $refs: {
        searchInput: null
      },
      $nextTick: (fn) => setTimeout(fn, 0)
    }
  }

  const createMockNote = (title = 'Test Note', content = 'Test content', tags = []) => {
    return {
      sepiaId: `note-${Date.now()}-${Math.random()}`,
      title,
      content,
      tags: [...tags],
      _hidden: false
    }
  }

  const createMockLane = (name = 'Test Lane', notes = []) => {
    return {
      name,
      notes: [...notes]
    }
  }

  test('should initialize with default values', () => {
    const mockStore = createMockStore()
    const searchManager = new SearchManager(mockStore)

    assert.strictEqual(searchManager.searchQuery, '')
    assert.deepStrictEqual(searchManager.searchResults, [])
  })

  test('should accept store dependency', () => {
    const mockStore = createMockStore()
    const searchManager = new SearchManager(mockStore)

    assert.strictEqual(searchManager.store, mockStore)
  })

  test('should check if search is active', () => {
    const mockStore = createMockStore()
    const searchManager = new SearchManager(mockStore)

    assert.strictEqual(searchManager.isSearchActive(), false)

    searchManager.searchQuery = 'test'
    assert.strictEqual(searchManager.isSearchActive(), true)

    searchManager.searchQuery = '  '
    assert.strictEqual(searchManager.isSearchActive(), false)
  })

  test('should identify tag searches', () => {
    const mockStore = createMockStore()
    const searchManager = new SearchManager(mockStore)

    assert.strictEqual(searchManager.isTagSearch(), false)

    searchManager.searchQuery = '#tag'
    assert.strictEqual(searchManager.isTagSearch(), true)

    searchManager.searchQuery = 'regular'
    assert.strictEqual(searchManager.isTagSearch(), false)
  })

  test('should get clean search query', () => {
    const mockStore = createMockStore()
    const searchManager = new SearchManager(mockStore)

    searchManager.searchQuery = '#tag'
    assert.strictEqual(searchManager.getCleanSearchQuery(), 'tag')

    searchManager.searchQuery = 'regular'
    assert.strictEqual(searchManager.getCleanSearchQuery(), 'regular')
  })

  test('should show all notes when search query is empty', () => {
    const mockStore = createMockStore()
    const searchManager = new SearchManager(mockStore)

    const notes = [
      createMockNote('Title 1', 'Content 1', ['tag1']),
      createMockNote('Title 2', 'Content 2', ['tag2'])
    ]
    mockStore.currentBoard.lanes = [createMockLane('Lane 1', notes)]

    // Hide some notes first
    notes[0]._hidden = true
    notes[1]._hidden = true

    searchManager.performSearch()

    assert.strictEqual(notes[0]._hidden, false)
    assert.strictEqual(notes[1]._hidden, false)
  })

  test('should search in note titles', () => {
    const mockStore = createMockStore()
    const searchManager = new SearchManager(mockStore)

    const notes = [
      createMockNote('Important Task', 'Content here'),
      createMockNote('Another Note', 'Content here')
    ]
    mockStore.currentBoard.lanes = [createMockLane('Lane 1', notes)]

    searchManager.searchQuery = 'important'
    searchManager.performSearch()

    assert.strictEqual(notes[0]._hidden, false)
    assert.strictEqual(notes[1]._hidden, true)
  })

  test('should search in note content', () => {
    const mockStore = createMockStore()
    const searchManager = new SearchManager(mockStore)

    const notes = [
      createMockNote('Title', 'This contains the search term'),
      createMockNote('Title', 'This does not match')
    ]
    mockStore.currentBoard.lanes = [createMockLane('Lane 1', notes)]

    searchManager.searchQuery = 'search term'
    searchManager.performSearch()

    assert.strictEqual(notes[0]._hidden, false)
    assert.strictEqual(notes[1]._hidden, true)
  })

  test('should search in note tags', () => {
    const mockStore = createMockStore()
    const searchManager = new SearchManager(mockStore)

    const notes = [
      createMockNote('Title', 'Content', ['urgent', 'work']),
      createMockNote('Title', 'Content', ['personal'])
    ]
    mockStore.currentBoard.lanes = [createMockLane('Lane 1', notes)]

    searchManager.searchQuery = 'urgent'
    searchManager.performSearch()

    assert.strictEqual(notes[0]._hidden, false)
    assert.strictEqual(notes[1]._hidden, true)
  })

  test('should handle case insensitive search', () => {
    const mockStore = createMockStore()
    const searchManager = new SearchManager(mockStore)

    const notes = [
      createMockNote('IMPORTANT TASK', 'Content'),
      createMockNote('Another Note', 'Content')
    ]
    mockStore.currentBoard.lanes = [createMockLane('Lane 1', notes)]

    searchManager.searchQuery = 'important'
    searchManager.performSearch()

    assert.strictEqual(notes[0]._hidden, false)
    assert.strictEqual(notes[1]._hidden, true)
  })

  test('should perform tag search with # prefix', () => {
    const mockStore = createMockStore()
    const searchManager = new SearchManager(mockStore)

    const notes = [
      createMockNote('Title', 'Content', ['work', 'urgent']),
      createMockNote('Title', 'Content', ['personal'])
    ]
    mockStore.currentBoard.lanes = [createMockLane('Lane 1', notes)]

    searchManager.searchQuery = '#work'
    searchManager.performSearch()

    assert.strictEqual(notes[0]._hidden, false)
    assert.strictEqual(notes[1]._hidden, true)
  })

  test('should match tags starting with search term', () => {
    const mockStore = createMockStore()
    const searchManager = new SearchManager(mockStore)

    const notes = [
      createMockNote('Title', 'Content', ['work-task', 'work']),
      createMockNote('Title', 'Content', ['work'])
    ]
    mockStore.currentBoard.lanes = [createMockLane('Lane 1', notes)]

    searchManager.searchQuery = '#work'
    searchManager.performSearch()

    // Both should match because 'work-task' starts with 'work'
    assert.strictEqual(notes[0]._hidden, false)
    assert.strictEqual(notes[1]._hidden, false)
  })

  test('should searchByTag() method work correctly', () => {
    const mockStore = createMockStore()
    const searchManager = new SearchManager(mockStore)

    const notes = [
      createMockNote('Title', 'Content', ['urgent']),
      createMockNote('Title', 'Content', ['normal'])
    ]
    mockStore.currentBoard.lanes = [createMockLane('Lane 1', notes)]

    searchManager.searchByTag('urgent')

    assert.strictEqual(searchManager.searchQuery, '#urgent')
    assert.strictEqual(notes[0]._hidden, false)
    assert.strictEqual(notes[1]._hidden, true)
  })

  test('should handle empty board gracefully', () => {
    const mockStore = createMockStore()
    const searchManager = new SearchManager(mockStore)

    mockStore.currentBoard.lanes = []

    searchManager.searchQuery = 'test'
    searchManager.performSearch()

    // Should not throw error
    assert.strictEqual(searchManager.searchQuery, 'test')
  })

  test('should handle board with no lanes gracefully', () => {
    const mockStore = createMockStore()
    const searchManager = new SearchManager(mockStore)

    mockStore.currentBoard = null

    searchManager.searchQuery = 'test'
    searchManager.performSearch()

    // Should not throw error
    assert.strictEqual(searchManager.searchQuery, 'test')
  })

  test('should handle null notes gracefully', () => {
    const mockStore = createMockStore()
    const searchManager = new SearchManager(mockStore)

    mockStore.currentBoard.lanes = [
      createMockLane('Lane 1', [null, createMockNote('Valid Note', 'Content')])
    ]

    searchManager.searchQuery = 'valid'
    searchManager.performSearch()

    // Should not throw error
    assert.strictEqual(mockStore.currentBoard.lanes[0].notes[0], null)
  })

  test('should provide search statistics', () => {
    const mockStore = createMockStore()
    const searchManager = new SearchManager(mockStore)

    const notes = [
      createMockNote('Visible Note', 'Content'),
      createMockNote('Hidden Note', 'Content')
    ]
    mockStore.currentBoard.lanes = [createMockLane('Lane 1', notes)]

    searchManager.searchQuery = 'visible'
    searchManager.performSearch()

    const stats = searchManager.getSearchStats()
    assert.strictEqual(stats.total, 2)
    assert.strictEqual(stats.visible, 1)
    assert.strictEqual(stats.hidden, 1)
  })

  test('should provide search suggestions', () => {
    const mockStore = createMockStore()
    const searchManager = new SearchManager(mockStore)

    const notes = [
      createMockNote('Important Task', 'Content', ['urgent', 'work']),
      createMockNote('Shopping List', 'Content', ['personal', 'shopping'])
    ]
    mockStore.currentBoard.lanes = [createMockLane('Lane 1', notes)]

    const suggestions = searchManager.getSearchSuggestions()

    assert.deepStrictEqual(suggestions.tags.sort(), ['urgent', 'work', 'personal', 'shopping'].sort())
    assert.deepStrictEqual(suggestions.titles.sort(), ['Important Task', 'Shopping List'].sort())
  })

  test('should clear search and show all notes', () => {
    const mockStore = createMockStore()
    const searchManager = new SearchManager(mockStore)

    const notes = [
      createMockNote('Note 1', 'Content'),
      createMockNote('Note 2', 'Content')
    ]
    mockStore.currentBoard.lanes = [createMockLane('Lane 1', notes)]

    // Hide notes with search
    searchManager.searchQuery = 'nonexistent'
    searchManager.performSearch()
    assert.strictEqual(notes[0]._hidden, true)
    assert.strictEqual(notes[1]._hidden, true)

    // Clear search
    searchManager.clearSearch()
    assert.strictEqual(searchManager.searchQuery, '')
    assert.strictEqual(notes[0]._hidden, false)
    assert.strictEqual(notes[1]._hidden, false)
  })

  test('should search across multiple lanes', () => {
    const mockStore = createMockStore()
    const searchManager = new SearchManager(mockStore)

    const notes1 = [createMockNote('Target Note', 'Content')]
    const notes2 = [createMockNote('Another Note', 'Content')]
    mockStore.currentBoard.lanes = [
      createMockLane('Lane 1', notes1),
      createMockLane('Lane 2', notes2)
    ]

    searchManager.searchQuery = 'target'
    searchManager.performSearch()

    assert.strictEqual(notes1[0]._hidden, false)
    assert.strictEqual(notes2[0]._hidden, true)
  })
})
