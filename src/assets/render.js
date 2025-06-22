export function renderLanes(lanes, onDeleteLaneCallback, onAddNoteCallback, onDeleteNoteCallback, onEditNoteCallback, onUpdateLaneNameCallback, dragAndDropCallbacks) {
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

        // Attach drag and drop event listeners
        laneColumn.addEventListener('dragstart', dragAndDropCallbacks.lane.dragstart);
        laneColumn.addEventListener('dragover', dragAndDropCallbacks.lane.dragover);
        laneColumn.addEventListener('dragleave', dragAndDropCallbacks.lane.dragleave);
        laneColumn.addEventListener('drop', dragAndDropCallbacks.lane.drop);
        laneColumn.addEventListener('dragend', dragAndDropCallbacks.lane.dragend);
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
            if (onUpdateLaneNameCallback && newName && newName !== oldName) {
                onUpdateLaneNameCallback(oldName, newName);
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
            if (onAddNoteCallback) {
                onAddNoteCallback(lane.name);
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
            if (onDeleteLaneCallback) {
                onDeleteLaneCallback(lane.name);
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
                    // Prevent the default dblclick action on a summary (which is to toggle)
                    if (e.target.closest('summary')) {
                        e.preventDefault();
                    }
                    if (onEditNoteCallback) {
                        onEditNoteCallback(note);
                    }
                });

                const noteHeader = document.createElement('div');
                noteHeader.className = 'note-card-header';

                const deleteNoteButton = document.createElement('button');
                deleteNoteButton.className = 'delete-note-btn';
                deleteNoteButton.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
                deleteNoteButton.setAttribute('aria-label', `Delete note ${note.title}`);
                // Stop propagation for the delete button click to prevent the details from toggling
                deleteNoteButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (onDeleteNoteCallback) {
                        onDeleteNoteCallback(note.id, note.title);
                    }
                });
                const noteTitle = document.createElement('h4');
                noteTitle.textContent = note.title;

                noteHeader.appendChild(noteTitle);

                if (note.tags && note.tags.length > 0) {
                    const tagsContainer = document.createElement('div');
                    tagsContainer.className = 'note-tags';
                    note.tags.forEach(tag => {
                        const tagSpan = document.createElement('span');
                        tagSpan.className = 'tag';
                        tagSpan.textContent = tag;
                        tagsContainer.appendChild(tagSpan);
                    });
                    noteHeader.appendChild(tagsContainer);
                }
                noteHeader.appendChild(deleteNoteButton);

                const hasContent = note.content && note.content.trim() !== '';

                if (hasContent) {
                    const detailsElement = document.createElement('details');
                    const summaryElement = document.createElement('summary');
                    summaryElement.className = 'note-card-summary';
                    summaryElement.appendChild(noteHeader);

                    const noteContent = document.createElement('div');
                    noteContent.className = 'note-content';
                    // Use the 'marked' library to parse markdown content to HTML.
                    noteContent.innerHTML = window.marked ? window.marked.parse(note.content) : note.content;

                    // After setting the HTML, find and highlight all code blocks.
                    // This is more reliable than configuring marked directly.
                    if (window.hljs) {
                        noteContent.querySelectorAll('pre code').forEach((block) => {
                            window.hljs.highlightElement(block);
                        });
                    }

                    detailsElement.appendChild(summaryElement);
                    detailsElement.appendChild(noteContent);
                    noteCard.appendChild(detailsElement);
                } else {
                    // No content, not collapsable. Wrap the header in a div to provide consistent padding.
                    const headerWrapper = document.createElement('div');
                    headerWrapper.className = 'note-card-summary-placeholder';
                    headerWrapper.appendChild(noteHeader);
                    noteCard.appendChild(headerWrapper);
                }

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
