import { fetchLanes, addLane, deleteLane, updateLanePosition, addNote, updateNote, deleteNote } from './api.js';
import { renderLanes } from './render.js';

async function initializeLanes() {
    const lanesContainer = document.getElementById('lanes-container');
    try {
        const lanes = await fetchLanes();
        renderLanes(lanes, handleDeleteLaneRequest, handleAddNoteRequest, handleDeleteNoteRequest, handleEditNoteRequest, { lane: laneDragAndDropCallbacks, note: noteDragAndDropCallbacks });
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
            const response = await deleteNote(noteId);
            if (response.ok) {
                console.log(`Note "${noteTitle}" (ID: ${noteId}) deleted successfully.`);
                await initializeLanes(); // Re-fetch and render all lanes
            } else {
                const errorData = await response.json().catch(() => ({ error: "Failed to parse error response from server" }));
                console.error(`Failed to delete note "${noteTitle}":`, response.status, response.statusText, errorData.error);
                alert(`Failed to delete note: ${errorData.error || response.statusText}`);
            }
        } catch (error) {
            console.error('Error during delete note operation:', error);
            alert("An error occurred while trying to delete the note.");
        }
    }
}

// --- Note Editing Modal Handlers ---

function handleEditNoteRequest(note) {
    const modal = document.getElementById('modal-edit-note');
    if (!modal) return;

    const form = document.getElementById('edit-note-form');
    form.dataset.noteId = note.id; // Store the ID for submission

    document.getElementById('edit-note-title').value = note.title;
    document.getElementById('edit-note-tags').value = note.tags.join(', ');
    document.getElementById('edit-note-content').value = note.content;

    modal.showModal(); // Use the native <dialog> method to open
}

function closeEditModal() {
    const modal = document.getElementById('modal-edit-note');
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
        content: document.getElementById('edit-note-content').value
    };

    try {
        const response = await updateNote(noteId, { note: updatedNote });
        if (response.ok) {
            closeEditModal();
            await initializeLanes();
        } else {
            alert('Failed to save note. Please try again.');
        }
    } catch (error) {
        alert('An error occurred while saving the note.');
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

        const response = await updateLanePosition(draggedLaneName, targetIndex);
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
}

const noteDragAndDropCallbacks = {
    dragstart: handleNoteDragStart,
    dragover: handleNoteDragOver,
    dragleave: handleNoteDragLeave,
    drop: handleNoteDrop,
    dragend: handleNoteDragEnd,
};

document.addEventListener('DOMContentLoaded', () => {
    initializeLanes();
    const addLaneButton = document.querySelector('button[aria-label="Add new item"]');
    if (addLaneButton) {
        addLaneButton.addEventListener('click', handleAddLaneButtonClick);
    }

    // Wire up the edit modal's form and buttons
    const editNoteForm = document.getElementById('edit-note-form');
    const cancelEditBtn = document.getElementById('edit-note-cancel-btn');
    const closeEditBtn = document.getElementById('edit-note-close-btn');

    editNoteForm.addEventListener('submit', handleEditNoteSubmit);
    cancelEditBtn.addEventListener('click', closeEditModal);
    closeEditBtn.addEventListener('click', closeEditModal);
});