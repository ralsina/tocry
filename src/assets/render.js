import { getOriginalFileName } from './utils/constants.js'

// Helper function to create buttons with consistent setup
function createButton (className, innerHTML, ariaLabel, clickHandler) {
  const button = document.createElement('button')
  button.className = className
  button.innerHTML = innerHTML
  button.setAttribute('aria-label', ariaLabel)
  if (clickHandler) {
    button.addEventListener('click', clickHandler)
  }
  return button
}

// Helper function to create DOM elements with class and optional content
function createElement (tag, className = '', textContent = '', attributes = {}) {
  const element = document.createElement(tag)
  if (className) element.className = className
  if (textContent) element.textContent = textContent

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value)
  })

  return element
}

// Helper function to create link elements with download attributes
function createDownloadLink (href, textContent, filename) {
  const link = document.createElement('a')
  link.href = href
  link.textContent = textContent
  link.download = filename
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  return link
}

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

  const deleteNoteButton = createButton(
    'delete-note-btn',
    '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    `Delete note ${note.title}`,
    (e) => {
      e.stopPropagation()
      if (callbacks.onDeleteNote) callbacks.onDeleteNote(note.id, note.title)
    }
  )

  const editNoteButton = createButton(
    'edit-note-btn',
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
    `Edit note ${note.title}`,
    (e) => {
      e.stopPropagation()
      if (callbacks.onEditNote) callbacks.onEditNote(note)
    }
  )

  const noteTitle = createElement('h4', '', note.title, { title: note.title })
  makeTitleEditable(noteTitle, note.title, (newTitle) => {
    if (callbacks.onUpdateNoteTitle) callbacks.onUpdateNoteTitle(note, newTitle)
  })

  let tagsContainer = null
  if (note.tags && note.tags.length > 0) {
    tagsContainer = createElement('div', 'note-tags')
    note.tags.forEach(tag => {
      const tagSpan = createElement('span', 'tag', tag)
      tagsContainer.appendChild(tagSpan)
    })
  }

  // Create date info container if dates exist
  let datesContainer = null
  if (note.start_date || note.end_date) {
    datesContainer = createElement('div', 'note-dates')

    if (note.start_date && note.end_date) {
      // Show both dates with an arrow between them
      const dateRangeSpan = createElement('span', 'note-date-range', `📅 ${note.start_date} → ${note.end_date}`)
      datesContainer.appendChild(dateRangeSpan)
    } else if (note.start_date) {
      // Show only start date
      const startDateSpan = createElement('span', 'note-date', `📅 ${note.start_date}`)
      datesContainer.appendChild(startDateSpan)
    } else if (note.end_date) {
      // Show only end date
      const endDateSpan = createElement('span', 'note-date', `📅 ${note.end_date}`)
      datesContainer.appendChild(endDateSpan)
    }
  }

  const hasContent = note.content && note.content.trim() !== ''

  const collapsibleContainer = createElement('div', 'note-collapsible')
  if (note.expanded && hasContent) {
    collapsibleContainer.classList.add('is-open')
  }

  const summaryDiv = createElement('div', 'note-summary')

  const toggleButton = createButton(
    'note-toggle-btn',
    '<svg class="toggle-arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>',
    'Toggle note content',
    (e) => {
      e.stopPropagation()
      if (hasContent) {
        collapsibleContainer.classList.toggle('is-open')
        const isExpanded = collapsibleContainer.classList.contains('is-open')
        if (callbacks.onToggleNote) callbacks.onToggleNote(note, isExpanded)
      }
    }
  )

  const permalinkButton = createButton(
    'permalink-btn edit-note-btn',
    '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm200 160v-80h160q50 0 85-35t35-85q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280H520Z"/></svg>',
    `Permalink for note ${note.title}`,
    (e) => {
      e.stopPropagation()
      if (callbacks.onPermalink) callbacks.onPermalink(note)
    }
  )

  const attachFileButton = createButton(
    'attach-file-btn edit-note-btn',
    '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M720-330q0 104-73 177T470-80q-104 0-177-73t-73-177v-370q0-75 52.5-127.5T400-880q75 0 127.5 52.5T580-700v350q0 46-32 78t-78 32q-46 0-78-32t-32-78v-370h80v370q0 13 8.5 21.5T470-320q13 0 21.5-8.5T500-350v-350q-1-42-29.5-71T400-800q-42 0-71 29t-29 71v370q-1 71 49 120.5T470-160q70 0 119-49.5T640-330v-390h80v390Z"/></svg>',
    `Attach file to note ${note.title}`,
    (e) => {
      e.stopPropagation()
      if (callbacks.onAttachFile) callbacks.onAttachFile(note)
    }
  )

  const noteActions = createElement('div', 'note-actions')
  if (note.public) {
    noteActions.appendChild(permalinkButton)
  }
  noteActions.appendChild(attachFileButton)
  noteActions.appendChild(editNoteButton)
  noteActions.appendChild(deleteNoteButton)

  // Create a row container for the main header elements
  const headerRow = createElement('div', 'note-header-row')
  headerRow.appendChild(toggleButton)

  // Create a container for title and metadata
  const titleAndMetaContainer = createElement('div', 'note-title-and-meta')
  titleAndMetaContainer.appendChild(noteTitle)
  if (tagsContainer) titleAndMetaContainer.appendChild(tagsContainer)

  headerRow.appendChild(titleAndMetaContainer)
  headerRow.appendChild(noteActions)

  summaryDiv.appendChild(headerRow)

  // Add priority bookmark - only show if priority is set
  if (note.priority) {
    let priorityClass = ''

    switch (note.priority) {
      case 'high':
        priorityClass = 'priority-high-tab'
        break
      case 'medium':
        priorityClass = 'priority-medium-tab'
        break
      case 'low':
        priorityClass = 'priority-low-tab'
        break
    }

    const priorityTab = createElement('div', `priority-tab ${priorityClass}`, '')
    priorityTab.title = `${note.priority.charAt(0).toUpperCase() + note.priority.slice(1)} Priority`
    noteCard.appendChild(priorityTab)
  }

  // Add dates inside the summary but as a separate element
  if (datesContainer) {
    summaryDiv.appendChild(datesContainer)
  }

  collapsibleContainer.appendChild(summaryDiv)

  // Create noteContent container - always create it if there's content OR attachments
  const hasAttachments = note.attachments && note.attachments.length > 0

  if (hasContent || hasAttachments) {
    const noteContent = createElement('div', 'note-content')

    // Add parsed content if it exists
    if (hasContent) {
      noteContent.innerHTML = window.marked ? window.marked.parse(note.content) : note.content

      if (window.hljs) {
        noteContent.querySelectorAll('pre code').forEach((block) => {
          window.hljs.highlightElement(block)
        })
      }
    }

    // Add attachments section if they exist
    if (hasAttachments) {
      const attachmentsContainer = createElement('div', 'note-attachments')
      const attachmentsList = createElement('div', 'attachments-items')

      note.attachments.forEach(attachment => {
        const originalFileName = getOriginalFileName(attachment)
        const attachmentLink = createDownloadLink(
          `/attachments/${note.id}/${attachment}`,
          originalFileName,
          originalFileName
        )
        attachmentsList.appendChild(attachmentLink)
      })

      attachmentsContainer.appendChild(attachmentsList)
      noteContent.appendChild(attachmentsContainer)
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
  const laneColumn = createElement('div', 'lane', '', { tabIndex: 0 })
  laneColumn.draggable = true
  laneColumn.dataset.laneName = lane.name

  laneColumn.addEventListener('dragstart', dragAndDropCallbacks.lane.dragstart)
  laneColumn.addEventListener('dragover', dragAndDropCallbacks.lane.dragover)
  laneColumn.addEventListener('dragleave', dragAndDropCallbacks.lane.dragleave)
  laneColumn.addEventListener('drop', dragAndDropCallbacks.lane.drop)
  laneColumn.addEventListener('dragend', dragAndDropCallbacks.lane.dragend)

  // Delegate paste handling to a dedicated function
  laneColumn.addEventListener('paste', (e) => handleLanePaste(e, lane.name, callbacks))

  const laneHeader = createElement('div', 'lane-header')
  const laneTitle = createElement('h2', 'lane-title', lane.name)
  makeTitleEditable(laneTitle, lane.name, (newName) => {
    if (callbacks.onUpdateLaneName) callbacks.onUpdateLaneName(lane, newName)
  })

  const addNoteButton = createButton(
    'add-note-btn',
    '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    `Add new note to ${lane.name}`,
    () => {
      if (callbacks.onAddNote) callbacks.onAddNote(lane.name)
    }
  )

  const deleteButton = createButton(
    'delete-lane-btn',
    '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    `Delete lane ${lane.name}`,
    () => {
      if (callbacks.onDeleteLane) callbacks.onDeleteLane(lane.name)
    }
  )

  const noteCountPill = createElement('span', 'lane-note-count', lane.notes ? lane.notes.length : 0)
  const laneActions = createElement('div', 'lane-actions')
  laneActions.appendChild(addNoteButton)
  laneActions.appendChild(deleteButton)

  laneHeader.appendChild(laneTitle)
  laneHeader.appendChild(noteCountPill)
  laneHeader.appendChild(laneActions)
  laneColumn.appendChild(laneHeader)

  const notesList = createElement('div', 'notes-list')
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
    const noNotesMessage = createElement('p', '', 'No notes in this lane.')
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
