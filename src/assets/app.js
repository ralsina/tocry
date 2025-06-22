import { fetchLanes, addLane, deleteLane, updateLanePosition, updateLane, addNote, updateNote, deleteNote, uploadImage } from './api.js';
import { renderLanes } from './render.js';

let currentLanes = []; // Cache for the current state of lanes

async function initializeLanes() {
    const lanesContainer = document.getElementById('lanes-container');
    try {
        const lanes = await fetchLanes();
        currentLanes = lanes; // Update the cache
        const callbacks = {
            onDeleteLane: handleDeleteLaneRequest,
            onAddNote: handleAddNoteRequest,
            onDeleteNote: handleDeleteNoteRequest,
            onEditNote: handleEditNoteRequest,
            onUpdateLaneName: handleUpdateLaneNameRequest,
            onUpdateNoteTitle: handleUpdateNoteTitleRequest,
            onPasteAsNote: handlePasteAsNoteRequest,
            onPasteAsImageNote: handlePasteAsImageNoteRequest,
            onToggleNote: handleToggleNoteRequest
        };
        renderLanes(lanes, callbacks, { lane: laneDragAndDropCallbacks, note: noteDragAndDropCallbacks });
        // Use a timeout to ensure the browser has had time to render and calculate scrollWidth
        setTimeout(updateScrollButtonsVisibility, 100);
    } catch (error) {
        console.error('Error initializing lanes:', error);
        if (lanesContainer) {
            let errorMessage = 'Error loading lanes.';
            if (error.status) { // If it's an HTTP error
                errorMessage += ` Server responded with ${error.status} ${error.message}.`;
                if (error.body && error.body.error) errorMessage += ` Details: ${error.body.error}`;
            } else { // Generic network error
                errorMessage += ` A network or unexpected error occurred: ${error.message}.`;
            }
            lanesContainer.innerHTML = `<p>${errorMessage}</p>`;
        }
    }
}

async function handleAddLaneButtonClick() {
    const laneName = prompt("Enter the name for the new lane:");

    if (laneName !== null && laneName.trim() !== "") {
        try {
            const response = await addLane(laneName.trim());
            if (response.ok) {
                console.log('Lane created successfully');
                await initializeLanes(); // Re-fetch and render all lanes
            } else {
                const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
                console.error('Failed to create lane:', response.status, response.statusText, errorData.error);
                alert(`Failed to create lane: ${errorData.error || response.statusText}`);
            }
        } catch (error) {
            console.error('Error creating lane:', error);
            alert("An error occurred while trying to create the lane.");
        }
    } else if (laneName !== null) {
        alert("Lane name cannot be empty.");
    }
}

// Handler for delete lane requests, passed as a callback to renderLanes
async function handleDeleteLaneRequest(laneName) {
    if (confirm(`Are you sure you want to delete the lane "${laneName}"?`)) {
        try {
            // OPTIMISTIC UI UPDATE: Remove the lane from the DOM and cache immediately.
            const laneElement = document.querySelector(`.lane[data-lane-name="${laneName}"]`);
            if (laneElement) {
                laneElement.remove();
            }
            // Update cache: Filter out the deleted lane
            currentLanes = currentLanes.filter(lane => lane.name !== laneName);
            // Update scroll buttons visibility as lanes might have shifted
            updateScrollButtonsVisibility();

            const response = await deleteLane(laneName);
            if (response.ok) {
                console.log(`Lane "${laneName}" deleted successfully.`);
                await initializeLanes(); // Re-fetch and render all lanes
            } else {
                const errorData = await response.json().catch(() => ({ error: "Failed to parse error response from server" }));
                console.error(`Failed to delete lane "${laneName}":`, response.status, response.statusText, errorData.error);
                alert(`Failed to delete lane: ${errorData.error || response.statusText}`);
            }
        } catch (error) {
            // This catch is for network errors or if deleteLane itself throws
            console.error('Error during delete lane operation:', error);
            alert("An error occurred while trying to delete the lane.");
        }
    }
}

// Handler for updating a lane's name. This is more complex because the PUT
// endpoint requires the full lane object and its current position.
async function handleUpdateLaneNameRequest(laneToUpdate, newName) {
    const trimmedNewName = newName.trim();
    const oldName = laneToUpdate.name;

    if (!trimmedNewName || oldName === trimmedNewName) {
        return; // No action needed if name is empty or unchanged
    }

    try {
        // Use the cached state to find the position, no need to fetch.
        const currentPosition = currentLanes.findIndex(lane => lane.name === oldName);

        if (currentPosition === -1) {
            alert(`Error: Could not find lane "${oldName}" to determine its position. Refreshing.`);
            return initializeLanes(); // Refresh to be safe
        }

        const updatedLaneData = { ...laneToUpdate, name: trimmedNewName };

        // OPTIMISTIC UI UPDATE: Update the name in the local cache immediately.
        // Since render.js uses currentLanes, this will update the displayed name.
        laneToUpdate.name = trimmedNewName;

        const response = await updateLane(oldName, updatedLaneData, currentPosition);
        if (response.ok) {
            // On success, the UI is already updated optimistically, so no full re-render is needed.
            console.log(`Lane "${oldName}" successfully renamed to "${trimmedNewName}".`);
        } else {
            // On failure, alert the user and re-render to revert the optimistic UI change.
            const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
            alert(`Failed to rename lane: ${errorData.error || response.statusText}`);
            await initializeLanes(); // Revert UI on failure
        }
    } catch (error) {
        alert("An error occurred while trying to rename the lane.");
        await initializeLanes(); // Revert UI
    }
}

// Handler for updating a note's title directly from the card
async function handleUpdateNoteTitleRequest(noteToUpdate, newTitle) {
    const trimmedNewTitle = newTitle.trim();
    if (!trimmedNewTitle) {
        return initializeLanes(); // Revert if title is empty
    }

    try {
        const updatedNoteData = { ...noteToUpdate, title: trimmedNewTitle };

        // OPTIMISTIC UI UPDATE: Update the title in the local cache immediately.
        // The DOM is already updated by makeTitleEditable.
        noteToUpdate.title = trimmedNewTitle;

        const response = await updateNote(noteToUpdate.id, { note: updatedNoteData, lane_name: null, position: null });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
            alert(`Failed to rename note: ${errorData.error || response.statusText}`);
            await initializeLanes(); // Revert UI on failure
        } else {
            console.log(`Note "${noteToUpdate.id}" title updated successfully.`);
            // UI is already updated, no full re-render needed.
        }
    } catch (error) {
        alert("An error occurred while trying to rename the note. Reverting changes.");
        await initializeLanes(); // Revert UI on failure
    }
}

// Handler for persisting the expanded/collapsed state of a note
async function handleToggleNoteRequest(noteToUpdate, isExpanded) {
    const updatedNoteData = { ...noteToUpdate, expanded: isExpanded };

    try {
        const response = await updateNote(noteToUpdate.id, { note: updatedNoteData, lane_name: null, position: null });

        if (response.ok) {
            // On success, we don't need to re-render the whole board.
            // The UI has already been updated optimistically.
            // We just need to update our local cache to reflect the change.
            const lane = currentLanes.find(l => l.notes.some(n => n.id === noteToUpdate.id));
            if (lane) {
                const noteInCache = lane.notes.find(n => n.id === noteToUpdate.id);
                if (noteInCache) {
                    noteInCache.expanded = isExpanded;
                }
            }
        } else {
            // If the update fails, alert the user and revert the UI by re-rendering.
            const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
            alert(`Failed to save note state: ${errorData.error || response.statusText}`);
            await initializeLanes();
        }
    } catch (error) {
        alert('An error occurred while saving the note state. Reverting changes.');
        await initializeLanes(); // Revert UI on failure
    }
}

// Handler for adding a new note to a lane
async function handleAddNoteRequest(laneName) {
    const noteTitle = prompt(`Enter title for new note in "${laneName}":`);
    if (noteTitle !== null && noteTitle.trim() !== "") {
        try {
            const response = await addNote(laneName, noteTitle.trim(), "", []); // Placeholder content and tags
            if (response.ok) {
                console.log(`Note "${noteTitle}" added successfully to lane "${laneName}".`);
                await initializeLanes(); // Re-fetch and render all lanes
            } else {
                const errorData = await response.json().catch(() => ({ error: "Failed to parse error response from server" }));
                console.error(`Failed to add note to lane "${laneName}":`, response.status, response.statusText, errorData.error);
                alert(`Failed to add note: ${errorData.error || response.statusText}`);
            }
        } catch (error) {
            console.error('Error during add note operation:', error);
            alert("An error occurred while trying to add the note.");
        }
    } else if (noteTitle !== null) {
        alert("Note title cannot be empty.");
    }
}

// Handler for delete note requests
async function handleDeleteNoteRequest(noteId, noteTitle) {
    if (confirm(`Are you sure you want to delete the note "${noteTitle}"?`)) {
        try {
            // OPTIMISTIC UI UPDATE: Remove the note from the DOM and cache immediately.
            const noteCard = document.querySelector(`.note-card[data-note-id="${noteId}"]`);
            if (noteCard) {
                noteCard.remove();
            }
            // Update cache: find the lane and remove the note from its notes array
            for (const lane of currentLanes) {
                const initialNoteCount = lane.notes.length;
                lane.notes = lane.notes.filter(note => note.id !== noteId);
                if (lane.notes.length < initialNoteCount) {
                    // Note was found and removed from this lane
                    break;
                }
            }
            const response = await deleteNote(noteId);
            if (response.ok) {
                console.log(`Note "${noteTitle}" (ID: ${noteId}) deleted successfully.`);
                await initializeLanes(); // Re-fetch and render all lanes
            } else {
                const errorData = await response.json().catch(() => ({ error: "Failed to parse error response from server" }));
                console.error(`Failed to delete note "${noteTitle}":`, response.status, response.statusText, errorData.error);
                alert(`Failed to delete note: ${errorData.error || response.statusText}`);
                await initializeLanes(); // Revert UI on failure
            }
        } catch (error) {
            console.error('Error during delete note operation:', error);
            alert("An error occurred while trying to delete the note.");
        }
    }
}

// Handler for creating a note from pasted text
async function handlePasteAsNoteRequest(laneName, pastedText) {
    if (!pastedText || pastedText.trim() === '') {
        return;
    }

    const lines = pastedText.trim().split('\n');
    const title = lines[0].trim();
    const content = lines.slice(1).join('\n').trim();

    if (!title) {
        alert("Pasted text must have at least one line to be used as a title.");
        return;
    }

    try {
        const response = await addNote(laneName, title, content, []);
        if (response.ok) {
            console.log(`Note "${title}" created from paste in lane "${laneName}".`);
            await initializeLanes();
        } else {
            const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
            alert(`Failed to create note from paste: ${errorData.error || response.statusText}`);
        }
    } catch (error) {
        console.error('Error creating note from paste:', error);
        alert("An error occurred while trying to create the note from paste.");
    }
}

// Handler for creating a note from a pasted image
async function handlePasteAsImageNoteRequest(laneName, imageBlob) {
    try {
        const formData = new FormData();
        formData.append('image', imageBlob);

        const uploadResponse = await uploadImage(formData);
        const imageUrl = uploadResponse.url;

        const title = "Pasted Image";
        const content = `![Pasted Image](${imageUrl})`; // Correct markdown for the image

        const addNoteResponse = await addNote(laneName, title, content, []);
        if (addNoteResponse.ok) {
            console.log(`Note "${title}" created from pasted image in lane "${laneName}".`);
            await initializeLanes();
        } else {
            const errorData = await addNoteResponse.json().catch(() => ({ error: "Failed to parse error response" }));
            alert(`Failed to create note from pasted image: ${errorData.error || addNoteResponse.statusText}`);
        }
    } catch (error) {
        console.error('Error creating note from pasted image:', error);
        alert("An error occurred while trying to create the note from the pasted image.");
    }
}

// --- Note Editing Modal Handlers ---

let easyMDE = null; // To hold the editor instance

// Change to toastuiEditor
let toastuiEditor = null;

function handleEditNoteRequest(note) {
    const modal = document.getElementById('modal-edit-note');
    if (!modal) return;

    // IMPORTANT FIX: Destroy existing editor instance if it exists
    if (toastuiEditor) {
        toastuiEditor.destroy(); // Destroy the Toast UI Editor instance
        toastuiEditor = null; // Clear the reference
    }

    const form = document.getElementById('edit-note-form');
    form.dataset.noteId = note.id; // Store the ID for submission
    document.getElementById('edit-note-title').value = note.title;
    document.getElementById('edit-note-tags').value = note.tags.join(', ');

    const contentTextarea = document.getElementById('edit-note-content');
    // Toast UI Editor takes the element directly and initialValue in options
    toastuiEditor = new toastui.Editor({
        el: contentTextarea,
        initialValue: note.content, // Pass the note content directly
        height: '300px', // Set fixed height here
        previewStyle: 'vertical', // Or 'tab'
        toolbarItems: [
            ['heading', 'bold', 'italic', 'strike'],
            ['hr', 'quote'],
            ['ul', 'ol', 'task'],
            ['table', 'image', 'link'],
            ['code', 'codeblock']
        ],
        hooks: {
            async addImageBlobHook(blob, callback) {
                try {
                    const formData = new FormData();
                    // The backend expects the file part to be named anything, 'image' is a good convention.
                    formData.append('image', blob);

                    const response = await uploadImage(formData);
                    const imageUrl = response.url;

                    // The callback tells the editor to insert the image markdown with the returned URL
                    callback(imageUrl, 'alt text');
                } catch (error) {
                    console.error('Image upload failed:', error);
                    alert(`Image upload failed: ${error.message}`);
                }
            }
        }
    });

    modal.showModal(); // Use the native <dialog> method to open
}

function closeEditModal() {
    const modal = document.getElementById('modal-edit-note');
    if (toastuiEditor) {
        toastuiEditor.destroy(); // Clean up the Toast UI Editor instance
        toastuiEditor = null;
    } // <-- This closing brace was missing
    if (modal) {
        modal.close(); // Use the native <dialog> method to close
    }
}

async function handleEditNoteSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const noteId = form.dataset.noteId;

    const updatedNote = {
        id: noteId, // Not strictly needed by backend, but good practice
        title: document.getElementById('edit-note-title').value,
        tags: document.getElementById('edit-note-tags').value.split(',').map(t => t.trim()).filter(Boolean),
        content: toastuiEditor.getMarkdown() // Get markdown content from Toast UI Editor
    };

    // OPTIMISTIC UI UPDATE: Update the note in the local cache immediately.
    let noteInCache = null;
    for (const lane of currentLanes) {
        noteInCache = lane.notes.find(n => n.id === noteId);
        if (noteInCache) {
            noteInCache.title = updatedNote.title;
            noteInCache.tags = updatedNote.tags;
            noteInCache.content = updatedNote.content;
            break;
        }
    }

    // Also update the DOM for the specific note card
    const noteCardElement = document.querySelector(`.note-card[data-note-id="${noteId}"]`);
    if (noteCardElement) {
        // Update title in DOM (already handled by makeTitleEditable, but ensure consistency)
        const titleElement = noteCardElement.querySelector('.note-summary h4');
        if (titleElement) titleElement.textContent = updatedNote.title;

        // Update tags in DOM
        const tagsContainer = noteCardElement.querySelector('.note-tags');
        if (tagsContainer) {
            tagsContainer.innerHTML = ''; // Clear existing tags
            updatedNote.tags.forEach(tag => {
                const tagSpan = document.createElement('span');
                tagSpan.className = 'tag';
                tagSpan.textContent = tag;
                tagsContainer.appendChild(tagSpan);
            });
        }
        // Update content in DOM (re-parse markdown and highlight)
        const noteContentDiv = noteCardElement.querySelector('.note-content');
        if (noteContentDiv) {
            noteContentDiv.innerHTML = window.marked ? window.marked.parse(updatedNote.content) : updatedNote.content;
            if (window.hljs) noteContentDiv.querySelectorAll('pre code').forEach((block) => window.hljs.highlightElement(block));
        }
    }

    try {
        const response = await updateNote(noteId, { note: updatedNote, lane_name: null, position: null });
        if (response.ok) {
            closeEditModal();
            console.log(`Note "${noteId}" updated successfully.`);
        } else {
            alert('Failed to save note. Please try again.');
            await initializeLanes(); // Revert UI on failure
        }
    } catch (error) {
        alert('An error occurred while saving the note.');
    }
}

// --- Drag and Drop Auto-Scrolling ---

let scrollInterval = null;
const SCROLL_SPEED = 15; // Speed of the scroll in pixels
const EDGE_ZONE_WIDTH = 120; // Width of the edge zone in pixels that triggers scrolling

/**
 * Checks the mouse position during a drag event and scrolls the main container
 * horizontally if the cursor is near the left or right edge of the viewport.
 * @param {DragEvent} event The dragover event.
 */
function handleDragAutoScroll(event) {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    const x = event.clientX;
    const screenWidth = window.innerWidth;

    // Check if we are in the right edge zone
    if (x > screenWidth - EDGE_ZONE_WIDTH) {
        // If not already scrolling right, start a new scroll interval
        if (!scrollInterval || (scrollInterval && scrollInterval.direction !== 'right')) {
            stopDragAutoScroll(); // Stop any left scroll
            scrollInterval = {
                id: setInterval(() => { mainContent.scrollLeft += SCROLL_SPEED; }, 20), // ~50fps
                direction: 'right'
            };
        }
    }
    // Check if we are in the left edge zone
    else if (x < EDGE_ZONE_WIDTH) {
        // If not already scrolling left, start a new scroll interval
        if (!scrollInterval || (scrollInterval && scrollInterval.direction !== 'left')) {
            stopDragAutoScroll(); // Stop any right scroll
            scrollInterval = {
                id: setInterval(() => { mainContent.scrollLeft -= SCROLL_SPEED; }, 20),
                direction: 'left'
            };
        }
    }
    // If we are not in an edge zone, stop any active scrolling
    else {
        stopDragAutoScroll();
    }
}

/**
 * Stops any active horizontal auto-scrolling.
 */
function stopDragAutoScroll() {
    if (scrollInterval) {
        clearInterval(scrollInterval.id);
        scrollInterval = null;
    }
}

// --- Drag and Drop Handlers for Lanes ---

function handleLaneDragStart(event) {
    // Set data for the drag operation
    event.dataTransfer.setData('text/plain', event.currentTarget.dataset.laneName);
    event.dataTransfer.effectAllowed = 'move';
    // Add a class to the dragged element for visual feedback
    event.currentTarget.classList.add('lane--dragging');
}

function handleLaneDragOver(event) {
    // Prevent default to allow dropping
    event.preventDefault();
    // Add visual feedback to the potential drop target
    if (event.currentTarget.dataset.laneName !== event.dataTransfer.getData('text/plain')) {
        event.currentTarget.classList.add('lane--drag-over');
    }
}

function handleLaneDragLeave(event) {
    // Remove visual feedback when dragging leaves the target
    event.currentTarget.classList.remove('lane--drag-over');
}

async function handleLaneDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('lane--drag-over');

    const draggedLaneName = event.dataTransfer.getData('text/plain');
    const targetLaneName = event.currentTarget.dataset.laneName;

    if (!draggedLaneName || draggedLaneName === targetLaneName) {
        return; // No change needed if dropped on itself or invalid drag data
    }

    try {
        const currentLanes = await fetchLanes();
        if (!currentLanes) {
            alert('Could not get current lane order to perform move.');
            return;
        }

        const targetIndex = currentLanes.findIndex(lane => lane.name === targetLaneName);
        if (targetIndex === -1) {
            alert(`Target lane "${targetLaneName}" not found.`);
            return;
        }

        // OPTIMISTIC UI UPDATE: Perform the reordering in the cache
        const draggedLaneIndex = currentLanes.findIndex(lane => lane.name === draggedLaneName);
        const targetIndexInCache = currentLanes.findIndex(lane => lane.name === targetLaneName);

        if (draggedLaneIndex === -1 || targetIndexInCache === -1) {
            alert('Error: Could not find dragged or target lane in cache. Refreshing.');
            return initializeLanes(); // Revert UI
        }

        const [draggedLane] = currentLanes.splice(draggedLaneIndex, 1);
        currentLanes.splice(targetIndexInCache, 0, draggedLane);

        const response = await updateLanePosition(draggedLaneName, targetIndexInCache);
        if (response.ok) {
            await initializeLanes(); // Re-render the board
        } else {
            const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
            alert(`Failed to move lane: ${errorData.error || response.statusText}`);
        }
    } catch (error) {
        alert("An error occurred while trying to move the lane.");
    }
}

function handleLaneDragEnd(event) {
    event.currentTarget.classList.remove('lane--dragging');
}

// Object containing all drag and drop callbacks to pass to renderLanes
const laneDragAndDropCallbacks = {
    dragstart: handleLaneDragStart,
    dragover: handleLaneDragOver,
    dragleave: handleLaneDragLeave,
    drop: handleLaneDrop,
    dragend: handleLaneDragEnd,
};

// --- Drag and Drop Handlers for Notes ---

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.note-card:not(.note-card--dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function handleNoteDragStart(event) {
    event.stopPropagation(); // Prevent the lane's drag handler from firing
    const noteCard = event.currentTarget;
    // Set the primary data for our application
    event.dataTransfer.setData('application/json', JSON.stringify({
        noteId: noteCard.dataset.noteId,
        originalLane: noteCard.dataset.laneName
    }));
    // Also set a text/plain fallback for better browser compatibility.
    // The value can be simple, like the note ID.
    event.dataTransfer.setData('text/plain', noteCard.dataset.noteId);
    event.dataTransfer.effectAllowed = 'move';

    // Add a global listener to handle auto-scrolling when dragging near the viewport edges
    document.addEventListener('dragover', handleDragAutoScroll);

    setTimeout(() => {
        noteCard.classList.add('note-card--dragging');
    }, 0);
}

function handleNoteDragOver(event) {
    event.preventDefault();
    event.stopPropagation(); // Prevent the lane's dragover handler from firing
    const container = event.currentTarget.closest('.notes-list');
    if (container) {
        container.classList.add('notes-list--drag-over');
    }
}

function handleNoteDragLeave(event) {
    const container = event.currentTarget.closest('.notes-list');
    if (container) {
        container.classList.remove('notes-list--drag-over');
    }
}

async function handleNoteDrop(event) {
    event.preventDefault();

    // Check if the dragged data is for a note. The note drag handler sets
    // 'application/json', while the lane handler only sets 'text/plain'.
    const jsonData = event.dataTransfer.getData('application/json');
    if (!jsonData) {
        // This is not a note drop. Do nothing and let the event bubble up
        // to the lane's drop handler.
        return;
    }

    // This is a note drop, so we handle it and stop it from bubbling.
    event.stopPropagation();

    const notesListContainer = event.currentTarget.closest('.notes-list');
    if (!notesListContainer) return;

    notesListContainer.classList.remove('notes-list--drag-over');

    const dragData = JSON.parse(jsonData);
    const { noteId, originalLane } = dragData;
    const targetLaneName = notesListContainer.dataset.laneName;

    const afterElement = getDragAfterElement(notesListContainer, event.clientY);
    const allNotesInTarget = [...notesListContainer.querySelectorAll('.note-card')];
    let newPosition = (afterElement == null) ? allNotesInTarget.length : allNotesInTarget.indexOf(afterElement);

    const draggedElement = document.querySelector(`.note-card[data-note-id='${noteId}']`);
    if (targetLaneName === originalLane && draggedElement) {
        const originalDOMPosition = allNotesInTarget.indexOf(draggedElement);
        if (originalDOMPosition !== -1 && originalDOMPosition < newPosition) {
            newPosition--;
        }
    }

    const allLanes = await fetchLanes();
    if (!allLanes) { return alert('Could not fetch board data to complete the move.'); }

    const originalLaneObject = allLanes.find(lane => lane.name === originalLane);
    const originalNoteObject = originalLaneObject?.notes.find(note => note.id === noteId);
    if (!originalNoteObject) { return alert('Could not find the original note data.'); }

    const originalPositionInModel = originalLaneObject.notes.findIndex(note => note.id === noteId);
    if (targetLaneName === originalLane && newPosition === originalPositionInModel) { return; }

    // OPTIMISTIC UI UPDATE: Update the currentLanes cache to reflect the move.
    // The DOM is already reordered by the dragover event.
    if (targetLaneName !== originalLane) {
        // Move between lanes
        const targetLaneObject = currentLanes.find(lane => lane.name === targetLaneName);
        if (!targetLaneObject) {
            alert('Error: Target lane not found in cache. Refreshing.');
            return initializeLanes(); // Revert UI
        }
        originalLaneObject.notes = originalLaneObject.notes.filter(note => note.id !== noteId);
        targetLaneObject.notes.splice(newPosition, 0, originalNoteObject);
    } else {
        // Reorder within the same lane
        originalLaneObject.notes = originalLaneObject.notes.filter(note => note.id !== noteId);
        originalLaneObject.notes.splice(newPosition, 0, originalNoteObject);
    }

    try {
        const response = await updateNote(noteId, { note: originalNoteObject, lane_name: targetLaneName, position: newPosition });
        if (response.ok) {
            await initializeLanes();
        } else {
            const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
            alert(`Failed to move note: ${errorData.error || response.statusText}`);
            await initializeLanes();
        }
    } catch (error) {
        alert("An error occurred while trying to move the note.");
        await initializeLanes();
    }
}

function handleNoteDragEnd(event) {
    event.currentTarget.classList.remove('note-card--dragging');
    document.querySelectorAll('.notes-list--drag-over').forEach(el => el.classList.remove('notes-list--drag-over'));

    // Clean up the auto-scroll listener and stop any active scrolling
    document.removeEventListener('dragover', handleDragAutoScroll);
    stopDragAutoScroll();
}

const noteDragAndDropCallbacks = {
    dragstart: handleNoteDragStart,
    dragover: handleNoteDragOver,
    dragleave: handleNoteDragLeave,
    drop: handleNoteDrop,
    dragend: handleNoteDragEnd,
};

// --- Search Functionality ---

function handleSearchInput(event) {
    const searchTerm = event.target.value.toLowerCase();
    const allNotes = document.querySelectorAll('.note-card');

    allNotes.forEach(noteCard => {
        const titleElement = noteCard.querySelector('.note-summary h4');
        const contentElement = noteCard.querySelector('.note-content');
        const tagElements = noteCard.querySelectorAll('.note-tags .tag');

        const title = titleElement ? titleElement.textContent.toLowerCase() : '';
        const content = contentElement ? contentElement.textContent.toLowerCase() : '';
        const tags = [...tagElements].map(tag => tag.textContent.toLowerCase()).join(' ');

        const searchableText = `${title} ${content} ${tags}`;

        if (searchableText.includes(searchTerm)) {
            noteCard.classList.remove('note-card--hidden');
        } else {
            noteCard.classList.add('note-card--hidden');
        }
    });
}

// --- Theme Switcher ---

/**
 * Applies the given theme to the document and updates the switcher button.
 * @param {string} theme The theme to apply ('light' or 'dark').
 */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeSwitcher = document.getElementById('theme-switcher');
    if (themeSwitcher) {
        if (theme === 'dark') {
            themeSwitcher.textContent = '☀️'; // Sun icon for switching to light
            themeSwitcher.setAttribute('aria-label', 'Switch to light theme');
        } else {
            themeSwitcher.textContent = '🌙'; // Moon icon for switching to dark
            themeSwitcher.setAttribute('aria-label', 'Switch to dark theme');
        }
    }

    // Toggle highlight.js theme stylesheets for rendered notes
    const darkHljsTheme = document.getElementById('hljs-dark-theme');
    const lightHljsTheme = document.getElementById('hljs-light-theme');
    if (darkHljsTheme && lightHljsTheme) {
        if (theme === 'dark') {
            darkHljsTheme.disabled = false;
            lightHljsTheme.disabled = true;
        } else {
            darkHljsTheme.disabled = true;
            lightHljsTheme.disabled = false;
        }
    }
}

function handleThemeSwitch() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
}

// --- Horizontal Scroll Buttons ---

function updateScrollButtonsVisibility() {
    const mainContent = document.querySelector('.main-content');
    const scrollLeftBtn = document.querySelector('.scroll-btn--left');
    const scrollRightBtn = document.querySelector('.scroll-btn--right');

    if (!mainContent || !scrollLeftBtn || !scrollRightBtn) return;

    const scrollLeft = mainContent.scrollLeft;
    const scrollWidth = mainContent.scrollWidth;
    const clientWidth = mainContent.clientWidth;
    const scrollBuffer = 2; // Buffer for floating point inaccuracies

    // Left button visibility
    if (scrollLeft > scrollBuffer) {
        scrollLeftBtn.classList.add('scroll-btn--visible');
    } else {
        scrollLeftBtn.classList.remove('scroll-btn--visible');
    }

    // Right button visibility
    if (scrollLeft < scrollWidth - clientWidth - scrollBuffer) {
        scrollRightBtn.classList.add('scroll-btn--visible');
    } else {
        scrollRightBtn.classList.remove('scroll-btn--visible');
    }
}

function handleScrollButtonClick(direction) {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    const scrollAmount = mainContent.clientWidth * 0.8; // Scroll 80% of the visible width
    mainContent.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
    });
}

// --- Keyboard Shortcuts ---

/**
 * Handles global keydown events for application-wide shortcuts.
 * @param {KeyboardEvent} event The keydown event.
 */
function handleKeyDown(event) {
    // Ignore key presses if the user is typing in an input, textarea, or contentEditable element.
    // This prevents the page from scrolling when the user is editing text.
    const activeElement = document.activeElement;
    const isTyping = activeElement.tagName === 'INPUT' ||
                     activeElement.tagName === 'TEXTAREA' ||
                     activeElement.isContentEditable;

    if (isTyping) return;

    switch (event.key) {
        case 'ArrowLeft':
            event.preventDefault(); // Prevent default browser action (e.g., scrolling the whole window)
            handleScrollButtonClick('left');
            break;
        case 'ArrowRight':
            event.preventDefault();
            handleScrollButtonClick('right');
            break;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // --- Theme Switcher Setup ---
    // Checks for saved theme in localStorage, falls back to system preference, then defaults to light.
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);
    const themeSwitcher = document.getElementById('theme-switcher');
    if (themeSwitcher) {
        themeSwitcher.addEventListener('click', handleThemeSwitch);
    }

    initializeLanes();
    const addLaneButton = document.getElementById('add-lane-btn');
    if (addLaneButton) {
        addLaneButton.addEventListener('click', handleAddLaneButtonClick);
    }

    const searchInput = document.getElementById('search');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearchInput);
    }

    // Wire up keyboard shortcuts for scrolling
    document.addEventListener('keydown', handleKeyDown);

    // --- Scroll Button Setup ---
    const mainContent = document.querySelector('.main-content');
    const scrollLeftBtn = document.querySelector('.scroll-btn--left');
    const scrollRightBtn = document.querySelector('.scroll-btn--right');

    if (mainContent) {
        mainContent.addEventListener('scroll', updateScrollButtonsVisibility);
        window.addEventListener('resize', updateScrollButtonsVisibility);
    }
    if (scrollLeftBtn) {
        scrollLeftBtn.addEventListener('click', () => handleScrollButtonClick('left'));
    }
    if (scrollRightBtn) {
        scrollRightBtn.addEventListener('click', () => handleScrollButtonClick('right'));
    }

    // Wire up the edit modal's form and buttons
    const editNoteForm = document.getElementById('edit-note-form');
    const cancelEditBtn = document.getElementById('edit-note-cancel-btn');
    const closeEditBtn = document.getElementById('edit-note-close-btn');

    editNoteForm.addEventListener('submit', handleEditNoteSubmit);
    cancelEditBtn.addEventListener('click', closeEditModal);
    closeEditBtn.addEventListener('click', closeEditModal);
});
