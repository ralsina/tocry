export function renderLanes(lanes, callbacks, dragAndDropCallbacks) {
    const lanesContainer = document.getElementById('lanes-container');
    if (!lanesContainer) {
        console.error('Lanes container not found!');
        return;
    }
    lanesContainer.innerHTML = ''; // Clear existing lanes

    if (!lanes || lanes.length === 0) {
        lanesContainer.innerHTML = '<p>No lanes to display. Click "+" to add a new lane.</p>';
        return;
    }

    lanes.forEach(lane => {
        // Create lane column
        const laneColumn = document.createElement('div');
        laneColumn.className = 'lane'; // Add the 'lane' class for styling
        laneColumn.draggable = true; // Make the lane draggable
        laneColumn.dataset.laneName = lane.name; // Store the lane name for drag/drop operations
        laneColumn.tabIndex = 0; // Make the lane focusable to receive paste events

        // Attach drag and drop event listeners
        laneColumn.addEventListener('dragstart', dragAndDropCallbacks.lane.dragstart); // Still needed for individual lane
        laneColumn.addEventListener('dragleave', dragAndDropCallbacks.lane.dragleave); // Still needed for individual lane
        laneColumn.addEventListener('dragend', dragAndDropCallbacks.lane.dragend);

        // Add paste listener to the entire lane column
        laneColumn.addEventListener('paste', (e) => {
            // Don't interfere with pasting into editable fields
            const activeElement = document.activeElement;
            if (activeElement.isContentEditable || activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
                return;
            }

            const items = (e.clipboardData || window.clipboardData).items;

            // Prioritize handling image paste
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.kind === 'file' && item.type.startsWith('image/')) {
                    e.preventDefault();
                    e.stopPropagation();
                    const imageBlob = item.getAsFile();
                    if (callbacks.onPasteAsImageNote) {
                        callbacks.onPasteAsImageNote(lane.name, imageBlob);
                    }
                    return; // Image handled, we are done.
                }
            }

            // Fallback to handling text paste
            const pastedText = (e.clipboardData || window.clipboardData).getData('text/plain');
            if (pastedText) {
                e.preventDefault();
                e.stopPropagation();
                if (callbacks.onPasteAsNote) {
                    callbacks.onPasteAsNote(lane.name, pastedText);
                }
            }
        });
        const laneHeader = document.createElement('div');
        laneHeader.className = 'lane-header';

        const laneTitle = document.createElement('h2');
        laneTitle.textContent = lane.name;
        laneTitle.contentEditable = true;
        laneTitle.dataset.originalName = lane.name; // Store original name for comparison

        // Add event listeners for editing the lane title
        laneTitle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent creating a new line
                e.target.blur();    // Trigger blur to save the change
            } else if (e.key === 'Escape') {
                e.target.textContent = e.target.dataset.originalName; // Revert changes
                e.target.blur();
            }
        });

        laneTitle.addEventListener('blur', (e) => {
            const newName = e.target.textContent.trim();
            const oldName = e.target.dataset.originalName;
            if (callbacks.onUpdateLaneName && newName && newName !== oldName) {
                callbacks.onUpdateLaneName(oldName, newName);
            }
        });

        const addNoteButton = document.createElement('button');
        addNoteButton.className = 'add-note-btn';
        // SVG for plus icon
        addNoteButton.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
        // The original text content is removed, and the SVG is used instead.
        // The `stroke` color will be controlled by the CSS `color` property of the button,
        // so it will automatically adapt to your theme.
        // The `width` and `height` attributes ensure the icon has a consistent size,
        // and the `stroke-width` controls the thickness of the lines.

        addNoteButton.setAttribute('aria-label', `Add new note to ${lane.name}`);
        addNoteButton.dataset.laneName = lane.name;

        addNoteButton.addEventListener('click', () => {
            if (callbacks.onAddNote) {
                callbacks.onAddNote(lane.name);
            }
        });
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-lane-btn';
        // SVG for close icon (simplified "X")
        deleteButton.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        // Similar to the add button, we replace the text with an SVG icon.
        // Note that the `width` and `height` are slightly smaller (20x20) to visually balance
        // with the plus icon, as the "X" tends to appear larger due to its diagonal lines.
        deleteButton.setAttribute('aria-label', `Delete lane ${lane.name}`);
        deleteButton.dataset.laneName = lane.name; // Store lane name, though direct param is used

        deleteButton.addEventListener('click', () => {
            if (callbacks.onDeleteLane) {
                callbacks.onDeleteLane(lane.name);
            }
        });

        laneHeader.appendChild(laneTitle);

        const noteCountPill = document.createElement('span');
        noteCountPill.className = 'lane-note-count';
        noteCountPill.textContent = lane.notes ? lane.notes.length : 0;
        laneHeader.appendChild(noteCountPill);

        const laneActions = document.createElement('div');
        laneActions.className = 'lane-actions';
        laneActions.appendChild(addNoteButton);
        laneActions.appendChild(deleteButton);
        laneHeader.appendChild(laneActions);

        laneColumn.appendChild(laneHeader);

        const notesList = document.createElement('div');
        notesList.className = 'notes-list';
        notesList.dataset.laneName = lane.name;

        // Attach drop listeners to the list itself for notes
        notesList.addEventListener('dragover', dragAndDropCallbacks.note.dragover);
        notesList.addEventListener('dragleave', dragAndDropCallbacks.note.dragleave);
        notesList.addEventListener('drop', dragAndDropCallbacks.note.drop);

        if (lane.notes && lane.notes.length > 0) {
            lane.notes.forEach(note => {
                const noteCard = document.createElement('article');
                noteCard.className = 'note-card'; // For styling individual notes
                noteCard.draggable = true;
                noteCard.dataset.noteId = note.id;
                noteCard.dataset.laneName = lane.name;

                // Centralized event handling on the note card
                noteCard.addEventListener('dragstart', dragAndDropCallbacks.note.dragstart);
                noteCard.addEventListener('dragend', dragAndDropCallbacks.note.dragend);
                noteCard.addEventListener('dblclick', (e) => {
                    // Prevent editing when clicking a button.
                    if (e.target.closest('button')) {
                        return;
                    }
                    // No need to prevent default here, as the summary div no longer toggles content.
                    // Dblclick on title/tags will now correctly open the edit modal.
                    if (callbacks.onEditNote) {
                        callbacks.onEditNote(note);
                    }
                });

                const deleteNoteButton = document.createElement('button');
                deleteNoteButton.className = 'delete-note-btn';
                deleteNoteButton.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
                deleteNoteButton.setAttribute('aria-label', `Delete note ${note.title}`);
                // Stop propagation for the delete button click to prevent the details from toggling
                deleteNoteButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (callbacks.onDeleteNote) {
                        callbacks.onDeleteNote(note.id, note.title);
                    }
                });
                const noteTitle = document.createElement('h4');
                noteTitle.textContent = note.title;
                noteTitle.contentEditable = true;
                noteTitle.dataset.originalTitle = note.title;

                noteTitle.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.target.blur();
                    } else if (e.key === 'Escape') {
                        e.target.textContent = e.target.dataset.originalTitle;
                        e.target.blur();
                    }
                });

                noteTitle.addEventListener('blur', (e) => {
                    const newTitle = e.target.textContent.trim();
                    const oldTitle = e.target.dataset.originalTitle;
                    if (callbacks.onUpdateNoteTitle && newTitle && newTitle !== oldTitle) {
                        callbacks.onUpdateNoteTitle(note.id, newTitle);
                    } else if (!newTitle) {
                        e.target.textContent = oldTitle; // Revert if empty
                    }
                });

                let tagsContainer = null;
                if (note.tags && note.tags.length > 0) {
                    tagsContainer = document.createElement('div');
                    tagsContainer.className = 'note-tags';
                    note.tags.forEach(tag => {
                        const tagSpan = document.createElement('span');
                        tagSpan.className = 'tag';
                        tagSpan.textContent = tag;
                        tagsContainer.appendChild(tagSpan);
                    });
                }

                const collapsibleContainer = document.createElement('div');
                collapsibleContainer.className = 'note-collapsible';

                // Create the note summary container (no longer directly clickable for toggle)
                const summaryDiv = document.createElement('div');
                summaryDiv.className = 'note-summary';

                // NEW: Create the dedicated toggle button for this note
                const toggleButton = document.createElement('button');
                toggleButton.className = 'note-toggle-btn';
                toggleButton.setAttribute('aria-label', 'Toggle note content');
                // Add the SVG icon for the toggle button directly
                toggleButton.innerHTML = `<svg class="toggle-arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
                // Add click listener to the new toggle button
                toggleButton.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent dblclick on noteCard from firing immediately
                    if (hasContent) {
                        collapsibleContainer.classList.toggle('is-open');
                    }
                });

                summaryDiv.appendChild(toggleButton); // Add toggle button first
                summaryDiv.appendChild(noteTitle);
                if (tagsContainer) summaryDiv.appendChild(tagsContainer);
                summaryDiv.appendChild(deleteNoteButton);

                collapsibleContainer.appendChild(summaryDiv);

                const hasContent = note.content && note.content.trim() !== '';
                let noteContent = null;

                if (hasContent) {
                    noteContent = document.createElement('div');
                    noteContent.className = 'note-content';
                    // Use the 'marked' library to parse markdown content to HTML.
                    noteContent.innerHTML = window.marked ? window.marked.parse(note.content) : note.content;

                    if (window.hljs) {
                        noteContent.querySelectorAll('pre code').forEach((block) => {
                            window.hljs.highlightElement(block);
                        });
                    }
                    collapsibleContainer.appendChild(noteContent);
                } else {
                    collapsibleContainer.classList.add('note-card--no-content');
                }

                noteCard.appendChild(collapsibleContainer);
                notesList.appendChild(noteCard);
            });
        } else {
            const noNotesMessage = document.createElement('p');
            noNotesMessage.textContent = 'No notes in this lane.';
            notesList.appendChild(noNotesMessage);
        }
        laneColumn.appendChild(notesList);
        lanesContainer.appendChild(laneColumn);
    });
}
