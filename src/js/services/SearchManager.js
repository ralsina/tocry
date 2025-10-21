/**
 * SearchManager
 *
 * Handles search functionality for notes within boards.
 * Provides text search and tag-based filtering capabilities.
 */
export class SearchManager {
  /**
   * Initialize SearchManager
   * @param {Object} store - The main store instance
   */
  constructor (store) {
    this.store = store

    // Search state
    this.searchQuery = ''
    this.searchResults = []

    // Initialize keyboard shortcut for search
    this.initializeKeyboardShortcut()
  }

  /**
   * Initialize keyboard shortcut for search
   */
  initializeKeyboardShortcut () {
    document.addEventListener('keydown', (e) => {
      // "/" key to focus search (when not typing in an input, textarea, or contenteditable)
      const activeElement = document.activeElement
      const isEditable = activeElement?.tagName === 'INPUT' ||
                        activeElement?.tagName === 'TEXTAREA' ||
                        activeElement?.contentEditable === 'true' ||
                        activeElement?.closest('.ToastUI__editor') ||
                        activeElement?.closest('[contenteditable="true"]')

      if (e.key === '/' && !isEditable) {
        e.preventDefault()
        // Use $nextTick if available (Alpine.js), otherwise use setTimeout
        if (this.store.$nextTick) {
          this.store.$nextTick(() => {
            this.store.$refs.searchInput?.focus()
          })
        } else {
          setTimeout(() => {
            this.store.$refs.searchInput?.focus()
          }, 0)
        }
      }
    })
  }

  /**
   * Perform search on current board's notes
   */
  performSearch () {
    const query = this.searchQuery.toLowerCase().trim()

    // If no search query, show all notes
    if (!query) {
      this.resetSearch()
      return
    }

    // Check if this is a tag search (starts with #)
    const isTagSearch = query.startsWith('#')
    const searchTag = isTagSearch ? query.substring(1) : query

    // Hide/show notes based on search
    if (this.store.currentBoard && this.store.currentBoard.lanes) {
      this.store.currentBoard.lanes.forEach(lane => {
        if (lane.notes && Array.isArray(lane.notes)) {
          lane.notes.forEach(note => {
            if (note) {
              let matches = false

              if (isTagSearch) {
                // Tag search: match notes with tags that start with the search term
                matches = note.tags && Array.isArray(note.tags) &&
                  note.tags.some(tag => tag && tag.toLowerCase().startsWith(searchTag))
              } else {
                // Regular search: match title, content, or tags containing the query
                matches =
                  (note.title && note.title.toLowerCase().includes(query)) ||
                  (note.content && note.content.toLowerCase().includes(query)) ||
                  (note.tags && Array.isArray(note.tags) && note.tags.some(tag => tag && tag.toLowerCase().includes(query)))
              }

              note._hidden = !matches
            }
          })
        }
      })
    }

    // Force reactivity
    this.store.currentBoard = { ...this.store.currentBoard }
  }

  /**
   * Search by tag (sets search query to #tag)
   * @param {string} tag - The tag to search for
   */
  searchByTag (tag) {
    this.searchQuery = `#${tag}`
    this.performSearch()
    // Focus the search input so user can see the search query
    if (this.store.$nextTick) {
      this.store.$nextTick(() => {
        if (this.store.$refs.searchInput) {
          this.store.$refs.searchInput.focus()
        }
      })
    } else {
      setTimeout(() => {
        if (this.store.$refs.searchInput) {
          this.store.$refs.searchInput.focus()
        }
      }, 0)
    }
  }

  /**
   * Clear search and show all notes
   */
  clearSearch () {
    this.searchQuery = ''
    this.resetSearch()
  }

  /**
   * Reset all notes to visible state
   * @private
   */
  resetSearch () {
    if (this.store.currentBoard && this.store.currentBoard.lanes) {
      this.store.currentBoard.lanes.forEach(lane => {
        if (lane.notes && Array.isArray(lane.notes)) {
          lane.notes.forEach(note => {
            if (note) note._hidden = false
          })
        }
      })
    }
  }

  /**
   * Get current search statistics
   * @returns {Object} Search statistics
   */
  getSearchStats () {
    if (!this.store.currentBoard || !this.store.currentBoard.lanes) {
      return { total: 0, visible: 0, hidden: 0 }
    }

    let total = 0
    let visible = 0
    let hidden = 0

    this.store.currentBoard.lanes.forEach(lane => {
      if (lane.notes && Array.isArray(lane.notes)) {
        lane.notes.forEach(note => {
          if (note) {
            total++
            if (note._hidden) {
              hidden++
            } else {
              visible++
            }
          }
        })
      }
    })

    return { total, visible, hidden }
  }

  /**
   * Get search suggestions based on current board content
   * @returns {Array} Array of search suggestions
   */
  getSearchSuggestions () {
    if (!this.store.currentBoard || !this.store.currentBoard.lanes) {
      return []
    }

    const tags = new Set()
    const titles = new Set()

    this.store.currentBoard.lanes.forEach(lane => {
      if (lane.notes && Array.isArray(lane.notes)) {
        lane.notes.forEach(note => {
          if (note) {
            // Collect unique tags
            if (note.tags && Array.isArray(note.tags)) {
              note.tags.forEach(tag => {
                if (tag && tag.trim()) {
                  tags.add(tag.trim())
                }
              })
            }

            // Collect unique titles (first few words)
            if (note.title && note.title.trim()) {
              const words = note.title.trim().split(/\s+/).slice(0, 3)
              const shortTitle = words.join(' ')
              if (shortTitle.length > 2) {
                titles.add(shortTitle)
              }
            }
          }
        })
      }
    })

    return {
      tags: Array.from(tags).sort(),
      titles: Array.from(titles).sort()
    }
  }

  /**
   * Check if search is currently active
   * @returns {boolean} True if search has a query
   */
  isSearchActive () {
    return this.searchQuery.trim().length > 0
  }

  /**
   * Get search query without the # prefix for clean display
   * @returns {string} Clean search query
   */
  getCleanSearchQuery () {
    const query = this.searchQuery.trim()
    return query.startsWith('#') ? query.substring(1) : query
  }

  /**
   * Check if current search is a tag search
   * @returns {boolean} True if search is a tag search
   */
  isTagSearch () {
    return this.searchQuery.trim().startsWith('#')
  }
}
