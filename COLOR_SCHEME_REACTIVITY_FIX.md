# Fix Board Color Scheme Reactivity

## Problem Analysis

The board color scheme in ToCry is not fully reactive. While the color scheme selector shows the correct value, changes don't automatically propagate to the UI, especially when changes come from external sources like WebSocket updates.

### Current Issues Identified

1. **Not properly reactive**: Color scheme stored as simple property, UI doesn't automatically update
2. **Multiple tracking variables**: Separate variables that can get out of sync:
   - `this.currentBoard.colorScheme` - from board data
   - `this.currentColorScheme` - UI state variable
   - `this.currentColor` - hex color value
3. **Manual UI updates required**: Color scheme changes require calling `updateColorScheme()` manually
4. **WebSocket integration gaps**: Real-time color scheme changes don't update UI automatically

### Current Implementation Analysis

**Color Scheme Loading** (`loadBoard()` method, line 815):
```javascript
const validatedColorScheme = this.validateColorScheme(boardData.colorScheme)
this.currentBoard = {
  // ...
  colorScheme: validatedColorScheme,
  // ...
}
```

**Color Scheme Application** (`updateColorScheme()` method, line 668):
- Updates Pico.css stylesheet link
- Sets CSS custom properties for colors
- Saves to backend if current board exists
- Updates local storage

**State Variables**:
- Board color scheme loaded from API
- Separate UI tracking variable `currentColorScheme`
- Manual sync between board data and UI state

## Solution Plan

### 1. Make Color Scheme Reactive
- Convert color scheme to computed property derived from board data
- Eliminate separate `currentColorScheme` tracking variable
- Use board's `colorScheme` as single source of truth

### 2. Consolidate State Management
- Merge `currentColorScheme` and board's `colorScheme` into one
- Remove redundant `currentColor` variable (compute when needed)
- Simplify color scheme state to single source of truth

### 3. Add Automatic UI Updates
- Trigger `updateColorScheme()` automatically when board color scheme changes
- Add reactive watcher for `currentBoard.colorScheme` changes
- Remove need for manual color scheme application calls

### 4. Fix WebSocket Integration
- Ensure WebSocket board updates trigger color scheme reactivity
- Test real-time color scheme changes across multiple browser windows
- Verify color scheme selector updates automatically

### 5. Add Reactive Watchers
- Watch for changes in `currentBoard.colorScheme`
- Automatically apply color scheme changes when detected
- Ensure color scheme selector reflects current state

## Files to Modify

### `src/assets/store.js`

**Changes needed**:
1. **Remove separate tracking variable** (line 313):
   ```javascript
   // Remove this
   currentColorScheme: 'blue',
   ```

2. **Make color scheme computed** (add getter):
   ```javascript
   get currentColorScheme() {
     return this.currentBoard?.colorScheme || 'blue'
   }
   ```

3. **Add reactive watcher** (in `init()` method):
   ```javascript
   // Watch for board color scheme changes
   this.$watch('currentBoard.colorScheme', (newScheme) => {
     if (newScheme) {
       this.updateColorScheme()
     }
   })
   ```

4. **Update color scheme loading** (line 842):
   ```javascript
   // Remove manual assignment, let reactive property handle it
   // this.currentColorScheme = validatedColorScheme // REMOVE
   ```

5. **Update color scheme selector references**:
   - Replace `this.currentColorScheme` with computed property
   - Ensure template bindings use reactive property

6. **Update WebSocket message handling**:
   - Ensure board reload triggers color scheme reactivity automatically

## Testing Plan

### Manual Testing
1. **Direct color scheme changes**: Change color scheme via selector, verify UI updates
2. **Board switching**: Switch between boards with different color schemes
3. **WebSocket updates**: Test color scheme changes from another browser window
4. **Page reload**: Verify color scheme persists correctly

### Automated Testing
1. **Unit tests**: Test color scheme reactivity logic
2. **Integration tests**: Test WebSocket color scheme synchronization
3. **E2E tests**: Test complete color scheme workflow

## Expected Outcome

After implementation:
- Color scheme changes will be fully reactive
- UI will update automatically when board color scheme changes
- Color scheme selector will always show current value
- WebSocket color scheme updates will work seamlessly
- No more manual `updateColorScheme()` calls needed
- Single source of truth for color scheme state

## Implementation Priority

1. **High**: Core reactivity fix (computed property + watcher)
2. **Medium**: State consolidation and cleanup
3. **Low**: Enhanced testing and edge cases

This fix will ensure the color scheme system works as users expect - changes from any source (direct selection, WebSocket updates, board switching) will automatically update the entire UI and keep all color scheme-related elements in sync.
