/**
 * BoardApiService Tests
 *
 * Tests for the extracted API service layer to ensure proper
 * request handling, error management, and loading states.
 */

import BoardApiService from '../../services/api.js'

// Mock the imported ToCryApiClient for our tests
import ToCryApiClient from '../../api-client-adapter.js'

// Mock the ToCryApiClient that BoardApiService depends on
jest.mock('../../api-client-adapter.js', () => {
  return jest.fn().mockImplementation(() => ({
    getBoard: jest.fn(),
    updateBoard: jest.fn(),
    createBoard: jest.fn(),
    deleteBoard: jest.fn(),
    getBoards: jest.fn(),
    createNote: jest.fn(),
    updateNote: jest.fn(),
    deleteNote: jest.fn(),
    uploadImage: jest.fn(),
    attachFileToNote: jest.fn(),
    deleteAttachment: jest.fn(),
    getAuthMode: jest.fn(),
    shareBoard: jest.fn()
  }))
})

describe('BoardApiService', () => {
  let apiService
  let mockStore
  let mockResolvePath

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()

    // Create mock store
    mockStore = {
      showError: jest.fn(),
      showInfo: jest.fn(),
      showSuccess: jest.fn(),
      showAlert: jest.fn(),
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
    mockResolvePath = jest.fn((path) => `/api/v1${path}`)

    // Create API service instance
    apiService = new BoardApiService(mockStore, mockResolvePath)
  })

  describe('Constructor', () => {
    it('should initialize with provided store and resolvePath', () => {
      expect(apiService.store).toBe(mockStore)
      expect(apiService.resolvePath).toBe(mockResolvePath)
      expect(apiService.apiClient).toBeInstanceOf(ToCryApiClient)
    })

    it('should initialize empty loading states and request queue', () => {
      expect(apiService.loadingStates).toBeInstanceOf(Set)
      expect(apiService.loadingStates.size).toBe(0)
      expect(apiService.requestQueue).toBeInstanceOf(Map)
      expect(apiService.requestQueue.size).toBe(0)
    })
  })

  describe('Request Management', () => {
    it('should set loading state when making requests', () => {
      apiService.setLoading('test-request', true)
      expect(mockStore.apiLoading).toBe(true)

      apiService.setLoading('test-request', false)
      expect(mockStore.apiLoading).toBe(false)
    })

    it('should track loading state correctly', () => {
      expect(apiService.isLoading('test-request')).toBe(false)

      apiService.setLoading('test-request', true)
      expect(apiService.isLoading('test-request')).toBe(true)

      apiService.setLoading('test-request', false)
      expect(apiService.isLoading('test-request')).toBe(false)
    })

    it('should handle request deduplication', async () => {
      const mockApiCall = jest.fn().mockResolvedValue('success')

      // Start two identical requests simultaneously
      const promise1 = apiService.request(mockApiCall)
      const promise2 = apiService.request(mockApiCall)

      // Both promises should resolve to the same value
      const [result1, result2] = await Promise.all([promise1, promise2])

      expect(result1).toBe('success')
      expect(result2).toBe('success')
      expect(mockApiCall).toHaveBeenCalledTimes(1)
    })

    it('should handle API errors and show error messages', async () => {
      const error = new Error('API Error')
      const mockApiCall = jest.fn().mockRejectedValue(error)

      await expect(apiService.request(mockApiCall)).rejects.toThrow('API Error')
      expect(mockStore.showError).toHaveBeenCalledWith('Request failed: API Error')
    })

    it('should not show error messages for silent requests', async () => {
      const error = new Error('API Error')
      const mockApiCall = jest.fn().mockRejectedValue(error)

      await expect(apiService.request(mockApiCall, true)).rejects.toThrow('API Error')
      expect(mockStore.showError).not.toHaveBeenCalled()
    })
  })

  describe('Board Operations', () => {
    it('should call getBoard API method', async () => {
      const mockBoard = { id: '1', name: 'Test Board' }
      apiService.apiClient.getBoard.mockResolvedValue(mockBoard)

      const result = await apiService.getBoard('test-board')

      expect(apiService.apiClient.getBoard).toHaveBeenCalledWith('test-board')
      expect(result).toBe(mockBoard)
    })

    it('should call updateBoard API method', async () => {
      const updates = { name: 'Updated Board' }
      const mockResult = { success: true }
      apiService.apiClient.updateBoard.mockResolvedValue(mockResult)

      const result = await apiService.updateBoard('test-board', updates)

      expect(apiService.apiClient.updateBoard).toHaveBeenCalledWith('test-board', updates)
      expect(result).toBe(mockResult)
    })

    it('should call createBoard API method', async () => {
      const boardData = { name: 'New Board', color_scheme: 'blue' }
      const mockResult = { id: '2', name: 'New Board' }
      apiService.apiClient.createBoard.mockResolvedValue(mockResult)

      const result = await apiService.createBoard(boardData)

      expect(apiService.apiClient.createBoard).toHaveBeenCalledWith('New Board', 'blue')
      expect(result).toBe(mockResult)
    })

    it('should call deleteBoard API method', async () => {
      const mockResult = { success: true }
      apiService.apiClient.deleteBoard.mockResolvedValue(mockResult)

      const result = await apiService.deleteBoard('test-board')

      expect(apiService.apiClient.deleteBoard).toHaveBeenCalledWith('test-board')
      expect(result).toBe(mockResult)
    })

    it('should call getAllBoards API method', async () => {
      const mockBoards = ['board1', 'board2']
      apiService.apiClient.getBoards.mockResolvedValue(mockBoards)

      const result = await apiService.getAllBoards()

      expect(apiService.apiClient.getBoards).toHaveBeenCalled()
      expect(result).toBe(mockBoards)
    })
  })

  describe('Utility Methods', () => {
    it('should create debounced update function', async () => {
      jest.useFakeTimers()

      const mockFn = jest.fn()
      const debouncedFn = apiService.debouncedUpdate(mockFn, 100)

      // Call debounced function multiple times
      debouncedFn('arg1')
      debouncedFn('arg2')
      debouncedFn('arg3')

      // Function should not be called yet
      expect(mockFn).not.toHaveBeenCalled()

      // Fast-forward time
      jest.advanceTimersByTime(100)

      await Promise.resolve() // Wait for Promise to resolve

      // Function should be called once with last arguments
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('arg3')

      jest.useRealTimers()
    })

    it('should handle optimistic updates correctly', async () => {
      const updateFn = jest.fn()
      const rollbackFn = jest.fn()
      const mockApiCall = jest.fn().mockResolvedValue('success')

      const result = await apiService.withOptimisticUpdate(updateFn, rollbackFn)

      expect(updateFn).toHaveBeenCalled()
      expect(result).toBe('success')
      expect(rollbackFn).not.toHaveBeenCalled()
    })

    it('should rollback on optimistic update failure', async () => {
      const updateFn = jest.fn()
      const rollbackFn = jest.fn()
      const error = new Error('API Error')

      await expect(apiService.withOptimisticUpdate(updateFn, rollbackFn, 'Custom error')).rejects.toThrow('API Error')

      expect(updateFn).toHaveBeenCalled()
      expect(rollbackFn).toHaveBeenCalled()
      expect(mockStore.showError).toHaveBeenCalledWith('Custom error: API Error')
    })
  })

  describe('Error Handling', () => {
    it('should handle TypeError errors gracefully', async () => {
      const error = new TypeError('Network Error')
      const mockApiCall = jest.fn().mockRejectedValue(error)

      await expect(apiService.request(mockApiCall)).rejects.toThrow('Network Error')
      expect(mockStore.showError).not.toHaveBeenCalled()
    })

    it('should update global loading state based on active requests', async () => {
      const mockApiCall1 = jest.fn().mockResolvedValue('success1')
      const mockApiCall2 = jest.fn().mockResolvedValue('success2')

      // Start first request
      const promise1 = apiService.request(mockApiCall1)
      expect(mockStore.apiLoading).toBe(true)

      // Start second request
      const promise2 = apiService.request(mockApiCall2)
      expect(mockStore.apiLoading).toBe(true)

      // Complete first request
      await promise1
      expect(mockStore.apiLoading).toBe(true) // Still loading due to second request

      // Complete second request
      await promise2
      expect(mockStore.apiLoading).toBe(false) // All requests completed
    })
  })
})
