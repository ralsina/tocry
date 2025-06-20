import { fetchLanes, addLane, deleteLane } from './api.js';
import { renderLanes } from './render.js';

async function initializeLanes() {
    const lanesContainer = document.getElementById('lanes-container');
    try {
        const lanes = await fetchLanes();
        if (lanes) {
            renderLanes(lanes, handleDeleteLaneRequest); // Pass the delete handler
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

document.addEventListener('DOMContentLoaded', () => {
    initializeLanes();
    const addLaneButton = document.querySelector('button[aria-label="Add new item"]');
    if (addLaneButton) {
        addLaneButton.addEventListener('click', handleAddLaneButtonClick);
    }
});