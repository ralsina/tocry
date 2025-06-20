// Function to render lanes and notes
function renderLanes(lanes) {
    const lanesContainer = document.getElementById('lanes-container');
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

                const noteTitle = document.createElement('h4'); // Changed to h4 for hierarchy
                noteTitle.textContent = note.title;
                noteCard.appendChild(noteTitle);

                if (note.tags && note.tags.length > 0) {
                    const tagsContainer = document.createElement('div');
                    tagsContainer.className = 'note-tags';
                    note.tags.forEach(tag => {
                        const tagSpan = document.createElement('span');
                        tagSpan.className = 'tag'; // For styling tags
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

// Function to fetch lanes from the server
async function fetchAndRenderLanes() {
    try {
        const response = await fetch('/lanes');
        if (!response.ok) {
            console.error('Failed to fetch lanes:', response.status, response.statusText);
            document.getElementById('lanes-container').innerHTML = '<p>Error loading lanes.</p>';
            return;
        }
        const lanes = await response.json();
        renderLanes(lanes);
    } catch (error) {
        console.error('Error fetching lanes:', error);
        document.getElementById('lanes-container').innerHTML = '<p>Error loading lanes.</p>';
    }
}

// Function to handle the "Add new lane" button click
async function handleAddLaneButtonClick() {
    const laneName = prompt("Enter the name for the new lane:");

    if (laneName !== null && laneName.trim() !== "") {
        try {
            const response = await fetch('/lane', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: laneName.trim() })
            });
            if (response.ok) {
                console.log('Lane created successfully');
                fetchAndRenderLanes(); // Re-fetch and render lanes to show the new one
            } else {
                console.error('Failed to create lane:', response.status, response.statusText);
                // Consider showing a user-friendly error message here
            }
        } catch (error) {
            console.error('Error creating lane:', error);
            // Consider showing a user-friendly error message here
        }
    } else if (laneName !== null) {
        // User clicked OK but entered an empty name
        alert("Lane name cannot be empty.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Fetch and render lanes on page load
    fetchAndRenderLanes();

    const addLaneButton = document.querySelector('button[aria-label="Add new item"]');
    if (addLaneButton) {
        addLaneButton.addEventListener('click', handleAddLaneButtonClick);
    }
});