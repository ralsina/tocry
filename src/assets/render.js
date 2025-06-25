/**
 * @module render
 * Makes a DOM element's text content editable in-place.
 * @param {HTMLElement} element The element to make editable (e.g., an h2 or h4).
 * @param {string} originalValue The initial text content of the element.
 * @param {function(string): void} onSaveCallback The callback to execute with the new value when saving.
 */
function makeTitleEditable (element, originalValue, onSaveCallback) {
  element.contentEditable = true
  element.dataset.originalValue = originalValue

  element.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.target.blur()
    } else if (e.key === 'Escape') {
      e.target.textContent = e.target.dataset.originalValue
      e.target.blur()
    }
  })

  element.addEventListener('blur', (e) => {
    const newValue = e.target.textContent.trim()
    const oldValue = e.target.dataset.originalValue
    if (newValue && newValue !== oldValue) {
      onSaveCallback(newValue)
    } else if (!newValue) {
      e.target.textContent = oldValue // Revert if empty
    }
  })
}

/**
 * Creates a single note card element with all its interactive parts.
 * @param {object} note The note data object.
 * @param {string} laneName The name of the parent lane.
 * @param {object} callbacks The collection of event callbacks.
 * @param {object} dragAndDropCallbacks The collection of drag and drop callbacks for notes.
 * @returns {HTMLElement} The fully constructed note card article element.
 */
export function createNoteCardElement (note, laneName, callbacks, dragAndDropCallbacks) {
  const noteCard = document.createElement('article')
  noteCard.className = 'note-card'
  noteCard.draggable = true
  noteCard.dataset.noteId = note.id
  noteCard.dataset.laneName = laneName

  // Centralized event handling on the note card
  noteCard.addEventListener('dragstart', dragAndDropCallbacks.note.dragstart)
  noteCard.addEventListener('dragend', dragAndDropCallbacks.note.dragend)
  noteCard.addEventListener('dblclick', (e) => {
    if (e.target.closest('button')) return
    if (callbacks.onEditNote) callbacks.onEditNote(note)
  })

  const deleteNoteButton = document.createElement('button')
  deleteNoteButton.className = 'delete-note-btn'
  deleteNoteButton.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
  deleteNoteButton.setAttribute('aria-label', `Delete note ${note.title}`)
  deleteNoteButton.addEventListener('click', (e) => {
    e.stopPropagation()
    if (callbacks.onDeleteNote) callbacks.onDeleteNote(note.id, note.title)
  })

  const editNoteButton = document.createElement('button')
  editNoteButton.className = 'edit-note-btn'
  // Using a pencil icon for "edit"
  editNoteButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>'
  editNoteButton.setAttribute('aria-label', `Edit note ${note.title}`)
  editNoteButton.addEventListener('click', (e) => {
    e.stopPropagation()
    // Re-use the same callback as double-click for consistency
    if (callbacks.onEditNote) callbacks.onEditNote(note)
  })

  const noteTitle = document.createElement('h4')
  noteTitle.textContent = note.title
  noteTitle.setAttribute('title', note.title) // Add title attribute for tooltip
  makeTitleEditable(noteTitle, note.title, (newTitle) => {
    if (callbacks.onUpdateNoteTitle) callbacks.onUpdateNoteTitle(note, newTitle)
  })

  let tagsContainer = null
  if (note.tags && note.tags.length > 0) {
    tagsContainer = document.createElement('div')
    tagsContainer.className = 'note-tags'
    note.tags.forEach(tag => {
      const tagSpan = document.createElement('span')
      tagSpan.className = 'tag'
      tagSpan.textContent = tag
      tagsContainer.appendChild(tagSpan)
    })
  }

  const hasContent = note.content && note.content.trim() !== ''

  const collapsibleContainer = document.createElement('div')
  collapsibleContainer.className = 'note-collapsible'
  if (note.expanded && hasContent) {
    collapsibleContainer.classList.add('is-open')
  }

  const summaryDiv = document.createElement('div')
  summaryDiv.className = 'note-summary'

  const toggleButton = document.createElement('button')
  toggleButton.className = 'note-toggle-btn'
  toggleButton.setAttribute('aria-label', 'Toggle note content')
  toggleButton.innerHTML = '<svg class="toggle-arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>'
  toggleButton.addEventListener('click', (e) => {
    e.stopPropagation()
    if (hasContent) {
      collapsibleContainer.classList.toggle('is-open')
      const isExpanded = collapsibleContainer.classList.contains('is-open')
      if (callbacks.onToggleNote) callbacks.onToggleNote(note, isExpanded)
    }
  })

  const noteActions = document.createElement('div')
  noteActions.className = 'note-actions'
  noteActions.appendChild(editNoteButton)
  noteActions.appendChild(deleteNoteButton)

  summaryDiv.appendChild(toggleButton)
  summaryDiv.appendChild(noteTitle)
  if (tagsContainer) summaryDiv.appendChild(tagsContainer)
  summaryDiv.appendChild(noteActions)

  collapsibleContainer.appendChild(summaryDiv)

  if (hasContent) {
    const noteContent = document.createElement('div')
    noteContent.className = 'note-content'
    noteContent.innerHTML = window.marked ? window.marked.parse(note.content) : note.content

    if (window.hljs) {
      noteContent.querySelectorAll('pre code').forEach((block) => {
        window.hljs.highlightElement(block)
      })
    }
    collapsibleContainer.appendChild(noteContent)
  } else {
    collapsibleContainer.classList.add('note-card--no-content')
  }

  noteCard.appendChild(collapsibleContainer)
  return noteCard
}

/**
 * Creates a single lane column element with its header and notes list.
 * @param {object} lane The lane data object.
 * @param {object} callbacks The collection of event callbacks.
 * @param {object} dragAndDropCallbacks The collection of drag and drop callbacks.
 * @returns {HTMLElement} The fully constructed lane column div element.
 */
function createLaneElement (lane, callbacks, dragAndDropCallbacks) {
  const laneColumn = document.createElement('div')
  laneColumn.className = 'lane'
  laneColumn.draggable = true
  laneColumn.dataset.laneName = lane.name
  laneColumn.tabIndex = 0

  laneColumn.addEventListener('dragstart', dragAndDropCallbacks.lane.dragstart)
  laneColumn.addEventListener('dragover', dragAndDropCallbacks.lane.dragover)
  laneColumn.addEventListener('dragleave', dragAndDropCallbacks.lane.dragleave)
  laneColumn.addEventListener('drop', dragAndDropCallbacks.lane.drop)
  laneColumn.addEventListener('dragend', dragAndDropCallbacks.lane.dragend)

  // Delegate paste handling to a dedicated function
  laneColumn.addEventListener('paste', (e) => handleLanePaste(e, lane.name, callbacks))

  const laneHeader = document.createElement('div')
  laneHeader.className = 'lane-header'

  const laneTitle = document.createElement('h2')
  laneTitle.className = 'lane-title'
  laneTitle.textContent = lane.name
  makeTitleEditable(laneTitle, lane.name, (newName) => {
    if (callbacks.onUpdateLaneName) callbacks.onUpdateLaneName(lane, newName)
  })

  const addNoteButton = document.createElement('button')
  addNoteButton.className = 'add-note-btn'
  addNoteButton.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>'
  addNoteButton.setAttribute('aria-label', `Add new note to ${lane.name}`)
  addNoteButton.addEventListener('click', () => {
    if (callbacks.onAddNote) callbacks.onAddNote(lane.name)
  })

  const deleteButton = document.createElement('button')
  deleteButton.className = 'delete-lane-btn'
  deleteButton.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
  deleteButton.setAttribute('aria-label', `Delete lane ${lane.name}`)
  deleteButton.addEventListener('click', () => {
    if (callbacks.onDeleteLane) callbacks.onDeleteLane(lane.name)
  })

  const noteCountPill = document.createElement('span')
  noteCountPill.className = 'lane-note-count'
  noteCountPill.textContent = lane.notes ? lane.notes.length : 0

  const laneActions = document.createElement('div')
  laneActions.className = 'lane-actions'
  laneActions.appendChild(addNoteButton)
  laneActions.appendChild(deleteButton)

  laneHeader.appendChild(laneTitle)
  laneHeader.appendChild(noteCountPill)
  laneHeader.appendChild(laneActions)
  laneColumn.appendChild(laneHeader)

  const notesList = document.createElement('div')
  notesList.className = 'notes-list'
  notesList.dataset.laneName = lane.name
  notesList.addEventListener('dragover', dragAndDropCallbacks.note.dragover)
  notesList.addEventListener('dragleave', dragAndDropCallbacks.note.dragleave)
  notesList.addEventListener('drop', dragAndDropCallbacks.note.drop)

  if (lane.notes && lane.notes.length > 0) {
    lane.notes.forEach(note => {
      const noteCard = createNoteCardElement(note, lane.name, callbacks, dragAndDropCallbacks)
      notesList.appendChild(noteCard)
    })
  } else {
    const noNotesMessage = document.createElement('p') // This will be replaced by onboarding message if applicable
    noNotesMessage.textContent = 'No notes in this lane.'
    notesList.appendChild(noNotesMessage)
  }
  laneColumn.appendChild(notesList)
  return laneColumn
}

/**
 * Handles paste events on a lane, delegating to appropriate note creation functions.
 * @param {ClipboardEvent} event The paste event.
 * @param {string} laneName The name of the lane where content is pasted.
 * @param {object} callbacks Callbacks object containing onPasteAsNote and onPasteAsImageNote.
 */
function handleLanePaste (event, laneName, callbacks) {
  const activeElement = document.activeElement
  // Do not handle paste if user is pasting into an editable field
  if (activeElement.isContentEditable || activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
    return
  }

  const items = (event.clipboardData || window.clipboardData).items
  for (let i = 0; i < items.length; i++) {
    if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
      event.preventDefault() // Prevent default paste behavior
      event.stopPropagation() // Stop event from bubbling up
      if (callbacks.onPasteAsImageNote) callbacks.onPasteAsImageNote(laneName, items[i].getAsFile())
      return
    }
  }

  const pastedText = (event.clipboardData || window.clipboardData).getData('text/plain')
  if (pastedText) {
    event.preventDefault() // Prevent default paste behavior
    event.stopPropagation() // Stop event from bubbling up
    if (callbacks.onPasteAsNote) callbacks.onPasteAsNote(laneName, pastedText)
  }
}

/**
 * Renders all lanes and their notes into the main container.
 * @param {Array<object>} lanes The array of lane data objects.
 * @param {object} callbacks The collection of event callbacks.
 * @param {object} dragAndDropCallbacks The collection of drag and drop callbacks.
 */
export function renderLanes (lanes, callbacks, dragAndDropCallbacks) {
  const lanesContainer = document.getElementById('lanes-container')
  if (!lanesContainer) {
    console.error('Lanes container not found!')
    return
  }
  lanesContainer.innerHTML = '' // Clear existing lanes

  lanes.forEach(lane => {
    const laneElement = createLaneElement(lane, callbacks, dragAndDropCallbacks)
    lanesContainer.appendChild(laneElement)
  })
}
