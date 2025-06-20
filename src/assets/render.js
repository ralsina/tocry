export function renderLanes(lanes) {
    const lanesContainer = document.getElementById('lanes-container');
    if (!lanesContainer) {
        console.error('Lanes container not found!');
        return;
    }
    lanesContainer.innerHTML = ''; // Clear existing lanes

    if (!lanes || lanes.length === 0) {
        lanesContainer.innerHTML = '<p>No lanes to display. Click "+" to add a new lane.</p>';
        return;
    }

    lanes.forEach(lane => {
        // Create lane column
        const laneColumn = document.createElement('div');
        laneColumn.className = 'lane'; // Add the 'lane' class for styling

        const laneTitle = document.createElement('h2');
        laneTitle.textContent = lane.name;
        laneColumn.appendChild(laneTitle);

        const notesList = document.createElement('div');
        notesList.className = 'notes-list';

        if (lane.notes && lane.notes.length > 0) {
            lane.notes.forEach(note => {
                const noteCard = document.createElement('article');
                noteCard.className = 'note-card'; // For styling individual notes

                const noteTitle = document.createElement('h4');
                noteTitle.textContent = note.title;
                noteCard.appendChild(noteTitle);

                if (note.tags && note.tags.length > 0) {
                    const tagsContainer = document.createElement('div');
                    tagsContainer.className = 'note-tags';
                    note.tags.forEach(tag => {
                        const tagSpan = document.createElement('span');
                        tagSpan.className = 'tag';
                        tagSpan.textContent = tag;
                        tagsContainer.appendChild(tagSpan);
                    });
                    noteCard.appendChild(tagsContainer);
                }

                const noteContent = document.createElement('p');
                noteContent.textContent = note.content;
                noteCard.appendChild(noteContent);

                notesList.appendChild(noteCard);
            });
        } else {
            const noNotesMessage = document.createElement('p');
            noNotesMessage.textContent = 'No notes in this lane.';
            notesList.appendChild(noNotesMessage);
        }
        laneColumn.appendChild(notesList);
        lanesContainer.appendChild(laneColumn);
    });
}