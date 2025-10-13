# Frontend JavaScript Refactoring Opportunities

This document identifies low-risk refactoring opportunities in the frontend JavaScript code, focusing on reducing duplication, improving maintainability, and enhancing code clarity.

---

## 1. UUID Regex Duplication (HIGH PRIORITY - Security & Maintainability)

**Issue**: UUID validation regex pattern is duplicated 3 times across frontend files

**Current Locations**:
- `src/assets/features/note-attachments.js` line 25: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
- `src/assets/utils/constants.js` line 20: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
- `src/assets/store.js` line 2349: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` (in getAttachmentFilename method)

**Refactoring**:
Add to `src/assets/utils/constants.js`:
```javascript
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUuid(uuid) {
  return UUID_REGEX.test(uuid)
}
```

Then update all 3 locations to import and use the constant.

**Benefits**:
- Single source of truth for UUID validation
- Easier to update if regex pattern needs changes
- Consistent validation across the codebase
- Matches the pattern from backend refactoring

**Risk**: Low - Simple constant extraction with no behavior change

**Lines of code affected**: ~6 changes (1 export + 3 replacements + 2 imports)

---

## 2. Duplicate UUID Filename Extraction (HIGH PRIORITY - DRY Principle)

**Issue**: The function to extract original filename from UUID-prefixed filenames is duplicated in 2 files with identical implementations

**Current Code** (duplicated):
```javascript
// In src/assets/features/note-attachments.js
function getOriginalFilename(uuidPrefixedFilename) {
  const parts = uuidPrefixedFilename.split('_')
  if (parts.length > 1 && parts[0].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return parts.slice(1).join('_')
  }
  return uuidPrefixedFilename
}

// In src/assets/utils/constants.js
export function getOriginalFileName(uuidPrefixedFilename) {
  const parts = uuidPrefixedFilename.split('_')
  if (parts.length > 1 && parts[0].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return parts.slice(1).join('_')
  }
  return uuidPrefixedFilename
}
```

**Also duplicated in store.js** line 2348:
```javascript
getAttachmentFilename(attachment) {
  const match = attachment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_(.*)$/)
  return match ? match[1] : attachment
}
```

**Refactoring**:
1. Keep only the version in `src/assets/utils/constants.js` (already exported)
2. Remove the duplicate from `note-attachments.js` and import from constants
3. Replace `store.js` `getAttachmentFilename()` method to use the constants version
4. Update the constants version to use the UUID_REGEX constant (from opportunity #1)

**Benefits**:
- Single source of truth - one function, not three
- Consistent behavior across all attachment handling
- Easier to test and maintain
- Reduces code by ~12-15 lines

**Risk**: Low - Direct function replacement with no behavior change

**Lines of code affected**: ~15 changes (remove 2 duplicates, add 2 imports, update 1 reference in store.js)

---

## 3. Repeated Toast Message Patterns (MEDIUM PRIORITY - DRY)

**Issue**: Toast message dispatching is repeated with the same pattern ~50+ times throughout store.js

**Current Pattern**:
```javascript
window.dispatchEvent(new CustomEvent('show-toast', {
  detail: { type: 'success', message: 'Board created!' }
}))
```

**Already Exists**: The store actually has wrapper methods (`showSuccess`, `showError`, `showInfo`) but they're not consistently used throughout the file.

**Current Usage**:
- Lines 1027-1029: Direct `window.dispatchEvent` calls for `updateNotePublic`
- Lines 1050-1054: Direct calls for `copyPermalink` with fallback
- Lines 2625-2627, 2637-2639, 2655-2657: Direct calls in `updateNotePublic` (duplicate method?)
- Lines 2687-2689, 2702-2704, 2717-2719: Direct calls in `copyPermalink` (duplicate method?)

**Refactoring**:
Replace all direct `window.dispatchEvent` calls with the existing helper methods:
- `this.showSuccess(message)`
- `this.showError(message)`
- `this.showInfo(message)`

**Benefits**:
- Consistent API usage
- Easier to change toast implementation later
- More readable code
- Reduces code duplication by ~30-40 lines

**Risk**: Low - Simple method call replacement

**Lines of code affected**: ~40-50 replacements

---

## 4. Duplicate updateNotePublic and copyPermalink Methods (HIGH PRIORITY - Major Duplication)

**Issue**: The methods `updateNotePublic()` and `copyPermalink()` appear to be duplicated in store.js

**Locations**:
- `updateNotePublic`: Lines 970-1034 AND lines 2617-2690 (duplicate!)
- `copyPermalink`: Lines 1037-1074 AND lines 2693-2731 (duplicate!)

**Evidence**: Both implementations are nearly identical with only minor stylistic differences (spacing, comments)

**Refactoring**:
Remove the duplicate methods at lines 2617-2731

**Benefits**:
- Eliminates ~120 lines of duplicate code
- Prevents bugs from inconsistent implementations
- Makes maintenance easier (only one version to update)

**Risk**: Low - Direct removal of exact duplicates

**Lines of code affected**: -120 lines (deletion only)

---

## 5. Repeated Optimistic Update Pattern (MEDIUM PRIORITY - Extract Pattern)

**Issue**: Optimistic updates follow the same pattern ~15+ times but are copy-pasted throughout the file

**Current Pattern** (repeated ~15 times):
```javascript
// Declare variable in outer scope
let originalValue = null

try {
  // Store original
  originalValue = item.property
  // Update optimistically
  item.property = newValue
  this.showInfo('Updating...')

  // API call
  await this.api.updateSomething(...)

  this.showSuccess('Updated')
} catch (error) {
  // Revert on error
  if (originalValue !== null) {
    item.property = originalValue
  }
  console.error('Error:', error)
  this.showError('Failed')
} finally {
  // Cleanup
}
```

**Locations**: Lines showing this pattern:
- `confirmNoteTitleEdit()` ~line 1253
- `saveNoteContent()` ~line 1325
- `saveNoteTags()` ~line 1421
- `updateNoteTags()` ~line 1501
- `addNote()` ~line 1545
- `confirmLaneRename()` ~line 1213
- `deleteLane()` ~line 987
- And several more...

**Refactoring**:
The `BoardApiService` class already has a `withOptimisticUpdate()` helper method (lines 203-225), but it's not being used!

Use the existing helper:
```javascript
await this.api.withOptimisticUpdate(
  () => { note.title = newTitle },
  (prevState) => { note.title = prevState.title },
  'Failed to update note title'
)
```

**Benefits**:
- Consistent error handling and rollback behavior
- Less boilerplate code (~8-10 lines reduced per usage)
- Easier to add features like undo/redo later
- Reduces code by ~120-150 lines total

**Risk**: Medium - Requires careful testing of each conversion

**Lines of code affected**: ~150-200 changes (simplify 15+ methods)

---

## 6. Repeated Note Update API Call Pattern (MEDIUM PRIORITY - Extract Helper)

**Issue**: The same note update API call structure is repeated ~12+ times with all the same fields

**Current Pattern** (repeated everywhere):
```javascript
await this.api.updateNote(this.currentBoardName, noteId, {
  title: note.title,
  tags: note.tags || [],
  content: note.content || '',
  expanded: note.expanded,
  public: note.public || false,
  start_date: note.startDate || null,
  end_date: note.endDate || null,
  priority: note.priority || null,
  attachments: note.attachments || []
}, {
  laneName: laneName,
  position: position
})
```

**Locations**: Lines with this pattern:
- Line 1264: `confirmNoteTitleEdit()`
- Line 1337: `saveNoteContent()`
- Line 1434: `saveNoteTags()`
- Line 1513: `updateNoteTags()`
- Line 1806: `toggleNoteExpansion()`
- Line 2640: `updateNotePublic()` (in duplicate)
- And more...

**Refactoring**:
Create a helper method in the store:
```javascript
async updateNoteWithFields(noteId, note, laneName, position = null, overrides = {}) {
  return this.api.updateNote(this.currentBoardName, noteId, {
    title: overrides.title ?? note.title,
    tags: overrides.tags ?? note.tags ?? [],
    content: overrides.content ?? note.content ?? '',
    expanded: overrides.expanded ?? note.expanded,
    public: overrides.public ?? note.public ?? false,
    start_date: overrides.start_date ?? note.startDate ?? null,
    end_date: overrides.end_date ?? note.endDate ?? null,
    priority: overrides.priority ?? note.priority ?? null,
    attachments: overrides.attachments ?? note.attachments ?? []
  }, {
    laneName,
    position
  })
}
```

Then use it:
```javascript
await this.updateNoteWithFields(noteId, note, laneName, null, { title: newTitle })
```

**Benefits**:
- Single source of truth for note field mapping
- Easier to add new fields later (one place to update)
- Reduces repetition by ~8 lines per call
- Total reduction: ~90-100 lines

**Risk**: Medium - Requires careful testing of parameter passing

**Lines of code affected**: ~100-120 changes (create helper + update 12+ callsites)

---

## 7. File Size: store.js is 3114 lines (LOW PRIORITY - Observation)

**Issue**: The `store.js` file is quite large and handles many different concerns

**Current Structure**:
- BoardApiService class: Lines 5-232
- Main store creation: Lines 234-3114
  - State management
  - Board operations
  - Lane operations
  - Note operations
  - Search functionality
  - Drag & drop
  - Modal management
  - Attachment handling
  - Theme/color scheme
  - Public board controls

**Observation**: This is similar to the backend note - the file is large but well-organized. However, it could benefit from splitting.

**Potential Refactoring** (Future consideration):
Split into multiple files:
- `store/board-service.js` - BoardApiService class
- `store/board-operations.js` - Board CRUD operations
- `store/note-operations.js` - Note CRUD and editing
- `store/lane-operations.js` - Lane management
- `store/ui-state.js` - Modals, themes, UI state
- `store/drag-drop.js` - Drag and drop handlers
- `store/attachments.js` - File upload and attachment handling
- `store/index.js` - Main store composition

**Benefits** (if done):
- Better separation of concerns
- Easier to navigate codebase
- Easier to test individual features
- Clearer module boundaries

**Risk**: Medium-High - Requires careful state management and may break hot module reloading

**Not recommended for immediate action** - Only consider if the file continues to grow or if specific feature sets need independent development.

---

## 8. Duplicate Keyboard Shortcut Handlers (MEDIUM PRIORITY - Consolidation)

**Issue**: Keyboard event handling is split between `app.js` and `store.js` with some overlap

**Current State**:
- `app.js` (lines 16-39): Handles Ctrl+K (board selector focus) and Escape (modal closing)
- `store.js` `setupGlobalKeyboardHandler()` (lines 456-529): Handles Escape, Tab, Ctrl+Enter, Ctrl+K, Ctrl+N, Ctrl+L, Ctrl+B
- `store.js` `init()` (lines 435-445): Handles "/" for search focus

**Overlap**:
- Escape key is handled in both places
- Ctrl+K is handled in both places (app.js for board selector, store.js for search)

**Refactoring**:
Consolidate all keyboard shortcuts in one place (preferably in the store's `setupGlobalKeyboardHandler` method since it has more context).

Remove the keyboard handlers from `app.js` and rely entirely on the store's handler.

**Benefits**:
- Single source of truth for keyboard shortcuts
- Prevents conflicts and duplicate handling
- Easier to document all shortcuts
- Can build a "keyboard shortcuts help" modal from single source

**Risk**: Low-Medium - Need to ensure all shortcuts still work in all contexts

**Lines of code affected**: ~30 changes (remove from app.js, potentially consolidate in store.js)

---

## 9. Inconsistent Error Handling Patterns (LOW PRIORITY - Consistency)

**Issue**: Error handling varies between methods - some use try/catch with toast messages, some just log, some show alerts

**Current Patterns**:
1. Try-catch with `this.showError()`: Most common (good)
2. Try-catch with direct toast dispatch: Lines 1027-1034, 2625-2690
3. Try-catch with `this.showAlert()`: Some places
4. Just console.error with no user feedback: A few places

**Refactoring**:
Standardize on:
```javascript
try {
  // operation
  this.showSuccess('Operation completed')
} catch (error) {
  console.error('Error doing operation:', error)
  this.showError(`Failed to do operation: ${error.message}`)
  // Optionally re-throw if caller needs to handle
}
```

**Benefits**:
- Consistent user experience
- All errors are visible to users (not just console)
- Easier debugging with consistent patterns
- Better error messages

**Risk**: Low - Mostly adding error handling where missing

**Lines of code affected**: ~20-30 improvements

---

## Prioritized Action Items

### Immediate (High Priority):
1. ✅ **Add UUID validation constant** (Opportunity #1) - 6 changes
   - Export UUID_REGEX and isValidUuid from constants.js
   - Update 3 files to use the constant

2. ✅ **Remove duplicate getOriginalFileName function** (Opportunity #2) - 15 changes
   - Remove from note-attachments.js and store.js
   - Import from constants.js instead

3. ✅ **Remove duplicate methods** (Opportunity #4) - -120 lines
   - Delete duplicate updateNotePublic and copyPermalink at lines 2617-2731

### Soon (Medium Priority):
4. **Replace direct toast dispatches with helper methods** (Opportunity #3) - 40-50 changes
   - Replace all window.dispatchEvent calls with this.showSuccess/Error/Info

5. **Extract note update helper** (Opportunity #6) - 100-120 changes
   - Create updateNoteWithFields helper
   - Replace 12+ duplicate API call patterns

6. **Use existing optimistic update helper** (Opportunity #5) - 150-200 changes
   - Replace manual optimistic update patterns with api.withOptimisticUpdate

7. **Consolidate keyboard shortcuts** (Opportunity #8) - 30 changes
   - Move all keyboard handling to store.js

### Consider for Future:
8. Error handling consistency (Opportunity #9)
9. File splitting (Opportunity #7) - only if file continues to grow

---

## Summary

**Immediate wins** (High Priority):
- 3 refactorings
- ~140 lines reduced
- Improved maintainability and consistency
- Zero functional changes
- Low risk

**Medium-term improvements** (Medium Priority):
- 4 refactorings
- ~270-370 lines reduced
- Better code organization
- More consistent patterns
- Low-medium risk

**Total potential impact**:
- 7 refactorings
- ~410-510 lines of code reduced
- Significant improvement in maintainability
- Consistent patterns throughout codebase

The frontend has similar patterns to the backend: lots of duplication that can be safely refactored with low risk. The biggest win is removing the duplicate methods (#4) and consolidating the UUID handling (#1, #2).
