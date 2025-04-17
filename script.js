// Configuration
const DEFAULT_TRANSLATION = 'ckjv';
let currentBook = 'Genesis';
let currentChapter = 1;
let currentTranslation = DEFAULT_TRANSLATION;
let bookData = null;

// DOM Elements
const translationSelect = document.getElementById('translationSelect');
const chapterSelect = document.getElementById('chapterSelect');
const prevChapterBtn = document.getElementById('prevChapter');
const nextChapterBtn = document.getElementById('nextChapter');
const versesContainer = document.getElementById('verses');

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    await loadBook(currentBook);
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    translationSelect.addEventListener('change', handleTranslationChange);
    prevChapterBtn.addEventListener('click', loadPreviousChapter);
    nextChapterBtn.addEventListener('click', loadNextChapter);
    chapterSelect.addEventListener('change', handleChapterSelect);
}

// Core Functions
async function loadBook(bookName) {
    try {
        const response = await fetch(`data/${currentTranslation}/${bookName}.json`);
        if (!response.ok) throw new Error('Book not found');
        
        bookData = await response.json();
        currentChapter = 1;
        updateChapterSelector();
        loadCurrentChapter();
    } catch (error) {
        console.error('Error loading book:', error);
        showError('書卷載入失敗，請稍後重試');
    }
}

function updateChapterSelector() {
    const chapters = Object.keys(bookData[currentBook]);
    chapterSelect.innerHTML = chapters.map(chapter => `
        <option value="${chapter}">第 ${chapter} 章</option>
    `).join('');
    chapterSelect.value = currentChapter;
}

function loadCurrentChapter() {
    if (!bookData || !bookData[currentBook][currentChapter]) return;
    
    const chapterContent = bookData[currentBook][currentChapter];
    versesContainer.innerHTML = Object.entries(chapterContent)
        .map(([verse, text]) => `
            <p class="verse"><strong>${verse}.</strong> ${text}</p>
        `).join('');
    
    updateNavigationState();
}

function updateNavigationState() {
    const chapters = Object.keys(bookData[currentBook]);
    prevChapterBtn.disabled = currentChapter <= 1;
    nextChapterBtn.disabled = currentChapter >= chapters.length;
}

// Event Handlers
async function handleTranslationChange(event) {
    currentTranslation = event.target.value;
    await loadBook(currentBook);
}

function handleChapterSelect(event) {
    currentChapter = parseInt(event.target.value);
    loadCurrentChapter();
}

function loadPreviousChapter() {
    if (currentChapter > 1) {
        currentChapter--;
        chapterSelect.value = currentChapter;
        loadCurrentChapter();
    }
}

function loadNextChapter() {
    const maxChapter = Object.keys(bookData[currentBook]).length;
    if (currentChapter < maxChapter) {
        currentChapter++;
        chapterSelect.value = currentChapter;
        loadCurrentChapter();
    }
}

// Utility Functions
function showError(message) {
    versesContainer.innerHTML = `
        <div class="error">
            <p>⚠️ ${message}</p>
        </div>
    `;
}

// PWA Support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker 註冊成功:', registration);
            })
            .catch(error => {
                console.log('Service Worker 註冊失敗:', error);
            });
    });
}