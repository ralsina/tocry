import { addNote, uploadImage } from '../api.js'
import { showNotification } from '../ui/dialogs.js'
import { handleApiError, handleUIError } from '../utils/errorHandler.js'
import { initializeLanes } from './lane.js'
import { state } from './state.js'

export async function handlePasteAsNoteRequest (laneName, pastedText) {
  if (!pastedText || pastedText.trim() === '') {
    return
  }

  const lines = pastedText.trim().split('\n')
  const title = lines[0].trim()
  const content = lines.slice(1).join('\n').trim()

  if (!title) {
    showNotification(
      'Pasted text must have at least one line to be used as a title.'
    )
    return
  }

  try {
    const response = await addNote(
      state.currentBoardName,
      laneName,
      title,
      content,
      []
    )
    if (response.ok) {
      console.log(`Note "${title}" created from paste in lane "${laneName}".`)
      await initializeLanes()
    } else {
      await handleApiError(response, 'Failed to create note from paste.')
    }
  } catch (error) {
    handleUIError(error, 'An unexpected error occurred while trying to create the note from paste.')
  }
}

export async function handlePasteAsImageNoteRequest (laneName, imageBlob) {
  try {
    const formData = new FormData()
    formData.append('image', imageBlob)

    const uploadResponse = await uploadImage(formData)
    const imageUrl = uploadResponse.url

    const title = 'Pasted Image'
    const content = `![Pasted Image](${imageUrl})`

    const addNoteResponse = await addNote(
      state.currentBoardName,
      laneName,
      title,
      content,
      []
    )
    if (addNoteResponse.ok) {
      console.log(
        `Note "${title}" created from pasted image in lane "${laneName}".`
      )
      await initializeLanes()
    } else {
      await handleApiError(
        addNoteResponse,
        'Failed to create note from pasted image.'
      )
    }
  } catch (error) {
    handleUIError(error, 'An unexpected error occurred while trying to create the note from the pasted image.')
  }
}
