const APP_PREFIX = '/biblecake/';
const enablePWA = true;
let deferredPrompt;

// Application State
let currentTranslation = null;
let currentBook = null;
let currentChapter = null; // 改为字符串类型存储
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

document.getElementById('installConfirm')?.addEventListener('click', () => {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(choiceResult => {
        installPrompt.style.display = 'none';
    });
});

document.getElementById('installCancel')?.addEventListener('click', () => {
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
        bookSelect.value = currentBook;
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
        
        if (!currentBook) throw new Error('未選擇書卷');

        const response = await fetch(
            `${APP_PREFIX}data/translations/${currentTranslation}/manifest.json`
        );
        if (!response.ok) throw new Error('無法載入書卷目錄');
        
        const manifest = await response.json();
        const bookFile = manifest.books[currentBook];
        
        if (!bookFile) throw new Error('找不到書卷檔案');
        
        const bookRes = await fetch(
            `${APP_PREFIX}data/translations/${currentTranslation}/${bookFile}`
        );
        if (!bookRes.ok) throw new Error('書卷載入失敗');
        
        bookData = await bookRes.json();
        if (!bookData || !bookData[currentBook]) {
            throw new Error('書卷格式錯誤');
        }
        
        // 初始化章节为第一个可用章节
        const chapters = Object.keys(bookData[currentBook]);
        if (chapters.length === 0) throw new Error('此書卷沒有章節');
        currentChapter = chapters[0]; 
        
        populateChapterSelect();
        loadChapterContent();
    } catch (error) {
        console.error('Book change error:', error);
        showError(`無法載入書卷: ${error.message}`);
    } finally {
        hideLoading();
    }
}

function populateChapterSelect() {
    try {
        if (!bookData || !bookData[currentBook]) {
            throw new Error('無效的書卷資料');
        }
        
        const chapters = Object.keys(bookData[currentBook]);
        if (chapters.length === 0) {
            throw new Error('此書卷沒有章節');
        }
        
        chapterSelect.innerHTML = chapters
            .map(c => `<option value="${c}">第 ${c} 章</option>`)
            .join('');
        chapterSelect.value = currentChapter;
        chapterSelect.disabled = false;
    } catch (error) {
        console.error('Chapter select population failed:', error);
        showError('無法載入章節列表');
        chapterSelect.innerHTML = '<option value="error">載入失敗</option>';
    }
}

function loadChapterContent() {
    const chapterContent = bookData[currentBook][currentChapter];
    
    const entries = Object.entries(chapterContent);
    const nonNumericEntries = entries.filter(([key]) => isNaN(key));
    const numericEntries = entries.filter(([key]) => !isNaN(key))
                                  .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    
    const sortedVerses = [...nonNumericEntries, ...numericEntries];

    versesContainer.innerHTML = sortedVerses
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
    const currentIndex = chapters.indexOf(currentChapter);
    
    prevChapterBtn.disabled = currentIndex <= 0;
    nextChapterBtn.disabled = currentIndex >= chapters.length - 1;
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
        currentChapter = e.target.value;
        loadChapterContent();
    });

    prevChapterBtn.addEventListener('click', () => {
        const chapters = Object.keys(bookData[currentBook]);
        const currentIndex = chapters.indexOf(currentChapter);
        if (currentIndex > 0) {
            currentChapter = chapters[currentIndex - 1];
            loadChapterContent();
        }
    });

    nextChapterBtn.addEventListener('click', () => {
        const chapters = Object.keys(bookData[currentBook]);
        const currentIndex = chapters.indexOf(currentChapter);
        if (currentIndex < chapters.length - 1) {
            currentChapter = chapters[currentIndex + 1];
            loadChapterContent();
        }
    });
}

// Initialize Application
document.addEventListener('DOMContentLoaded', initializeApp);
