const APP_PREFIX = '/biblecake/';
const enablePWA = true;
let deferredPrompt;

// Application State
let currentTranslation = null;
let currentBook = null;
let currentChapter = 1;
let translations = [];
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
        navigator.serviceWorker
            .register(`${APP_PREFIX}sw.js`, { scope: APP_PREFIX })
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
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
        showLoading();
        const response = await fetch(`${APP_PREFIX}data/translations/translations.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        translations = await response.json();
        if (translations.length === 0) throw new Error('No translations available');
        
        populateTranslationSelect();
        translationSelect.value = 'ckjv';
        await handleTranslationChange({ target: { value: 'ckjv' } });
    } catch (error) {
        console.error('Translation list load error:', error);
        showError('無法載入譯本列表，請刷新頁面');
    } finally {
        hideLoading();
    }
}

function populateTranslationSelect() {
    translationSelect.innerHTML = translations
        .map(t => `<option value="${t.id}">${t.name}</option>`)
        .join('');
}

async function handleTranslationChange(event) {
    try {
        showLoading();
        const translationId = event.target.value;
        currentTranslation = translationId;
        
        const response = await fetch(
            `${APP_PREFIX}data/translations/${translationId}/manifest.json`
        );
        if (!response.ok) throw new Error('Manifest load failed');
        
        const manifest = await response.json();
        populateBookSelect(manifest.books);
        currentBook = Object.keys(manifest.books)[0];
        await handleBookChange({ target: { value: currentBook } });
    } catch (error) {
        console.error('Translation change error:', error);
        showError('無法載入此譯本，請選擇其他譯本');
    } finally {
        hideLoading();
    }
}

function populateBookSelect(books) {
    bookSelect.innerHTML = Object.keys(books)
        .map(book => `<option value="${book}">${book}</option>`)
        .join('');
    bookSelect.disabled = false;
}

async function handleBookChange(event) {
    try {
        showLoading();
        currentBook = event.target.value;
        
        const response = await fetch(
            `${APP_PREFIX}data/translations/${currentTranslation}/manifest.json`
        );
        const manifest = await response.json();
        const bookFile = manifest.books[currentBook];
        
        const bookRes = await fetch(
            `${APP_PREFIX}data/translations/${currentTranslation}/${bookFile}`
        );
        bookData = await bookRes.json();
        
        populateChapterSelect();
        currentChapter = 1;
        loadChapterContent();
    } catch (error) {
        console.error('Book change error:', error);
        showError('無法載入書卷，請重新選擇');
    } finally {
        hideLoading();
    }
}

function populateChapterSelect() {
    const chapters = Object.keys(bookData[currentBook]);
    chapterSelect.innerHTML = chapters
        .map(c => `<option value="${c}">第 ${c} 章</option>`)
        .join('');
    chapterSelect.disabled = false;
}

function loadChapterContent() {
    const chapterContent = bookData[currentBook][currentChapter];
    versesContainer.innerHTML = Object.entries(chapterContent)
        .map(([verse, text]) => `
            <p class="verse">
                <span class="verse-number">${verse}.</span>
                ${text}
            </p>
        `)
        .join('');
    
    updateNavigationState();
}

function updateNavigationState() {
    const chapters = Object.keys(bookData[currentBook]);
    prevChapterBtn.disabled = currentChapter <= 1;
    nextChapterBtn.disabled = currentChapter >= chapters.length;
    chapterSelect.value = currentChapter;
}

// UI Helpers
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showError(message) {
    versesContainer.innerHTML = `
        <div class="error">
            <p>⚠️ ${message}</p>
        </div>
    `;
}

// Event Listeners
function setupEventListeners() {
    translationSelect.addEventListener('change', handleTranslationChange);
    bookSelect.addEventListener('change', handleBookChange);
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
        const chapters = Object.keys(bookData[currentBook]);
        if (currentChapter < chapters.length) {
            currentChapter++;
            loadChapterContent();
        }
    });
}

// Initialize Application
document.addEventListener('DOMContentLoaded', initializeApp);