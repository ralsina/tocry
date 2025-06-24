// --- Search Functionality ---

export function handleSearchInput(event) {
  const searchTerm = event.target.value.toLowerCase();
  const allNotes = document.querySelectorAll(".note-card");

  allNotes.forEach((noteCard) => {
    const titleElement = noteCard.querySelector(".note-summary h4");
    const contentElement = noteCard.querySelector(".note-content");
    const tagElements = noteCard.querySelectorAll(".note-tags .tag");

    const title = titleElement ? titleElement.textContent.toLowerCase() : "";
    const content = contentElement
      ? contentElement.textContent.toLowerCase()
      : "";
    const tags = [...tagElements]
      .map((tag) => tag.textContent.toLowerCase())
      .join(" ");

    const searchableText = `${title} ${content} ${tags}`;

    if (searchableText.includes(searchTerm)) {
      noteCard.classList.remove("note-card--hidden");
    } else {
      noteCard.classList.add("note-card--hidden");
    }
  });
}
