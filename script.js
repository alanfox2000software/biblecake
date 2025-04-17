let currentTranslation = null;
let currentBook = null;
let currentChapter = 1;
let translations = {};
let bookData = null;

// DOM Elements
const translationSelect = document.getElementById('translationSelect');
const bookSelect = document.getElementById('bookSelect');
const chapterSelect = document.getElementById('chapterSelect');
const prevChapterBtn = document.getElementById('prevChapter');
const nextChapterBtn = document.getElementById('nextChapter');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadTranslations();
    setupEventListeners();
});

async function loadTranslations() {
    try {
        const response = await fetch('data/translations/translations.json');
        translations = await response.json();
        populateTranslationSelect();
    } catch (error) {
        showError('無法載入譯本列表');
    }
}

function populateTranslationSelect() {
    translationSelect.innerHTML = translations
        .map(t => `<option value="${t.id}">${t.name}</option>`)
        .join('');
}

async function loadBooks(translationId) {
    try {
        bookSelect.disabled = true;
        const response = await fetch(`data/translations/${translationId}/manifest.json`);
        const manifest = await response.json();
        
        bookSelect.innerHTML = Object.keys(manifest.books)
            .map(book => `<option value="${book}">${book}</option>`)
            .join('');
            
        bookSelect.disabled = false;
        return manifest;
    } catch (error) {
        showError('無法載入書卷列表');
    }
}

async function loadChapters(translationId, bookName) {
    try {
        chapterSelect.disabled = true;
        const manifest = await loadBooks(translationId);
        const bookFile = manifest.books[bookName];
        
        const response = await fetch(`data/translations/${translationId}/${bookFile}`);
        bookData = await response.json();
        
        const chapters = Object.keys(bookData[bookName]);
        chapterSelect.innerHTML = chapters.map(c => `<option value="${c}">第 ${c} 章</option>`).join('');
        chapterSelect.disabled = false;
        
        currentChapter = 1;
        loadChapterContent();
    } catch (error) {
        showError('無法載入章節內容');
    }
}

function loadChapterContent() {
    const content = bookData[currentBook][currentChapter];
    document.getElementById('verses').innerHTML = Object.entries(content)
        .map(([verse, text]) => `<p><strong>${verse}.</strong> ${text}</p>`)
        .join('');
    
    updateButtonStates();
}

function updateButtonStates() {
    const chapters = Object.keys(bookData[currentBook]);
    prevChapterBtn.disabled = currentChapter <= 1;
    nextChapterBtn.disabled = currentChapter >= chapters.length;
}

// Event Handlers
function setupEventListeners() {
    translationSelect.addEventListener('change', async (e) => {
        currentTranslation = e.target.value;
        await loadBooks(currentTranslation);
    });

    bookSelect.addEventListener('change', async (e) => {
        currentBook = e.target.value;
        await loadChapters(currentTranslation, currentBook);
    });

    chapterSelect.addEventListener('change', (e) => {
        currentChapter = parseInt(e.target.value);
        loadChapterContent();
    });

    prevChapterBtn.addEventListener('click', () => {
        if (currentChapter > 1) {
            currentChapter--;
            chapterSelect.value = currentChapter;
            loadChapterContent();
        }
    });

    nextChapterBtn.addEventListener('click', () => {
        const maxChapter = Object.keys(bookData[currentBook]).length;
        if (currentChapter < maxChapter) {
            currentChapter++;
            chapterSelect.value = currentChapter;
            loadChapterContent();
        }
    });
}

function showError(message) {
    const verses = document.getElementById('verses');
    verses.innerHTML = `<div class="error">${message}</div>`;
}
