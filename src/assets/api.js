// Assuming API endpoints are relative to the root
import { state } from './features/state.js'
import { handleApiError } from './utils/errorHandler.js'
const API_BASE_URL = ''

export async function fetchBoards () {
  const response = await fetch(`${API_BASE_URL}/boards`)
  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch boards.')
  }
  const data = await response.json()
  if (!Array.isArray(data)) {
    console.error('API for /boards returned non-array data:', data)
    throw new TypeError('Expected an array of boards from the API, but received different data.')
  }
  return data
}

export async function fetchBoardDetails (boardName) {
  const encodedBoardName = encodeURIComponent(boardName)
  const response = await fetch(`${API_BASE_URL}/boards/${encodedBoardName}`)
  if (!response.ok) {
    await handleApiError(response, `Failed to fetch details for board "${boardName}".`)
  }
  return await response.json()
}

// Helper function to get a random color scheme
export function getRandomColorScheme () {
  const colorSchemes = [
    'Amber', 'Blue', 'Cyan', 'Fuchsia', 'Grey', 'Green', 'Indigo', 'Jade',
    'Lime', 'Orange', 'Pink', 'Pumpkin', 'Purple', 'Red', 'Sand', 'Slate',
    'Violet', 'Yellow', 'Zinc'
  ]
  return colorSchemes[Math.floor(Math.random() * colorSchemes.length)]
}

export async function createBoard (boardName) {
  // Assign a random color to the new board
  const colorScheme = getRandomColorScheme()

  const response = await fetch(`${API_BASE_URL}/boards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: boardName,
      color_scheme: colorScheme
    })
  })
  return response
}

export async function renameBoard (oldBoardName, newBoardName) {
  const encodedOldBoardName = encodeURIComponent(oldBoardName)
  const response = await fetch(`${API_BASE_URL}/boards/${encodedOldBoardName}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ new_name: newBoardName })
  })
  return response
}

export async function deleteBoard (boardName) {
  const encodedBoardName = encodeURIComponent(boardName)
  const response = await fetch(`${API_BASE_URL}/boards/${encodedBoardName}`, {
    method: 'DELETE'
  })
  return response
}

export async function fetchLanes (boardName) {
  const response = await fetch(`${API_BASE_URL}/boards/${boardName}/lanes`)
  if (!response.ok) {
    await handleApiError(response, `Failed to fetch lanes for board "${boardName}".`)
  }
  const data = await response.json()
  // Crucial check: Ensure the data is an array before returning
  if (!Array.isArray(data)) {
    console.error(`API for /boards/${boardName}/lanes returned non-array data:`, data)
    throw new TypeError('Expected an array of lanes from the API, but received different data.')
  }
  return data
}

export async function addLane (boardName, laneName) {
  const response = await fetch(`${API_BASE_URL}/boards/${state.currentBoardName}/lane`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: laneName.trim() })
  })
  return response
}

export async function deleteLane (boardName, laneName) {
  const encodedLaneName = encodeURIComponent(laneName)
  const response = await fetch(`${API_BASE_URL}/boards/${state.currentBoardName}/lane/${encodedLaneName}`, {
    method: 'DELETE'
  })
  return response
}

export async function updateLanePosition (boardName, laneName, newPosition) {
  const encodedLaneName = encodeURIComponent(laneName)
  const response = await fetch(`${API_BASE_URL}/boards/${state.currentBoardName}/lane/${encodedLaneName}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    // The backend expects a Lane object and a position. We only care about the name and position here.
    body: JSON.stringify({ lane: { name: laneName, notes: [] }, position: newPosition })
  })
  return response
}

export async function updateLane (boardName, oldName, laneData, position) {
  const encodedOldName = encodeURIComponent(oldName)
  const response = await fetch(`${API_BASE_URL}/boards/${state.currentBoardName}/lane/${encodedOldName}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ lane: laneData, position })
  })
  return response
}

export async function addNote (boardName, laneName, title, content = '', tags = [], startDate = null, endDate = null, priority = null) {
  // The boardName parameter is passed explicitly from the caller (e.g., note.js)
  const response = await fetch(`${API_BASE_URL}/boards/${boardName}/note`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      lane_name: laneName,
      note: {
        title,
        content,
        tags,
        start_date: startDate,
        end_date: endDate,
        priority
      } // id is omitted, backend generates it
    })
  })
  return response
}

export async function updateNote (boardName, noteId, payload) {
  const response = await fetch(`${API_BASE_URL}/boards/${state.currentBoardName}/note/${noteId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  return response
}

export async function deleteNote (boardName, noteId) {
  const response = await fetch(`${API_BASE_URL}/boards/${state.currentBoardName}/note/${noteId}`, {
    method: 'DELETE'
  })
  return response
}

export async function uploadImage (formData) {
  const response = await fetch(`${API_BASE_URL}/upload/image`, {
    method: 'POST',
    body: formData // No 'Content-Type' header, browser sets it for multipart/form-data
  })
  if (!response.ok) {
    await handleApiError(response, 'Failed to upload image.')
  }
  return await response.json() // Should contain { "url": "..." }
}

export async function shareBoard (boardName, toUserEmail) {
  const encodedBoardName = encodeURIComponent(boardName)
  const response = await fetch(`${API_BASE_URL}/boards/${encodedBoardName}/share`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ to_user_email: toUserEmail })
  })
  return response
}

export async function updateBoardColorScheme (boardName, colorScheme) {
  const encodedBoardName = encodeURIComponent(boardName)
  const response = await fetch(`${API_BASE_URL}/boards/${encodedBoardName}/color-scheme`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ color_scheme: colorScheme })
  })
  return response
}

export async function updateBoardPublicStatus (boardName, isPublic) {
  const encodedBoardName = encodeURIComponent(boardName)
  const response = await fetch(`${API_BASE_URL}/boards/${encodedBoardName}/public`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ public: isPublic })
  })
  return response
}

export async function fetchAuthMode () {
  const response = await fetch(`${API_BASE_URL}/auth_mode`)
  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch auth mode.')
  }
  return await response.json()
}
