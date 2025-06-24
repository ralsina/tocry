// Assuming API endpoints are relative to the root
import { state } from './features/state.js'; const API_BASE_URL = ''

export async function fetchBoards () {
  try {
    const response = await fetch(`${API_BASE_URL}/boards`)
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: response.statusText, error: 'Failed to parse error response' }))
      const error = new Error(`Failed to fetch boards: ${response.status} ${response.statusText} - ${errorBody.error || errorBody.message}`)
      error.status = response.status
      error.body = errorBody
      throw error
    }
    const data = await response.json()
    if (!Array.isArray(data)) {
      console.error('API for /boards returned non-array data:', data)
      throw new TypeError('Expected an array of boards from the API, but received different data.')
    }
    return data
  } catch (error) {
    console.error('Error fetching boards:', error)
    throw error
  }
}

export async function createBoard (boardName) {
  try {
    const response = await fetch(`${API_BASE_URL}/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: boardName })
    })
    return response
  } catch (error) {
    console.error('Error creating board:', error)
    throw error
  }
}

export async function renameBoard (oldBoardName, newBoardName) {
  try {
    const encodedOldBoardName = encodeURIComponent(oldBoardName)
    const response = await fetch(`${API_BASE_URL}/boards/${encodedOldBoardName}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ new_name: newBoardName })
    })
    return response
  } catch (error) {
    console.error(`Error renaming board "${oldBoardName}" to "${newBoardName}":`, error)
    throw error
  }
}

export async function deleteBoard (boardName) {
  try {
    const encodedBoardName = encodeURIComponent(boardName)
    const response = await fetch(`${API_BASE_URL}/boards/${encodedBoardName}`, {
      method: 'DELETE'
    })
    return response
  } catch (error) {
    console.error(`Error deleting board "${boardName}":`, error)
    throw error
  }
}

export async function fetchLanes (boardName) {
  try {
    const response = await fetch(`${API_BASE_URL}/boards/${boardName}/lanes`)
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: response.statusText, error: 'Failed to parse error response' }))
      const error = new Error(`Failed to fetch lanes: ${response.status} ${response.statusText} - ${errorBody.error || errorBody.message}`)
      error.status = response.status // Attach status for easier handling
      error.body = errorBody // Attach full body for more details
      throw error
    }
    const data = await response.json()
    // Crucial check: Ensure the data is an array before returning
    if (!Array.isArray(data)) {
      console.error(`API for /boards/${boardName}/lanes returned non-array data:`, data)
      throw new TypeError('Expected an array of lanes from the API, but received different data.')
    }
    return data
  } catch (error) {
    console.error('Error fetching lanes:', error)
    throw error // Re-throw to be caught by initializeLanes
  }
}

export async function addLane (boardName, laneName) {
  try {
    const response = await fetch(`${API_BASE_URL}/boards/${state.currentBoardName}/lane`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: laneName.trim() })
    })
    return response // Return the full response object for the caller to handle
  } catch (error) {
    console.error('Error creating lane:', error)
    throw error // Re-throw the error for the caller to handle
  }
}

export async function deleteLane (boardName, laneName) {
  try {
    const encodedLaneName = encodeURIComponent(laneName)
    const response = await fetch(`${API_BASE_URL}/boards/${state.currentBoardName}/lane/${encodedLaneName}`, {
      method: 'DELETE'
    })
    return response // Return the full response object for the caller to handle
  } catch (error) {
    console.error(`Error deleting lane "${laneName}":`, error)
    throw error // Re-throw the error for the caller to handle
  }
}

export async function updateLanePosition (boardName, laneName, newPosition) {
  try {
    const encodedLaneName = encodeURIComponent(laneName)
    const response = await fetch(`${API_BASE_URL}/boards/${state.currentBoardName}/lane/${encodedLaneName}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      // The backend expects a Lane object and a position. We only care about the name and position here.
      body: JSON.stringify({ lane: { name: laneName, notes: [] }, position: newPosition })
    })
    return response // Return the full response object for the caller to handle
  } catch (error) {
    console.error(`Error updating lane "${laneName}" position to ${newPosition}:`, error)
    throw error // Re-throw the error for the caller to handle
  }
}

export async function updateLane (boardName, oldName, laneData, position) {
  try {
    const encodedOldName = encodeURIComponent(oldName)
    const response = await fetch(`${API_BASE_URL}/boards/${state.currentBoardName}/lane/${encodedOldName}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ lane: laneData, position })
    })
    return response
  } catch (error) {
    console.error(`Error updating lane "${oldName}":`, error)
    throw error
  }
}

export async function addNote (boardName, laneName, title, content = '', tags = []) {
  try { // The boardName parameter is passed explicitly from the caller (e.g., note.js)
    const response = await fetch(`${API_BASE_URL}/boards/${boardName}/note`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        lane_name: laneName,
        note: { title, content, tags } // id is omitted, backend generates it
      })
    })
    return response // Return the full response object for the caller to handle
  } catch (error) {
    console.error(`Error adding note to lane "${laneName}":`, error)
    throw error // Re-throw the error for the caller to handle
  }
}

export async function updateNote (boardName, noteId, payload) {
  try {
    const response = await fetch(`${API_BASE_URL}/boards/${state.currentBoardName}/note/${noteId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    return response
  } catch (error) {
    console.error(`Error updating note "${noteId}":`, error)
    throw error
  }
}

export async function deleteNote (boardName, noteId) {
  try {
    const response = await fetch(`${API_BASE_URL}/boards/${state.currentBoardName}/note/${noteId}`, {
      method: 'DELETE'
    })
    return response // Return the full response object for the caller to handle
  } catch (error) {
    console.error(`Error deleting note "${noteId}":`, error)
    throw error // Re-throw the error for the caller to handle
  }
}

export async function uploadImage (formData) {
  try {
    const response = await fetch(`${API_BASE_URL}/upload/image`, {
      method: 'POST',
      body: formData // No 'Content-Type' header, browser sets it for multipart/form-data
    })
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: response.statusText }))
      const error = new Error(`Failed to upload image: ${response.status} ${response.statusText} - ${errorBody.error || errorBody.message}`)
      error.status = response.status
      error.body = errorBody
      throw error
    }
    return await response.json() // Should contain { "url": "..." }
  } catch (error) {
    console.error('Error uploading image:', error)
    throw error
  }
}
