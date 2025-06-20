const API_BASE_URL = ''; // Assuming API endpoints are relative to the root

export async function fetchLanes() {
    try {
        const response = await fetch(`${API_BASE_URL}/lanes`);
        if (!response.ok) {
            console.error('Failed to fetch lanes:', response.status, response.statusText);
            // Consider throwing an error or returning a specific error object
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching lanes:', error);
        // Consider throwing an error or returning a specific error object
        return null;
    }
}

export async function addLane(laneName) {
    try {
        const response = await fetch(`${API_BASE_URL}/lane`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: laneName.trim() })
        });
        return response; // Return the full response object for the caller to handle
    } catch (error) {
        console.error('Error creating lane:', error);
        throw error; // Re-throw the error for the caller to handle
    }
}

export async function deleteLane(laneName) {
    try {
        const encodedLaneName = encodeURIComponent(laneName);
        const response = await fetch(`${API_BASE_URL}/lane/${encodedLaneName}`, {
            method: 'DELETE'
        });
        return response; // Return the full response object for the caller to handle
    } catch (error) {
        console.error(`Error deleting lane "${laneName}":`, error);
        throw error; // Re-throw the error for the caller to handle
    }
}

export async function updateLanePosition(laneName, newPosition) {
    try {
        const encodedLaneName = encodeURIComponent(laneName);
        const response = await fetch(`${API_BASE_URL}/lane/${encodedLaneName}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            // The backend expects a Lane object and a position. We only care about the name and position here.
            body: JSON.stringify({ lane: { name: laneName, notes: [] }, position: newPosition })
        });
        return response; // Return the full response object for the caller to handle
    } catch (error) {
        console.error(`Error updating lane "${laneName}" position to ${newPosition}:`, error);
        throw error; // Re-throw the error for the caller to handle
    }
}

export async function addNote(laneName, title, content = "", tags = []) {
    try {
        const response = await fetch(`${API_BASE_URL}/note`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lane_name: laneName,
                note: { title, content, tags } // id is omitted, backend generates it
            })
        });
        return response; // Return the full response object for the caller to handle
    } catch (error) {
        console.error(`Error adding note to lane "${laneName}":`, error);
        throw error; // Re-throw the error for the caller to handle
    }
}