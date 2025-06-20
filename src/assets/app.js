import { fetchLanes, addLane, deleteLane, updateLanePosition, addNote } from './api.js';
import { renderLanes } from './render.js';

async function initializeLanes() {
    const lanesContainer = document.getElementById('lanes-container');
    try {
        const lanes = await fetchLanes();
        if (lanes) {
            renderLanes(lanes, handleDeleteLaneRequest, handleAddNoteRequest, laneDragAndDropCallbacks);
        } else {
            if (lanesContainer) lanesContainer.innerHTML = '<p>Error loading lanes. Could not fetch data.</p>';
        }
    } catch (error) {
        // Error already logged in fetchLanes, display message to user
        if (lanesContainer) lanesContainer.innerHTML = '<p>Error loading lanes. An exception occurred.</p>';
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

document.addEventListener('DOMContentLoaded', () => {
    initializeLanes();
    const addLaneButton = document.querySelector('button[aria-label="Add new item"]');
    if (addLaneButton) {
        addLaneButton.addEventListener('click', handleAddLaneButtonClick);
    }
});