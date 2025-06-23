import { fetchBoards, createBoard, fetchLanes, addLane, deleteLane, updateLanePosition, updateLane, addNote, updateNote, deleteNote, uploadImage } from './api.js';
import { renderLanes, createNoteCardElement } from './render.js';

const colorSchemes = {
    'Amber': { // This will load pico.amber.min.css
        light: { 'primary-rgb': '255, 193, 7' },
        dark: { 'primary-rgb': '255, 202, 44' }
    },
    'Blue': { // This will load pico.blue.min.css
        light: { 'primary-rgb': '0, 123, 255' },
        dark: { 'primary-rgb': '55, 125, 255' }
    },
    'Cyan': { // This will load pico.cyan.min.css
        light: { 'primary-rgb': '23, 162, 184' },
        dark: { 'primary-rgb': '79, 195, 214' }
    },
    'Default': { // This will load pico.min.css
        light: { 'primary-rgb': '29, 136, 254' },
        dark: { 'primary-rgb': '82, 157, 255' }
    },
    'Fuchsia': { // This will load pico.fuchsia.min.css
        light: { 'primary-rgb': '255, 0, 255' },
        dark: { 'primary-rgb': '255, 102, 255' }
    },
    'Grey': { // This will load pico.grey.min.css
        light: { 'primary-rgb': '115, 130, 144' },
        dark: { 'primary-rgb': '161, 172, 184' }
    },
    'Green': { // This will load pico.green.min.css
        light: { 'primary-rgb': '56, 142, 60' },
        dark: { 'primary-rgb': '102, 187, 106' }
    },
    'Indigo': { // This will load pico.indigo.min.css
        light: { 'primary-rgb': '102, 16, 242' },
        dark: { 'primary-rgb': '154, 104, 247' }
    },
    'Jade': { // This will load pico.jade.min.css
        light: { 'primary-rgb': '0, 168, 107' },
        dark: { 'primary-rgb': '0, 200, 130' }
    },
    'Lime': { // This will load pico.lime.min.css
        light: { 'primary-rgb': '205, 220, 57' },
        dark: { 'primary-rgb': '220, 231, 117' }
    },
    'Orange': { // This will load pico.orange.min.css
        light: { 'primary-rgb': '255, 152, 0' },
        dark: { 'primary-rgb': '255, 183, 77' }
    },
    'Pink': { // This will load pico.pink.min.css
        light: { 'primary-rgb': '233, 30, 99' },
        dark: { 'primary-rgb': '244, 143, 177' }
    },
    'Pumpkin': { // This will load pico.pumpkin.min.css
        light: { 'primary-rgb': '255, 112, 0' },
        dark: { 'primary-rgb': '255, 144, 51' }
    },
    'Purple': { // This will load pico.purple.min.css
        light: { 'primary-rgb': '156, 39, 176' },
        dark: { 'primary-rgb': '186, 104, 200' }
    },
    'Red': { // This will load pico.red.min.css
        light: { 'primary-rgb': '211, 47, 47' },
        dark: { 'primary-rgb': '255, 82, 82' }
    },
    'Sand': { // This will load pico.sand.min.css
        light: { 'primary-rgb': '215, 194, 169' },
        dark: { 'primary-rgb': '227, 211, 189' }
    },
    'Slate': { // This will load pico.slate.min.css
        light: { 'primary-rgb': '82, 105, 129' },
        dark: { 'primary-rgb': '132, 151, 171' }
    },
    'Violet': { // This will load pico.violet.min.css
        light: { 'primary-rgb': '126, 87, 194' },
        dark: { 'primary-rgb': '179, 157, 219' }
    },
    'Yellow': { // This will load pico.yellow.min.css
        light: { 'primary-rgb': '255, 235, 59' },
        dark: { 'primary-rgb': '255, 241, 118' }
    },
    'Zinc': { // This will load pico.zinc.min.css
        light: { 'primary-rgb': '112, 112, 112' },
        dark: { 'primary-rgb': '144, 144, 144' }
    }
};

/**
 * Displays a custom confirmation dialog.
 * @param {string} message The message to display in the dialog.
 * @param {string} title The title of the dialog. Defaults to 'Confirm Action'.
 * @returns {Promise<boolean>} A promise that resolves to true if confirmed, false if canceled.
 */
function showConfirmation(message, title = 'Confirm Action') {
    return new Promise((resolve) => {
        const dialog = document.getElementById('custom-confirm-dialog');
        const titleElement = document.getElementById('confirm-dialog-title');
        const messageElement = document.getElementById('confirm-dialog-message');
        const okButton = document.getElementById('confirm-dialog-ok-btn');
        const cancelButton = document.getElementById('confirm-dialog-cancel-btn');

        if (!dialog || !titleElement || !messageElement || !okButton || !cancelButton) {
            console.error('Confirmation dialog elements not found.');
            return resolve(window.confirm(message)); // Fallback to native confirm
        }

        titleElement.textContent = title;
        messageElement.textContent = message;

        // Clear previous listeners to prevent multiple calls
        okButton.onclick = null;
        cancelButton.onclick = null;

        okButton.onclick = () => { dialog.close(); resolve(true); };
        cancelButton.onclick = () => { dialog.close(); resolve(false); };

        dialog.showModal();
    });
}

/**
 * Displays a custom prompt dialog.
 * @param {string} message The message to display in the dialog.
 * @param {string} title The title of the dialog.
 * @param {string} [defaultValue=''] The default value for the input field.
 * @returns {Promise<string|null>} A promise that resolves with the input value, or null if canceled.
 */
function showPrompt(message, title, defaultValue = '') {
    return new Promise((resolve) => {
        const dialog = document.getElementById('custom-prompt-dialog');
        const titleElement = document.getElementById('prompt-dialog-title');
        const messageElement = document.getElementById('prompt-dialog-message');
        const form = document.getElementById('prompt-dialog-form');
        const input = document.getElementById('prompt-dialog-input');
        const okButton = document.getElementById('prompt-dialog-ok-btn');
        const cancelButton = document.getElementById('prompt-dialog-cancel-btn');

        if (!dialog || !titleElement || !messageElement || !form || !input || !okButton || !cancelButton) {
            console.error('Prompt dialog elements not found.');
            return resolve(window.prompt(message, defaultValue)); // Fallback to native prompt
        }

        titleElement.textContent = title;
        messageElement.textContent = message;
        input.value = defaultValue;

        const closeDialog = () => { dialog.close(); };

        form.onsubmit = (e) => { e.preventDefault(); closeDialog(); resolve(input.value); };
        cancelButton.onclick = () => { closeDialog(); resolve(null); };

        dialog.addEventListener('close', () => { // Ensure listeners are cleaned up
            form.onsubmit = null;
            cancelButton.onclick = null;
        }, { once: true });

        dialog.showModal();
        input.focus();
        input.select();
    });
}

/**
 * Displays a toast notification.
 * @param {string} message The message to display.
 * @param {string} type The type of notification ('info' or 'error'). Defaults to 'error'.
 */
function showNotification(message, type = 'error') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `notification-toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Trigger the animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10); // Small delay to allow the element to be added to the DOM first

    // Remove the toast after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 5000);
}

// Function to get the board name from the URL path (e.g., /b/my_board)
function getBoardNameFromURL() {
    const pathParts = window.location.pathname.split('/');
    // URL is /b/{board_name}, so parts are ["", "b", "{board_name}"]
    if (pathParts[1] === 'b' && pathParts[2]) {
        return decodeURIComponent(pathParts[2]);
    }
    return null; // No board name in URL
}


let currentLanes = [];    // Cache for the current state of lanes
let currentBoardName = 'default'; // Declare and initialize currentBoardName globally
let previousBoardSelection = 'default'; // To revert to if "New board" is cancelled
// --- Board Selector ---
async function initializeBoardSelector() {
    const boardSelector = document.getElementById('board-selector');
    if (!boardSelector) return;

    try {
        const boards = await fetchBoards();
        boardSelector.innerHTML = ''; // Clear existing options

        if (boards.length === 0) {
            // Handle case where no boards exist (e.g., first run)
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No boards available';
            boardSelector.appendChild(option);
            boardSelector.disabled = true;
            showNotification('No boards found. Please create a new board.', 'info');
            return;
        }

        boards.forEach(boardName => {
            const option = document.createElement('option');
            option.value = boardName;
            option.textContent = `Board: ${boardName}`;
            boardSelector.appendChild(option);
        });

        // Add the "New board..." option
        const newBoardOption = document.createElement('option');
        newBoardOption.value = '__NEW_BOARD__';
        newBoardOption.textContent = 'New board...';
        boardSelector.appendChild(newBoardOption);

        // Set initial selection based on currentBoardName (default or from URL later)
        boardSelector.value = currentBoardName;
        if (!boardSelector.value) { // If currentBoardName is not in the list, select the first one
            boardSelector.value = boards[0];
            currentBoardName = boards[0];
        }
        previousBoardSelection = boardSelector.value; // Store current selection
        boardSelector.disabled = false;

        boardSelector.addEventListener('change', async (event) => { // Make this async
            const selectedValue = event.target.value;
            if (selectedValue === '__NEW_BOARD__') {
                // If "New board..." is selected, trigger the add board flow
                // Store the current URL state before the prompt, so we can revert if cancelled
                history.pushState({ board: previousBoardSelection }, '', `/b/${previousBoardSelection}`);
                // Revert the selector immediately to the previous valid board
                boardSelector.value = previousBoardSelection;

                await handleAddBoardButtonClick();
                // After attempting to add, revert the selector to the previous valid board
                boardSelector.value = previousBoardSelection;
            } else {
                previousBoardSelection = selectedValue; // Update previous selection
                initializeLanes(selectedValue); // Load lanes for the selected board
            }
            // Update the URL to reflect the selected board
            history.pushState({ board: selectedValue }, '', `/b/${selectedValue}`);
        });
    } catch (error) {
        console.error('Error initializing board selector:', error);
        showNotification('Failed to load boards. Please try again.', 'error');
        boardSelector.disabled = true;
    }
}

async function initializeLanes(boardName) {
    // If boardName is not provided, try to get it from the URL, otherwise use default
    if (!boardName) {
        const nameFromURL = getBoardNameFromURL();
        boardName = nameFromURL || 'default';
        // If the URL has no board name, redirect to /b/default
        if (!nameFromURL) history.replaceState({ board: boardName }, '', `/b/${boardName}`);
    }
    const lanesContainer = document.getElementById('lanes-container');
    currentBoardName = boardName; // Update the global currentBoardName
    try {
        const lanes = await fetchLanes(currentBoardName);
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
    const laneName = await showPrompt("Enter the name for the new lane:", "Add New Lane");

    if (laneName !== null && laneName.trim() !== "") { // Check for null and empty string
        try {
            const response = await addLane(currentBoardName, laneName.trim());
            if (response.ok) { // Check the response status code
                console.log('Lane created successfully');
                await initializeLanes(); // Re-fetch and render all lanes
            } else {
                const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
                console.error('Failed to create lane:', response.status, response.statusText, errorData.error);
                showNotification(`Failed to create lane: ${errorData.error || response.statusText}`);
            }
        } catch (error) {
            console.error('Error creating lane:', error);
            showNotification("An error occurred while trying to create the lane.");
        }
    }
}

async function handleAddBoardButtonClick() {
    const boardName = await showPrompt("Enter the name for the new board:", "Create New Board");

    if (boardName !== null && boardName.trim() !== "") {
        try {
            const trimmedBoardName = boardName.trim();
            const response = await createBoard(trimmedBoardName);
            if (response.ok) {
                showNotification(`Board "${trimmedBoardName}" created successfully.`, 'info');
                history.pushState({ board: trimmedBoardName }, '', `/b/${trimmedBoardName}`); // Update URL
                currentBoardName = trimmedBoardName; // Update currentBoardName BEFORE re-initializing the selector
                await initializeBoardSelector(); // Re-populate selector and set its value
                initializeLanes(trimmedBoardName); // Load the new board
            } else {
                const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
                showNotification(`Failed to create board: ${errorData.error || response.statusText}`);
            }
        } catch (error) {
            console.error('Error creating board:', error);
            showNotification("An error occurred while trying to create the board.");
        }
    }
}

// Handler for delete lane requests, passed as a callback to renderLanes
async function handleDeleteLaneRequest(laneName) {
    if (await showConfirmation(`Are you sure you want to delete the lane "${laneName}"?`, "Delete Lane")) {
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

            const response = await deleteLane(currentBoardName, laneName);
            if (response.ok) {
                console.log(`Lane "${laneName}" deleted successfully.`);
                await initializeLanes(); // Re-fetch and render all lanes
            } else {
                const errorData = await response.json().catch(() => ({ error: "Failed to parse error response from server" }));
                console.error(`Failed to delete lane "${laneName}":`, response.status, response.statusText, errorData.error);
                showNotification(`Failed to delete lane: ${errorData.error || response.statusText}`);
            }
        } catch (error) {
            // This catch is for network errors or if deleteLane itself throws
            console.error('Error during delete lane operation:', error);
            showNotification("An error occurred while trying to delete the lane.");
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
            showNotification(`Error: Could not find lane "${oldName}" to determine its position. Refreshing.`);
            return initializeLanes(); // Refresh to be safe
        }

        const updatedLaneData = { ...laneToUpdate, name: trimmedNewName };

        // OPTIMISTIC UI UPDATE: Update the name in the local cache immediately.
        // Since render.js uses currentLanes, this will update the displayed name.
        laneToUpdate.name = trimmedNewName;

        const response = await updateLane(currentBoardName, oldName, updatedLaneData, currentPosition);
        if (response.ok) {
            // On success, the UI is already updated optimistically, so no full re-render is needed.
            console.log(`Lane "${oldName}" successfully renamed to "${trimmedNewName}".`);
        } else {
            // On failure, alert the user and re-render to revert the optimistic UI change.
            const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
            showNotification(`Failed to rename lane: ${errorData.error || response.statusText}`);
            await initializeLanes(); // Revert UI on failure
        }
    } catch (error) {
        showNotification("An error occurred while trying to rename the lane.");
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

        const response = await updateNote(currentBoardName, noteToUpdate.id, { note: updatedNoteData, lane_name: null, position: null });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
            showNotification(`Failed to rename note: ${errorData.error || response.statusText}`);
            await initializeLanes(); // Revert UI on failure
        } else {
            console.log(`Note "${noteToUpdate.id}" title updated successfully.`);
            // UI is already updated, no full re-render needed.
        }
    } catch (error) {
        showNotification("An error occurred while trying to rename the note. Reverting changes.");
        await initializeLanes(); // Revert UI on failure
    }
}

// Handler for persisting the expanded/collapsed state of a note
async function handleToggleNoteRequest(noteToUpdate, isExpanded) {
    const updatedNoteData = { ...noteToUpdate, expanded: isExpanded };

    try {
        const response = await updateNote(currentBoardName, noteToUpdate.id, { note: updatedNoteData, lane_name: null, position: null });

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
            showNotification(`Failed to save note state: ${errorData.error || response.statusText}`);
            await initializeLanes();
        }
    } catch (error) {
        showNotification('An error occurred while saving the note state. Reverting changes.');
        await initializeLanes(); // Revert UI on failure
    }
}

// Handler for adding a new note to a lane
async function handleAddNoteRequest(laneName) {
    const noteTitle = await showPrompt(`Enter title for new note in "${laneName}":`, "Add New Note");
    if (noteTitle !== null && noteTitle.trim() !== "") {
        try { // Placeholder content and tags
            const response = await addNote(currentBoardName, laneName, noteTitle.trim(), "", []);
            if (response.ok) {
                console.log(`Note "${noteTitle}" added successfully to lane "${laneName}".`);
                await initializeLanes(); // Re-fetch and render all lanes
            } else {
                const errorData = await response.json().catch(() => ({ error: "Failed to parse error response from server" }));
                console.error(`Failed to add note to lane "${laneName}":`, response.status, response.statusText, errorData.error);
                showNotification(`Failed to add note: ${errorData.error || response.statusText}`);
            }
        } catch (error) {
            console.error('Error during add note operation:', error);
            showNotification("An error occurred while trying to add the note.");
        }
    } else if (noteTitle !== null) {
        showNotification("Note title cannot be empty.");
    }
}

// Handler for delete note requests
async function handleDeleteNoteRequest(noteId, noteTitle) {
    if (await showConfirmation(`Are you sure you want to delete the note "${noteTitle}"?`, "Delete Note")) {
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
            const response = await deleteNote(currentBoardName, noteId);
            if (response.ok) {
                console.log(`Note "${noteTitle}" (ID: ${noteId}) deleted successfully.`);
                await initializeLanes(); // Re-fetch and render all lanes
            } else {
                const errorData = await response.json().catch(() => ({ error: "Failed to parse error response from server" }));
                console.error(`Failed to delete note "${noteTitle}":`, response.status, response.statusText, errorData.error);
                showNotification(`Failed to delete note: ${errorData.error || response.statusText}`);
                await initializeLanes(); // Revert UI on failure
            }
        } catch (error) {
            console.error('Error during delete note operation:', error);
            showNotification("An error occurred while trying to delete the note.");
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
        showNotification("Pasted text must have at least one line to be used as a title.");
        return;
    }

    try {
        const response = await addNote(currentBoardName, laneName, title, content, []);
        if (response.ok) {
            console.log(`Note "${title}" created from paste in lane "${laneName}".`);
            await initializeLanes();
        } else {
            const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
            showNotification(`Failed to create note from paste: ${errorData.error || response.statusText}`);
        }
    } catch (error) {
        console.error('Error creating note from paste:', error);
        showNotification("An error occurred while trying to create the note from paste.");
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

        const addNoteResponse = await addNote(currentBoardName, laneName, title, content, []);
        if (addNoteResponse.ok) {
            console.log(`Note "${title}" created from pasted image in lane "${laneName}".`);
            await initializeLanes();
        } else {
            const errorData = await addNoteResponse.json().catch(() => ({ error: "Failed to parse error response" }));
            showNotification(`Failed to create note from pasted image: ${errorData.error || addNoteResponse.statusText}`);
        }
    } catch (error) {
        console.error('Error creating note from pasted image:', error);
        showNotification("An error occurred while trying to create the note from the pasted image.");
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
                    showNotification(`Image upload failed: ${error.message}`);
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

    const updatedNoteData = {
        title: document.getElementById('edit-note-title').value,
        tags: document.getElementById('edit-note-tags').value.split(',').map(t => t.trim()).filter(Boolean),
        content: toastuiEditor.getMarkdown() // Get markdown content from Toast UI Editor
    };

    // Find the note in the cache and its lane
    let noteInCache = null;
    let laneOfNote = null;
    for (const lane of currentLanes) {
        noteInCache = lane.notes.find(n => n.id === noteId);
        if (noteInCache) {
            laneOfNote = lane;
            break;
        }
    }

    if (!noteInCache || !laneOfNote) {
        showNotification("Error: Could not find the note to update. Refreshing.");
        return initializeLanes();
    }

    // Update the note object in the cache with all new data
    Object.assign(noteInCache, updatedNoteData);

    // OPTIMISTIC UI UPDATE: Re-render the card to reflect all changes.
    // This is more robust than trying to patch the DOM manually.
    const oldNoteCardElement = document.querySelector(`.note-card[data-note-id="${noteId}"]`);
    if (oldNoteCardElement) {
        const callbacks = { onDeleteNote: handleDeleteNoteRequest, onEditNote: handleEditNoteRequest, onUpdateNoteTitle: handleUpdateNoteTitleRequest, onToggleNote: handleToggleNoteRequest };
        const newNoteCardElement = createNoteCardElement(noteInCache, laneOfNote.name, callbacks, { note: noteDragAndDropCallbacks });
        oldNoteCardElement.replaceWith(newNoteCardElement);
    }

    try {
        const { id, ...notePayload } = noteInCache;
        const response = await updateNote(currentBoardName, noteId, { note: notePayload, lane_name: null, position: null });
        if (response.ok) {
            closeEditModal();
            console.log(`Note "${noteId}" updated successfully.`);
        } else {
            showNotification('Failed to save note. Please try again.');
            await initializeLanes(); // Revert UI on failure
        }
    } catch (error) {
        showNotification('An error occurred while saving the note.');
        await initializeLanes(); // Revert UI on failure
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

    // Use the cache to determine positions
    const draggedLaneIndex = currentLanes.findIndex(lane => lane.name === draggedLaneName);
    const targetLaneIndex = currentLanes.findIndex(lane => lane.name === targetLaneName);

    if (draggedLaneIndex === -1 || targetLaneIndex === -1) {
        showNotification('Error finding lanes to move. Refreshing.');
        return initializeLanes();
    }

    const isMovingRight = draggedLaneIndex < targetLaneIndex;

    // OPTIMISTIC UI UPDATE: Reorder in the DOM
    const draggedLaneElement = document.querySelector(`.lane[data-lane-name="${draggedLaneName}"]`);
    const targetLaneElement = document.querySelector(`.lane[data-lane-name="${targetLaneName}"]`);

    if (draggedLaneElement && targetLaneElement) {
        if (isMovingRight) {
            // When moving right, insert *after* the target.
            targetLaneElement.after(draggedLaneElement);
        } else {
            // When moving left, insert *before* the target.
            targetLaneElement.before(draggedLaneElement);
        }
    } else {
        // If something is wrong with the DOM, fall back to full re-render
        return initializeLanes();
    }

    // Calculate the new position for the API call.
    // The backend expects the position in the list *after* the dragged item is removed.
    const tempLanes = currentLanes.filter(lane => lane.name !== draggedLaneName);
    const targetIndexInTemp = tempLanes.findIndex(lane => lane.name === targetLaneName);
    const newPosition = isMovingRight ? targetIndexInTemp + 1 : targetIndexInTemp;

    try {
        const response = await updateLanePosition(currentBoardName, draggedLaneName, newPosition);
        if (response.ok) {
            // The API call was successful. The UI is already updated optimistically.
            // We'll call initializeLanes to sync the cache and ensure consistency.
            await initializeLanes();
        } else {
            const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
            showNotification(`Failed to move lane: ${errorData.error || response.statusText}`);
            // Revert UI on failure
            await initializeLanes();
        }
    } catch (error) {
        showNotification("An error occurred while trying to move the lane.");
        // Revert UI on failure
        await initializeLanes();
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
    // Check if we are dragging a note by looking for our specific data type.
    // The note drag handler sets 'application/json', but the lane handler does not.
    const isNoteDrag = event.dataTransfer.types.includes('application/json');

    // If we are NOT dragging a note, do not handle the event here.
    // Let it bubble up to the parent lane's dragover handler.
    if (!isNoteDrag) {
        return;
    }

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

    const allLanes = await fetchLanes(currentBoardName);
    if (!allLanes) { return showNotification('Could not fetch board data to complete the move.'); }

    const originalLaneObject = allLanes.find(lane => lane.name === originalLane);
    const originalNoteObject = originalLaneObject?.notes.find(note => note.id === noteId);
    if (!originalNoteObject) { return showNotification('Could not find the original note data.'); }

    const originalPositionInModel = originalLaneObject.notes.findIndex(note => note.id === noteId);
    if (targetLaneName === originalLane && newPosition === originalPositionInModel) { return; }

    // OPTIMISTIC UI UPDATE: Update the currentLanes cache to reflect the move.
    // The DOM is already reordered by the dragover event.
    if (targetLaneName !== originalLane) {
        // Move between lanes
        const targetLaneObject = currentLanes.find(lane => lane.name === targetLaneName);
        if (!targetLaneObject) {
            showNotification('Error: Target lane not found in cache. Refreshing.');
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
        const response = await updateNote(currentBoardName, noteId, { note: originalNoteObject, lane_name: targetLaneName, position: newPosition });
        if (response.ok) {
            await initializeLanes();
        } else {
            const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
            showNotification(`Failed to move note: ${errorData.error || response.statusText}`);
            await initializeLanes();
        }
    } catch (error) {
        showNotification("An error occurred while trying to move the note.");
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
 * Applies the given color scheme to the document.
 * @param {string} schemeName The name of the scheme to apply (e.g., 'Pico', 'Green').
 */
function applyColorScheme(schemeName) { // schemeName will be 'Default', 'Amber', 'Cyan', etc.
    const scheme = colorSchemes[schemeName] || colorSchemes['Default'];
    if (!scheme) {
        console.warn(`Color scheme "${schemeName}" not found.`);
        return;
    }

    const picoThemeLink = document.querySelector('link[href*="pico.min.css"], link[href*="pico."][href*=".min.css"]');
    if (!picoThemeLink) {
        console.error('Pico.css link element not found!');
        return;
    }

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const colors = scheme[currentTheme];

    // Update the Pico.css stylesheet link
    const picoCssFileName = schemeName === 'Default' ? 'pico.min.css' : `pico.${schemeName.toLowerCase()}.min.css`;
    picoThemeLink.href = `https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/${picoCssFileName}`;

    // Set the --primary-rgb variable for custom ToCry styles
    document.documentElement.style.setProperty('--primary-rgb', colors['primary-rgb']);

    // Update the color swatch next to the selector
    const currentColorSwatch = document.getElementById('current-color-swatch');
    if (currentColorSwatch) {
        // Use the primary-rgb from the *light* theme of the selected scheme for the swatch,
        // as the swatch itself represents the color scheme's primary color, not the current app theme.
        const lightThemePrimaryRgb = colorSchemes[schemeName].light['primary-rgb'];
        currentColorSwatch.style.backgroundColor = `rgb(${lightThemePrimaryRgb})`;
    }
}

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

    // Re-apply the current color scheme to get the correct light/dark variants
    const colorSchemeSwitcher = document.getElementById('color-scheme-switcher');
    if (colorSchemeSwitcher && colorSchemeSwitcher.value) {
        applyColorScheme(colorSchemeSwitcher.value);
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
    // --- Theme & Color Scheme Setup ---
    const themeSwitcher = document.getElementById('theme-switcher');
    const colorSchemeSwitcher = document.getElementById('color-scheme-switcher');

    // Populate color scheme switcher
    if (colorSchemeSwitcher) {
        for (const schemeName in colorSchemes) {
            const option = document.createElement('option');
            option.value = schemeName;
            option.textContent = schemeName;
            colorSchemeSwitcher.appendChild(option);
        }
    }

    // Set initial color scheme from localStorage
    const savedScheme = localStorage.getItem('colorScheme') || 'Default';
    if (colorSchemeSwitcher) {
        colorSchemeSwitcher.value = savedScheme;
    }

    // Set initial theme from localStorage (this will also trigger the initial color scheme application via applyTheme)
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);

    // Add event listeners
    if (themeSwitcher) {
        themeSwitcher.addEventListener('click', handleThemeSwitch);
    }

    // Initialize and set up board selector
    // Get initial board name from URL or default
    const initialBoardName = getBoardNameFromURL();
    if (initialBoardName) {
        currentBoardName = initialBoardName;
        previousBoardSelection = initialBoardName;
    }
    initializeBoardSelector();
    initializeLanes();
    const addLaneButton = document.getElementById('add-lane-btn');
    if (addLaneButton) {
        addLaneButton.addEventListener('click', handleAddLaneButtonClick);
    }

    const searchInput = document.getElementById('search');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearchInput);
    }

    if (colorSchemeSwitcher) {
        colorSchemeSwitcher.addEventListener('change', (event) => {
            const newScheme = event.target.value;
            localStorage.setItem('colorScheme', newScheme);
            applyColorScheme(newScheme);
        });
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

    // --- Click-to-show for color scheme selector ---
    const themeSwitcherContainer = document.querySelector('.theme-and-color-switcher');
    const colorSwatch = document.getElementById('current-color-swatch');

    if (themeSwitcherContainer && colorSwatch) {
        colorSwatch.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent the document click listener from firing immediately
            themeSwitcherContainer.classList.toggle('is-open');
        });

        // Add a listener to the whole document to close the selector if the user clicks away
        document.addEventListener('click', (e) => {
            if (!themeSwitcherContainer.contains(e.target) && themeSwitcherContainer.classList.contains('is-open')) {
                themeSwitcherContainer.classList.remove('is-open');
            }
        });
    }

    // --- Auto-hide footer ---
    const footer = document.querySelector(".page-footer");
    if (footer) {
        // Wait 10 seconds before enabling the auto-hide feature
        setTimeout(() => {
            // Hide the footer to start
            footer.classList.add("page-footer--hidden");

            let isFooterVisible = false;

            // Listen for mouse movement on the whole document
            document.addEventListener("mousemove", (e) => {
                // Define a trigger zone at the bottom of the viewport.
                // The footer's own height is a good trigger size.
                const triggerZoneHeight =
                    footer.offsetHeight > 0 ? footer.offsetHeight : 50;
                const isMouseNearBottom =
                    e.clientY > window.innerHeight - triggerZoneHeight;

                if (isMouseNearBottom) {
                    // If mouse is in the zone, show the footer
                    if (!isFooterVisible) {
                        footer.classList.remove("page-footer--hidden");
                        isFooterVisible = true;
                    }
                } else {
                    // If mouse is outside the zone, hide the footer
                    if (isFooterVisible) {
                        footer.classList.add("page-footer--hidden");
                        isFooterVisible = false;
                    }
                }
            });

            // A fallback for when the mouse leaves the window entirely
            document.documentElement.addEventListener("mouseleave", () => {
                if (isFooterVisible) {
                    footer.classList.add("page-footer--hidden");
                    isFooterVisible = false;
                }
            });
        }, 10000); // 10 seconds
    }
});
