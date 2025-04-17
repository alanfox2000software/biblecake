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