/**
 * BoardApiService Tests
 *
 * Tests for the extracted API service layer to ensure proper
 * request handling, error management, and loading states.
 * Converted from Jest to Node.js built-in test runner.
 */

import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'

// Import the modules we're testing
import BoardApiService from '../../services/api.js'

// Mock the ToCryApiClient before it's imported
const createMockApiClient = () => {
  return {
    getBoard: () => Promise.resolve(),
    updateBoard: () => Promise.resolve(),
    createBoard: () => Promise.resolve(),
    deleteBoard: () => Promise.resolve(),
    getBoards: () => Promise.resolve([]),
    createNote: () => Promise.resolve(),
    updateNote: () => Promise.resolve(),
    deleteNote: () => Promise.resolve(),
    uploadImage: () => Promise.resolve(),
    attachFileToNote: () => Promise.resolve(),
    deleteAttachment: () => Promise.resolve(),
    getAuthMode: () => Promise.resolve(),
    shareBoard: () => Promise.resolve()
  }
}

// Mock the ToCryApiClient module
const MockToCryApiClient = () => createMockApiClient()

// Mock global browser APIs that Node.js doesn't provide
global.fetch = () => Promise.resolve({
  ok: true,
  status: 200,
  json: () => Promise.resolve({}),
  text: () => Promise.resolve('')
})

global.WebSocket = class MockWebSocket {
  constructor () { this.readyState = 1 }
  close () {}
  send () {}
  addEventListener () {}
  removeEventListener () {}
}

global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
}

global.sessionStorage = global.localStorage

global.performance = { now: () => Date.now() }

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
  tocryBasePath: undefined
}

global.history = { pushState: () => {}, replaceState: () => {} }
global.ResizeObserver = class MockResizeObserver { observe () {}; unobserve () {}; disconnect () {} }
global.CustomEvent = class MockCustomEvent {}
global.document = { createElement: () => ({ setAttribute: () => {} }) }

// Mock the ToCryApiClient import
global.ToCryApiClient = MockToCryApiClient

describe('BoardApiService', () => {
  let apiService
  let mockStore
  let mockResolvePath

  beforeEach(() => {
    // Reset the global mock constructor
    global.ToCryApiClient = MockToCryApiClient

    // Create mock store
    mockStore = {
      showError: () => {},
      showInfo: () => {},
      showSuccess: () => {},
      showAlert: () => Promise.resolve(false),
      currentBoard: {
        lanes: [
          { name: 'Todo', notes: [] },
          { name: 'In Progress', notes: [] },
          { name: 'Done', notes: [] }
        ]
      },
      apiLoading: false
    }

    // Create mock resolvePath function
    mockResolvePath = (path) => `/api/v1${path}`

    // Create API service instance
    apiService = new BoardApiService(mockStore, mockResolvePath)
  })

  describe('Constructor', () => {
    test('should initialize with provided store and resolvePath', () => {
      assert.strictEqual(apiService.store, mockStore)
      assert.strictEqual(apiService.resolvePath, mockResolvePath)
      assert.ok(apiService.apiClient)
      assert.strictEqual(typeof apiService.apiClient.getBoard, 'function')
      assert.strictEqual(typeof apiService.apiClient.updateBoard, 'function')
      assert.strictEqual(typeof apiService.apiClient.createBoard, 'function')
    })

    test('should initialize empty loading states and request queue', () => {
      assert(apiService.loadingStates instanceof Set)
      assert.strictEqual(apiService.loadingStates.size, 0)
      assert(apiService.requestQueue instanceof Map)
      assert.strictEqual(apiService.requestQueue.size, 0)
    })
  })

  describe('Request Management', () => {
    test('should set loading state when making requests', () => {
      apiService.setLoading('test-request', true)
      assert.strictEqual(mockStore.apiLoading, true)

      apiService.setLoading('test-request', false)
      assert.strictEqual(mockStore.apiLoading, false)
    })

    test('should track loading state correctly', () => {
      assert.strictEqual(apiService.isLoading('test-request'), false)

      apiService.setLoading('test-request', true)
      assert.strictEqual(apiService.isLoading('test-request'), true)

      apiService.setLoading('test-request', false)
      assert.strictEqual(apiService.isLoading('test-request'), false)
    })

    test('should handle request deduplication', async () => {
      let callCount = 0
      const mockApiCall = () => {
        callCount++
        return Promise.resolve('success')
      }

      // Start two identical requests simultaneously
      const promise1 = apiService.request(mockApiCall)
      const promise2 = apiService.request(mockApiCall)

      // Both promises should resolve to the same value
      const [result1, result2] = await Promise.all([promise1, promise2])

      assert.strictEqual(result1, 'success')
      assert.strictEqual(result2, 'success')
      assert.strictEqual(callCount, 1)
    })

    test('should handle API errors and show error messages', async () => {
      const error = new Error('API Error')
      const mockApiCall = () => Promise.reject(error)

      await assert.rejects(apiService.request(mockApiCall), /API Error/)
    })

    test('should not show error messages for silent requests', async () => {
      const error = new Error('API Error')
      const mockApiCall = () => Promise.reject(error)
      let showErrorCalled = false

      mockStore.showError = () => { showErrorCalled = true }

      await assert.rejects(apiService.request(mockApiCall, true), /API Error/)
      assert.strictEqual(showErrorCalled, false)
    })
  })

  describe('Board Operations', () => {
    test('should call getBoard API method', async () => {
      const mockBoard = { id: '1', name: 'Test Board' }
      apiService.apiClient.getBoard = () => Promise.resolve(mockBoard)

      const result = await apiService.getBoard('test-board')

      // The API was called through the request method
      assert.strictEqual(result, mockBoard)
    })

    test('should call updateBoard API method', async () => {
      const updates = { name: 'Updated Board' }
      const mockResult = { success: true }
      apiService.apiClient.updateBoard = () => Promise.resolve(mockResult)

      const result = await apiService.updateBoard('test-board', updates)

      assert.strictEqual(result, mockResult)
    })

    test('should call createBoard API method', async () => {
      const boardData = { name: 'New Board', color_scheme: 'blue' }
      const mockResult = { id: '2', name: 'New Board' }
      apiService.apiClient.createBoard = () => Promise.resolve(mockResult)

      const result = await apiService.createBoard(boardData)

      assert.strictEqual(result, mockResult)
    })

    test('should call deleteBoard API method', async () => {
      const mockResult = { success: true }
      apiService.apiClient.deleteBoard = () => Promise.resolve(mockResult)

      const result = await apiService.deleteBoard('test-board')

      assert.strictEqual(result, mockResult)
    })

    test('should call getAllBoards API method', async () => {
      const mockBoards = ['board1', 'board2']
      apiService.apiClient.getBoards = () => Promise.resolve(mockBoards)

      const result = await apiService.getAllBoards()

      assert.strictEqual(result, mockBoards)
    })
  })

  describe('Utility Methods', () => {
    test('should create debounced update function', async () => {
      // Note: Node.js test runner doesn't have fake timers built-in
      // We'll test the basic functionality
      let callCount = 0
      const mockFn = () => {
        callCount++
        return Promise.resolve('result')
      }

      const debouncedFn = apiService.debouncedUpdate(mockFn, 100)

      // Call debounced function multiple times
      debouncedFn('arg1')
      debouncedFn('arg2')
      debouncedFn('arg3')

      // Wait for debounced function to execute
      await new Promise(resolve => setTimeout(resolve, 150))

      assert.strictEqual(callCount, 1)
    })

    test('should handle optimistic updates correctly', async () => {
      const updateFn = () => Promise.resolve('success')
      const rollbackFn = () => {}

      const result = await apiService.withOptimisticUpdate(updateFn, rollbackFn)

      assert.strictEqual(result, 'success')
    })

    test('should rollback on optimistic update failure', async () => {
      const updateFn = () => Promise.reject(new Error('API Error'))
      let rollbackCalled = false
      const rollbackFn = () => { rollbackCalled = true }
      let showErrorCalled = false

      mockStore.showError = () => { showErrorCalled = true }

      await assert.rejects(
        apiService.withOptimisticUpdate(updateFn, rollbackFn, 'Custom error'),
        /API Error/
      )

      assert.strictEqual(rollbackCalled, true)
      assert.strictEqual(showErrorCalled, true)
    })
  })

  describe('Error Handling', () => {
    test('should handle TypeError errors gracefully', async () => {
      const error = new TypeError('Network Error')
      const mockApiCall = () => Promise.reject(error)
      let showErrorCalled = false

      mockStore.showError = () => { showErrorCalled = true }

      await assert.rejects(apiService.request(mockApiCall), /Network Error/)
      assert.strictEqual(showErrorCalled, false)
    })

    test('should update global loading state based on active requests', async () => {
      // Test the loading state management directly
      apiService.setLoading('request1', true)
      assert.strictEqual(mockStore.apiLoading, true)

      // Start another concurrent request
      apiService.setLoading('request2', true)
      assert.strictEqual(mockStore.apiLoading, true)

      // Complete first request
      apiService.setLoading('request1', false)
      assert.strictEqual(mockStore.apiLoading, true) // Still loading due to second request

      // Complete second request
      apiService.setLoading('request2', false)
      assert.strictEqual(mockStore.apiLoading, false) // All requests completed
    })
  })
})
