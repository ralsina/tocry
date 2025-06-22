const API_BASE_URL = ''; // Assuming API endpoints are relative to the root

export async function fetchLanes() {
    try {
        const response = await fetch(`${API_BASE_URL}/lanes`);
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: response.statusText }));
            const error = new Error(`Failed to fetch lanes: ${response.status} ${response.statusText} - ${errorBody.error || errorBody.message}`);
            error.status = response.status; // Attach status for easier handling
            error.body = errorBody; // Attach full body for more details
            throw error;
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching lanes:', error);
        throw error; // Re-throw to be caught by initializeLanes
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

export async function updateLane(oldName, laneData, position) {
    try {
        const encodedOldName = encodeURIComponent(oldName);
        const response = await fetch(`${API_BASE_URL}/lane/${encodedOldName}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ lane: laneData, position: position })
        });
        return response;
    } catch (error) {
        console.error(`Error updating lane "${oldName}":`, error);
        throw error;
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

export async function updateNote(noteId, { note, lane_name, position }) {
    try {
        const response = await fetch(`${API_BASE_URL}/note/${noteId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ note, lane_name, position })
        });
        return response;
    } catch (error) {
        console.error(`Error updating note "${noteId}":`, error);
        throw error;
    }
}

export async function deleteNote(noteId) {
    try {
        const response = await fetch(`${API_BASE_URL}/note/${noteId}`, {
            method: 'DELETE'
        });
        return response; // Return the full response object for the caller to handle
    } catch (error) {
        console.error(`Error deleting note "${noteId}":`, error);
        throw error; // Re-throw the error for the caller to handle
    }
}

export async function uploadImage(formData) {
    try {
        const response = await fetch(`${API_BASE_URL}/upload/image`, {
            method: 'POST',
            body: formData // No 'Content-Type' header, browser sets it for multipart/form-data
        });
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: response.statusText }));
            const error = new Error(`Failed to upload image: ${response.status} ${response.statusText} - ${errorBody.error || errorBody.message}`);
            error.status = response.status;
            error.body = errorBody;
            throw error;
        }
        return await response.json(); // Should contain { "url": "..." }
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}
