import { updateLanePosition } from "../api.js";
import { showNotification } from "../ui/dialogs.js";
import { initializeLanes } from "../features/lane.js";
import { state } from "../features/state.js";

// --- Drag and Drop Handlers for Lanes ---

function handleLaneDragStart(event) {
  // Set data for the drag operation
  event.dataTransfer.setData(
    "text/plain",
    event.currentTarget.dataset.laneName
  );
  event.dataTransfer.effectAllowed = "move";
  // Add a class to the dragged element for visual feedback
  event.currentTarget.classList.add("lane--dragging");
}

function handleLaneDragOver(event) {
  // Prevent default to allow dropping
  event.preventDefault();
  // Add visual feedback to the potential drop target
  if (
    event.currentTarget.dataset.laneName !==
    event.dataTransfer.getData("text/plain")
  ) {
    event.currentTarget.classList.add("lane--drag-over");
  }
}

function handleLaneDragLeave(event) {
  // Remove visual feedback when dragging leaves the target
  event.currentTarget.classList.remove("lane--drag-over");
}

async function handleLaneDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove("lane--drag-over");

  const draggedLaneName = event.dataTransfer.getData("text/plain");
  const targetLaneName = event.currentTarget.dataset.laneName;

  if (!draggedLaneName || draggedLaneName === targetLaneName) {
    return; // No change needed if dropped on itself or invalid drag data
  }

  // Use the cache to determine positions
  const draggedLaneIndex = state.currentLanes.findIndex(
    (lane) => lane.name === draggedLaneName
  );
  const targetLaneIndex = state.currentLanes.findIndex(
    (lane) => lane.name === targetLaneName
  );

  if (draggedLaneIndex === -1 || targetLaneIndex === -1) {
    showNotification("Error finding lanes to move. Refreshing.");
    return initializeLanes();
  }

  const isMovingRight = draggedLaneIndex < targetLaneIndex;

  // Calculate the new position for the API call.
  // The backend expects the position in the list *after* the dragged item is removed.
  const tempLanes = state.currentLanes.filter(
    (lane) => lane.name !== draggedLaneName
  );
  const targetIndexInTemp = tempLanes.findIndex(
    (lane) => lane.name === targetLaneName
  );
  const newPosition = isMovingRight ? targetIndexInTemp + 1 : targetIndexInTemp;

  try {
    const response = await updateLanePosition(
      state.currentBoardName,
      draggedLaneName,
      newPosition
    );
    if (response.ok) {
      // The API call was successful. The UI is already updated optimistically.
      // We'll call initializeLanes to sync the cache and ensure consistency.
      await initializeLanes();
    } else {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Failed to parse error response" }));
      showNotification(
        `Failed to move lane: ${errorData.error || response.statusText}`
      );
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
  event.currentTarget.classList.remove("lane--dragging");
}

// Object containing all drag and drop callbacks to pass to renderLanes
export const laneDragAndDropCallbacks = {
  dragstart: handleLaneDragStart,
  dragover: handleLaneDragOver,
  dragleave: handleLaneDragLeave,
  drop: handleLaneDrop,
  dragend: handleLaneDragEnd,
};
