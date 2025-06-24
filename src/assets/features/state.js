// Global application state
// Encapsulated in an object to allow mutable properties while maintaining a read-only module binding.
export const state = {
  _currentLanes: [],
  _currentBoardName: "default",
  _previousBoardSelection: "default",

  get currentLanes() { return this._currentLanes; },
  set currentLanes(value) { this._currentLanes = value; },
  setCurrentLanes(value) { this._currentLanes = value; }, // Explicit setter for clarity

  get currentBoardName() { return this._currentBoardName; },
  setBoardName(value) { this._currentBoardName = value; }, // Explicit setter

  get previousBoardSelection() { return this._previousBoardSelection; },
  setPreviousBoardSelection(value) { this._previousBoardSelection = value; }, // Explicit setter
};
