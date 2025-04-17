LLM served by Perplexity Labs
<think> Alright, the user wants a revised script.js that supports multiple translations with a default of 'ckjv'. Let me start by recalling the previous code structure. The existing code loads books from a single folder, but now they want translations in separate folders, each with a manifest.

First, I need to adjust how books are loaded. The manifest.json in each translation folder lists the books and their corresponding JSON files. So, instead of a fixed book list, the app should read from the manifest.

I'll need a function to load the manifest for the current translation. Then, use that manifest to populate the book list in the sidebar. Also, when a book is selected, the code should fetch the correct JSON file based on the manifest.

I should modify the initialization process. Previously, books were hardcoded, but now they come from the manifest. The loadBook function needs to reference the manifest to get the correct filename.

Adding a translation selector is next. The user mentioned a dropdown in the HTML, so I need to handle the change event to switch translations. When the translation changes, reload the book list and possibly the current book.

Error handling is important. If a translation's manifest can't be loaded, the app should handle it gracefully, maybe show an error message.

I also need to ensure that the default translation 'ckjv' is loaded initially. The DOMContentLoaded event should trigger loading the manifest and then the default book (Genesis).

Testing the flow: load manifest, populate books, load book data, handle chapter navigation. Also, switching translations should update the book list and reset the current view.

I'll structure the script.js with functions for loading manifests, books, handling translation changes, and initial setup. Make sure all async functions have proper error handling.

Finally, check if the service worker needs updates for caching multiple translations, but maybe that's beyond the current scope. Focus on the core functionality first.
</think>

Here's the full revised script.js with multi-translation support and manifest integration:

javascript
// Configuration
const DEFAULT_TRANSLATION = 'ckjv';
let currentTranslation = DEFAULT_TRANSLATION;
let currentBook = null;
let currentChapter = null;
let bookData = null;
const translationCache = new Map();

// DOM Elements
const translationSelect = document.getElementById('translationSelect');
const bookListDiv = document.getElementById('book-list');

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    await initTranslations();
    await loadDefaultBook();
});

async function initTranslations() {
    // Load translation list
    await populateTranslationSelector();
    
    // Set up translation change handler
    translationSelect.addEventListener('change', async () => {
        currentTranslation = translationSelect.value;
        await refreshTranslation();
    });
}

async function populateTranslationSelector() {
    const response = await fetch('data/translations/translations.json');
    const translations = await response.json();
    
    translationSelect.innerHTML = translations
        .map(t => `<option value="${t.id}" ${t.id === DEFAULT_TRANSLATION ? 'selected' : ''}>${t.name}</option>`)
        .join('');
}

async function refreshTranslation() {
    bookListDiv.innerHTML = '<div class="loading">Loading translation...</div>';
    await initBooks();
    await loadDefaultBook();
}

async function loadDefaultBook() {
    const manifest = await loadManifest();
    const defaultBook = Object.keys(manifest.books)[0];
    if (defaultBook) await loadBookUI(defaultBook);
}

// Translation core functions
async function loadManifest() {
    if (translationCache.has(currentTranslation)) {
        return translationCache.get(currentTranslation);
    }
    
    const response = await fetch(`data/translations/${currentTranslation}/manifest.json`);
    const manifest = await response.json();
    translationCache.set(currentTranslation, manifest);
    return manifest;
}

async function initBooks() {
    try {
        const manifest = await loadManifest();
        bookListDiv.innerHTML = Object.keys(manifest.books)
            .map(bookName => `
                <button class="book-btn" 
                        onclick="loadBookUI('${bookName}')"
                        data-book="${bookName}">
                    ${bookName}
                </button>
            `).join('');
    } catch (error) {
        console.error('Error initializing books:', error);
        bookListDiv.innerHTML = '<div class="error">Error loading translation</div>';
    }
}

async function loadBookUI(bookName) {
    try {
        const manifest = await loadManifest();
        if (!manifest.books[bookName]) throw new Error('Book not found');
        
        const bookFile = manifest.books[bookName];
        const response = await fetch(`data/translations/${currentTranslation}/${bookFile}`);
        bookData = await response.json();
        
        currentBook = Object.keys(bookData)[0];
        currentChapter = '1';
        
        updateChapterNavigation();
        loadChapter(currentChapter);
        document.getElementById('navigation').style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading book:', error);
        document.getElementById('verses').innerHTML = `
            <div class="error">Error loading ${bookName}</div>
        `;
    }
}

// Chapter/verse navigation (similar to previous versions)
function updateChapterNavigation() {
    const chapters = Object.keys(bookData[currentBook]);
    const chapterNumbersDiv = document.getElementById('chapter-numbers');
    
    chapterNumbersDiv.innerHTML = chapters.map(chapter => `
        <button class="chapter-btn ${chapter === currentChapter ? 'active' : ''}" 
                onclick="loadChapter('${chapter}')">
            ${chapter}
        </button>
    `).join('');
}

function loadChapter(chapter) {
    currentChapter = chapter;
    const chapterContent = bookData[currentBook][chapter];
    
    const versesHtml = Object.entries(chapterContent)
        .map(([verse, text]) => `<p><b>${verse}:</b> ${text}</p>`)
        .join('');

    document.getElementById('verses').innerHTML = `
        <h2>${currentBook} ${currentChapter}</h2>
        ${versesHtml}
    `;
    
    updateChapterNavigation();
}

// Navigation controls
document.getElementById('prevChapter').addEventListener('click', () => {
    const prev = String(parseInt(currentChapter) - 1);
    if (bookData[currentBook][prev]) loadChapter(prev);
});

document.getElementById('nextChapter').addEventListener('click', () => {
    const next = String(parseInt(currentChapter) + 1);
    if (bookData[currentBook][next]) loadChapter(next);
});

// Service Worker (PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registered');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed:', err);
            });
    });
}
