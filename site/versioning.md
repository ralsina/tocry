# Note Versioning

ToCry supports note versioning using sepia's generations feature, allowing you to track changes and revert to previous versions of your notes.

## Overview

The versioning system provides:
- **Automatic version tracking**: Every time you save a note, a new version is created
- **Version history**: View all previous versions of a note
- **Revert functionality**: Restore a note to any previous version
- **Optimistic concurrency**: Prevent conflicts when multiple users edit the same note

## Enabling Versioning

### CLI Option
```bash
# Start ToCry with versioning enabled
tocry --generations

# Or use the short form
tocry -g
```

### Environment Variable
```bash
# Set environment variable before starting
export USE_GENERATIONS=true
tocry

# Or set it permanently in your shell profile
echo 'export USE_GENERATIONS=true' >> ~/.bashrc
```

## How It Works

### Version IDs
Each note version has a unique ID in the format:
```
note-{uuid}.{generation}
```

For example: `note-123e4567-e89b-12d3-a456-426614174000.0`

- **Generation 0**: The initial version of the note
- **Generation 1, 2, 3...**: Subsequent versions as you edit and save

### API Endpoints

When versioning is enabled, these API endpoints become available:

#### Get Version History
```http
GET /api/v1/boards/{board_name}/note/{note_id}/versions
```

Returns a list of all versions for a note.

#### Get Specific Version
```http
GET /api/v1/boards/{board_name}/note/{note_id}/versions/{generation}
```

Returns the content of a specific version.

#### Revert to Version
```http
POST /api/v1/boards/{board_name}/note/{note_id}/revert/{generation}
```

Restores the note to a specific version and creates a new version.

## User Interface

### Version History Button
When versioning is enabled, you'll see a clock icon (⏰) in the note editor toolbar, next to the AI editing button.

### Version History Modal
Clicking the history button opens a modal showing:

- **Version list**: All versions with their generation numbers
- **Revert button**: For each version, allowing you to restore it
- **Loading states**: While fetching version data
- **Error handling**: Clear messages if versioning is unavailable

### Reverting a Note
1. Open the note you want to revert
2. Click the history button (⏰) in the editor toolbar
3. Find the version you want to restore in the list
4. Click "Revert" next to that version
5. Confirm the action in the dialog
6. The note will be restored and a new version will be created

## Technical Details

### Storage
- Versions are stored using sepia's built-in generation system
- No additional database or configuration required
- Versions are persisted alongside the note data

### Performance
- Versioning has minimal impact on performance
- Version history is loaded on-demand when you open the history modal
- Reverting operations are fast and efficient

### Conflict Resolution
When multiple users edit the same note simultaneously:
- The system detects conflicts using generation numbers
- If a conflict occurs, you'll see a warning message
- You can still save your changes, but the system will preserve all versions

### Limitations
- Versioning only applies to notes, not boards or lanes
- Date/time information is not stored for versions (only generation numbers)
- Versions cannot be manually deleted (they're automatically managed)

## Compatibility

### Backward Compatibility
- Notes created before versioning was enabled will work normally
- When versioning is disabled, notes behave as before
- Existing versions are preserved when you temporarily disable versioning

### Feature Flags
- When `USE_GENERATIONS` is not set, versioning features are hidden
- The API returns 503 errors for version endpoints when disabled
- The UI gracefully degrades without versioning features

## Troubleshooting

### "Version history is not available"
- Ensure `USE_GENERATIONS=true` is set or `--generations` flag is used
- Restart the ToCry server after enabling the feature

### History button not showing
- Check that versioning is enabled on the server
- Refresh your browser to reload the page configuration

### Revert not working
- Ensure you have permission to edit the note
- Check that the note still exists and hasn't been deleted

## Examples

### Workflow Example
1. Create a new note with some initial content (Generation 0)
2. Edit the note to add more information (Generation 1)
3. Make additional changes (Generation 2)
4. Realize you need to go back to Generation 1
5. Open the version history modal
6. Click "Revert" next to Generation 1
7. The note is restored and becomes Generation 3

### Collaboration Example
1. User A edits a note (Generation 5 → Generation 6)
2. User B tries to edit the same note with Generation 5
3. The system detects the conflict and shows a warning
4. User B can still save their changes, creating Generation 7
5. Both users' changes are preserved in the version history

## Configuration

### Server Configuration
```bash
# Enable via CLI
tocry --generations --port 3000

# Enable via environment
USE_GENERATIONS=true tocry --port 3000
```

### Client Configuration
No client configuration is required - the frontend automatically detects whether versioning is enabled and shows/hides the appropriate UI elements.

## Future Enhancements

Potential future improvements to the versioning system:
- Date/time tracking for versions
- Version comparison (diff view)
- Selective version deletion
- Version branching and merging
- Export version history
- Version search and filtering
