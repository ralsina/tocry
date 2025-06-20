import { fetchLanes, addLane, deleteLane, updateLanePosition } from './api.js';
import { renderLanes } from './render.js';

// Global variable to store the name of the lane being dragged
let draggedLaneName = null;

async function initializeLanes() {
    const lanesContainer = document.getElementById('lanes-container');
    try {
        const lanes = await fetchLanes();
        if (lanes) {
            renderLanes(lanes, handleDeleteLaneRequest, laneDragAndDropCallbacks); // Pass delete and drag/drop handlers
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

// --- Drag and Drop Handlers for Lanes ---

function handleLaneDragStart(event) {
    // Store the name of the lane being dragged
    draggedLaneName = event.currentTarget.dataset.laneName;
    // Set data for the drag operation (optional, but good practice)
    event.dataTransfer.setData('text/plain', draggedLaneName);
    // Add a class to the dragged element for visual feedback
    event.currentTarget.classList.add('lane--dragging');
    console.log(`Started dragging lane: ${draggedLaneName}`);
}

function handleLaneDragOver(event) {
    // Prevent default to allow dropping
    event.preventDefault();
    // Add visual feedback to the potential drop target
    if (event.currentTarget.dataset.laneName !== draggedLaneName) {
        event.currentTarget.classList.add('lane--drag-over');
    }
}

function handleLaneDragLeave(event) {
    // Remove visual feedback when dragging leaves the target
    event.currentTarget.classList.remove('lane--drag-over');
}

async function handleLaneDrop(event) {
    event.preventDefault(); // Prevent default browser behavior (e.g., opening as link)
    event.currentTarget.classList.remove('lane--drag-over'); // Remove visual feedback

    const draggedLaneNameFromData = event.dataTransfer.getData('text/plain');
    const targetLaneName = event.currentTarget.dataset.laneName;

    // It's possible draggedLaneNameFromData is empty if the drag originated from outside the browser.
    if (!draggedLaneNameFromData || draggedLaneNameFromData === targetLaneName) {
        console.log('Dropped on the same lane or invalid drag data. No change.');
        return; // No change needed if dropped on itself
    }

    console.log(`Dropped lane "${draggedLaneNameFromData}" onto "${targetLaneName}"`);

    try {
        // Get the current order of lanes to determine the new index
        const currentLanes = await fetchLanes(); // Re-fetch to get the latest order
        if (!currentLanes) {
            alert('Could not get current lane order to perform move.');
            return;
        }

        const targetIndex = currentLanes.findIndex(lane => lane.name === targetLaneName);
        if (targetIndex === -1) {
            alert(`Target lane "${targetLaneName}" not found.`);
            return;
        }

        // Call the API to update the lane's position
        const response = await updateLanePosition(draggedLaneNameFromData, targetIndex);

        if (response.ok) {
            console.log(`Lane "${draggedLaneNameFromData}" moved successfully to position ${targetIndex}.`);
            await initializeLanes(); // Re-render the board to reflect the new order
        } else {
            const errorData = await response.json().catch(() => ({ error: "Failed to parse error response from server" }));
            console.error(`Failed to move lane "${draggedLaneNameFromData}":`, response.status, response.statusText, errorData.error);
            alert(`Failed to move lane: ${errorData.error || response.statusText}`);
        }
    } catch (error) {
        console.error('Error during lane move operation:', error);
        alert("An error occurred while trying to move the lane.");
    }
}

function handleLaneDragEnd(event) {
    event.currentTarget.classList.remove('lane--dragging'); // Clean up dragging style
    draggedLaneName = null; // Reset dragged lane state
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