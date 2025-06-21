import { fetchLanes, addLane, deleteLane, updateLanePosition, updateLane, addNote, updateNote, deleteNote } from './api.js';
import { renderLanes } from './render.js';

async function initializeLanes() {
    const lanesContainer = document.getElementById('lanes-container');
    try {
        const lanes = await fetchLanes();
        renderLanes(lanes, handleDeleteLaneRequest, handleAddNoteRequest, handleDeleteNoteRequest, handleEditNoteRequest, handleUpdateLaneNameRequest, { lane: laneDragAndDropCallbacks, note: noteDragAndDropCallbacks });
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
async function handleUpdateLaneNameRequest(oldName, newName) {
    const trimmedNewName = newName.trim();
    if (!trimmedNewName || oldName === trimmedNewName) {
        return; // No action needed if name is empty or unchanged
    }

    try {
        // To use the PUT endpoint for renaming, we need the lane's current
        // position and its full data object.
        const allLanes = await fetchLanes();
        const laneToUpdate = allLanes.find(lane => lane.name === oldName);

        if (!laneToUpdate) {
            alert(`Error: Could not find lane "${oldName}" to rename.`);
            return initializeLanes(); // Refresh to be safe
        }

        const currentPosition = allLanes.indexOf(laneToUpdate);
        const updatedLaneData = { ...laneToUpdate, name: trimmedNewName };

        const response = await updateLane(oldName, updatedLaneData, currentPosition);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
            alert(`Failed to rename lane: ${errorData.error || response.statusText}`);
        }
        await initializeLanes(); // Always re-render to show result or revert optimistic UI change
    } catch (error) {
        alert("An error occurred while trying to rename the lane.");
        await initializeLanes(); // Revert UI
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

let easyMDE = null; // To hold the editor instance

function handleEditNoteRequest(note) {
    const modal = document.getElementById('modal-edit-note');
    if (!modal) return;

    // IMPORTANT FIX: Destroy existing editor instance if it exists
    if (easyMDE) {
        easyMDE.toTextArea(); // Revert the textarea to its original state
        easyMDE = null; // Clear the reference
    }

    const form = document.getElementById('edit-note-form');
    form.dataset.noteId = note.id; // Store the ID for submission
    document.getElementById('edit-note-title').value = note.title;
    document.getElementById('edit-note-tags').value = note.tags.join(', ');

    const contentTextarea = document.getElementById('edit-note-content');
    contentTextarea.value = note.content;

    // Instantiate the editor
    easyMDE = new EasyMDE({
        element: contentTextarea,
        spellChecker: false,
        status: false,
        toolbar: ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "link", "image", "|", "preview", "side-by-side", "fullscreen", "|", "guide"]
    });

    modal.showModal(); // Use the native <dialog> method to open
}

function closeEditModal() {
    const modal = document.getElementById('modal-edit-note');
    if (easyMDE) {
        easyMDE.toTextArea(); // Clean up the editor instance
        easyMDE = null;
    }
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
        content: easyMDE.value() // Get content from the editor instance
    };

    try {
        const response = await updateNote(noteId, { note: updatedNote, lane_name: null, position: null });
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
        const titleElement = noteCard.querySelector('.note-card-header h4');
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