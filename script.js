// PWA Configuration
let deferredPrompt;
const enablePWA = true;

// Application State
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
const versesContainer = document.getElementById('verses');
const installPrompt = document.getElementById('installPrompt');

// Service Worker Registration
function registerServiceWorker() {
    if ('serviceWorker' in navigator && enablePWA) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    }
}

// Install Prompt Handling
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installPrompt.style.display = 'block';
});

document.getElementById('installConfirm').addEventListener('click', () => {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(choiceResult => {
        if (choiceResult.outcome === 'accepted') {
            console.log('User installed PWA');
        }
        deferredPrompt = null;
        installPrompt.style.display = 'none';
    });
});

document.getElementById('installCancel').addEventListener('click', () => {
    installPrompt.style.display = 'none';
});

// Core Application Functions
async function initializeApp() {
    registerServiceWorker();
    await loadTranslationList();
    setupEventListeners();
}

async function loadTranslationList() {
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

async function loadBookList(translationId) {
    try {
        toggleLoading(true);
        const response = await fetch(`data/translations/${translationId}/manifest.json`);
        const manifest = await response.json();
        
        bookSelect.innerHTML = Object.keys(manifest.books)
            .map(book => `<option value="${book}">${book}</option>`)
            .join('');
            
        bookSelect.disabled = false;
        return manifest;
    } catch (error) {
        showError('無法載入書卷列表');
    } finally {
        toggleLoading(false);
    }
}

async function loadChapterList(translationId, bookName) {
    try {
        toggleLoading(true);
        const manifest = await loadBookList(translationId);
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
    } finally {
        toggleLoading(false);
    }
}

function loadChapterContent() {
    const content = bookData[currentBook][currentChapter];
    versesContainer.innerHTML = Object.entries(content)
        .map(([verse, text]) => `
            <p class="verse">
                <span class="verse-number">${verse}.</span>
                <span class="verse-text">${text}</span>
            </p>
        `).join('');
    
    updateNavigationState();
}

function updateNavigationState() {
    const chapters = Object.keys(bookData[currentBook]);
    chapterSelect.value = currentChapter;
    prevChapterBtn.disabled = currentChapter <= 1;
    nextChapterBtn.disabled = currentChapter >= chapters.length;
}

// UI Helpers
function toggleLoading(isLoading) {
    document.getElementById('loading').style.display = 
        isLoading ? 'flex' : 'none';
}

function showError(message) {
    versesContainer.innerHTML = `
        <div class="error">
            <p>⚠️ ${message}</p>
        </div>
    `;
}

// Event Handlers
function setupEventListeners() {
    translationSelect.addEventListener('change', async (e) => {
        currentTranslation = e.target.value;
        currentBook = null;
        chapterSelect.disabled = true;
        await loadBookList(currentTranslation);
    });

    bookSelect.addEventListener('change', async (e) => {
        currentBook = e.target.value;
        await loadChapterList(currentTranslation, currentBook);
    });

    chapterSelect.addEventListener('change', (e) => {
        currentChapter = parseInt(e.target.value);
        loadChapterContent();
    });

    prevChapterBtn.addEventListener('click', () => {
        if (currentChapter > 1) {
            currentChapter--;
            loadChapterContent();
        }
    });

    nextChapterBtn.addEventListener('click', () => {
        const maxChapter = Object.keys(bookData[currentBook]).length;
        if (currentChapter < maxChapter) {
            currentChapter++;
            loadChapterContent();
        }
    });
}

// Initialize Application
document.addEventListener('DOMContentLoaded', initializeApp);