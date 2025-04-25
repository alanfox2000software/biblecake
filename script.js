// Bible Reader PWA - Enhanced Version
const BibleReader = (() => {
  // Configuration Constants
  const CONFIG = {
    appPrefix: '/biblecake/',
    defaultTranslation: 'ckjv',
    cache: {
      name: 'BibleCache-v1',
      strategies: {
        translations: 'networkFirst',
        books: 'staleWhileRevalidate'
      }
    },
    swipe: {
      threshold: 50, // pixels
      animationDuration: 300 // ms
    }
  };

  // Application State
  const state = {
    translation: null,
    book: null,
    chapter: 1,
    translations: [],
    manifest: null,
    content: null,
    lastUpdate: Date.now()
  };

  // DOM Elements
  const DOM = {
    translationSelect: document.getElementById('translationSelect'),
    bookSelect: document.getElementById('bookSelect'),
    chapterSelect: document.getElementById('chapterSelect'),
    versesContainer: document.getElementById('verses'),
    loadingIndicator: document.getElementById('loading'),
    installPrompt: document.getElementById('installPrompt')
  };

  // Service Worker Management
  const ServiceWorker = {
    async register() {
      if (!('serviceWorker' in navigator)) return;

      try {
        const registration = await navigator.serviceWorker.register(
          `${CONFIG.appPrefix}sw.js`,
          { scope: CONFIG.appPrefix }
        );

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              UI.showToast('New version available! Refresh to update.', 'info');
            }
          });
        });

        console.log('Service Worker registered:', registration);
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    },

    async checkUpdate() {
      const registration = await navigator.serviceWorker.ready;
      registration.update().catch(err => 
        console.error('Update check failed:', err)
      );
    }
  };

  // Data Handling
  const DataService = {
    async fetchTranslations() {
      const url = `${CONFIG.appPrefix}data/translations/translations.json`;
      return this._fetchWithCache(url, CONFIG.cache.strategies.translations);
    },

    async fetchManifest(translationId) {
      const url = `${CONFIG.appPrefix}data/translations/${translationId}/manifest.json`;
      return this._fetchWithCache(url, CONFIG.cache.strategies.translations);
    },

    async fetchBook(translationId, bookFile) {
      const url = `${CONFIG.appPrefix}data/translations/${translationId}/${bookFile}`;
      return this._fetchWithCache(url, CONFIG.cache.strategies.books);
    },

    async _fetchWithCache(url, strategy) {
      try {
        const cache = await caches.open(CONFIG.cache.name);
        const cachedResponse = await cache.match(url);

        if (cachedResponse && strategy === 'staleWhileRevalidate') {
          this._backgroundUpdate(url, cache);
          return cachedResponse.json();
        }

        const networkResponse = await fetch(url);
        if (!networkResponse.ok) throw new Error('Network response not OK');

        await cache.put(url, networkResponse.clone());
        return networkResponse.json();
      } catch (error) {
        const cached = await caches.match(url);
        if (cached) return cached.json();
        throw error;
      }
    },

    async _backgroundUpdate(url, cache) {
      try {
        const fresh = await fetch(url);
        if (fresh.ok) await cache.put(url, fresh);
      } catch (error) {
        console.log('Background update failed:', error);
      }
    }
  };

  // User Interface
  const UI = {
    init() {
      this._setupEventListeners();
      this._setupGestureControls();
      this._restoreSession();
    },

    async _setupEventListeners() {
      DOM.translationSelect.addEventListener('change', this._handleTranslationChange);
      DOM.bookSelect.addEventListener('change', this._handleBookChange);
      DOM.chapterSelect.addEventListener('change', this._handleChapterChange);
      document.getElementById('prevChapter').addEventListener('click', this._prevChapter);
      document.getElementById('nextChapter').addEventListener('click', this._nextChapter);
      window.addEventListener('beforeinstallprompt', this._handleInstallPrompt);
    },

    _setupGestureControls() {
      let touchStartX = 0;

      DOM.versesContainer.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
      }, { passive: true });

      DOM.versesContainer.addEventListener('touchend', e => {
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(deltaX) > CONFIG.swipe.threshold) {
          deltaX > 0 ? this._prevChapter() : this._nextChapter();
        }
      }, { passive: true });
    },

    async _handleTranslationChange() {
      const translationId = DOM.translationSelect.value;
      UI.showLoading();
      
      try {
        const manifest = await DataService.fetchManifest(translationId);
        state.translation = translationId;
        state.manifest = manifest;
        this._populateBookSelect(manifest.books);
        await this._handleBookChange();
        this._saveSession();
      } catch (error) {
        this.showError('Failed to load translation');
      } finally {
        UI.hideLoading();
      }
    },

    _populateBookSelect(books) {
      DOM.bookSelect.innerHTML = Object.keys(books)
        .map(book => `<option value="${book}">${book}</option>`)
        .join('');
      DOM.bookSelect.disabled = false;
    },

    async _handleBookChange() {
      const book = DOM.bookSelect.value;
      const bookFile = state.manifest.books[book];
      UI.showLoading();

      try {
        const data = await DataService.fetchBook(state.translation, bookFile);
        state.book = book;
        state.content = data;
        this._populateChapterSelect();
        this._loadChapterContent();
        this._saveSession();
      } catch (error) {
        this.showError('Failed to load book');
      } finally {
        UI.hideLoading();
      }
    },

    _populateChapterSelect() {
      const chapters = Object.keys(state.content[state.book]);
      DOM.chapterSelect.innerHTML = chapters
        .map(ch => `<option value="${ch}">Chapter ${ch}</option>`)
        .join('');
      DOM.chapterSelect.disabled = false;
    },

    _loadChapterContent() {
      const chapterData = state.content[state.book][state.chapter];
      DOM.versesContainer.innerHTML = Object.entries(chapterData)
        .map(([verse, text]) => `
          <div class="verse">
            <span class="verse-number">${verse}</span>
            <span class="verse-text">${text}</span>
          </div>
        `)
        .join('');
      
      this._updateNavigation();
    },

    _updateNavigation() {
      const chapters = Object.keys(state.content[state.book]);
      DOM.chapterSelect.value = state.chapter;
      document.getElementById('prevChapter').disabled = state.chapter <= 1;
      document.getElementById('nextChapter').disabled = state.chapter >= chapters.length;
    },

    _handleChapterChange() {
      state.chapter = parseInt(DOM.chapterSelect.value);
      this._loadChapterContent();
      this._saveSession();
    },

    _prevChapter() {
      if (state.chapter > 1) {
        state.chapter--;
        this._loadChapterContent();
        this._saveSession();
      }
    },

    _nextChapter() {
      const chapters = Object.keys(state.content[state.book]);
      if (state.chapter < chapters.length) {
        state.chapter++;
        this._loadChapterContent();
        this._saveSession();
      }
    },

    showLoading() {
      DOM.loadingIndicator.style.display = 'flex';
    },

    hideLoading() {
      DOM.loadingIndicator.style.display = 'none';
    },

    showError(message) {
      DOM.versesContainer.innerHTML = `
        <div class="error">
          <p>⚠️ ${message}</p>
          <button onclick="location.reload()">Retry</button>
        </div>
      `;
    },

    showToast(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    },

    _handleInstallPrompt(e) {
      e.preventDefault();
      window.deferredPrompt = e;
      DOM.installPrompt.style.display = 'block';
      
      document.getElementById('installConfirm').addEventListener('click', () => {
        e.prompt();
        e.userChoice.then(choice => {
          DOM.installPrompt.style.display = 'none';
        });
      });
      
      document.getElementById('installCancel').addEventListener('click', () => {
        DOM.installPrompt.style.display = 'none';
      });
    },

    _saveSession() {
      localStorage.setItem('bibleReaderState', JSON.stringify({
        translation: state.translation,
        book: state.book,
        chapter: state.chapter,
        lastUpdate: Date.now()
      }));
    },

    async _restoreSession() {
      const saved = localStorage.getItem('bibleReaderState');
      if (!saved) return;

      const { translation, book, chapter } = JSON.parse(saved);
      if (translation && book && chapter) {
        DOM.translationSelect.value = translation;
        await this._handleTranslationChange();
        DOM.bookSelect.value = book;
        await this._handleBookChange();
        state.chapter = chapter;
        this._loadChapterContent();
      }
    }
  };

  // Public API
  return {
    init: () => {
      ServiceWorker.register();
      UI.init();
      
      // Initialize with default translation
      DataService.fetchTranslations()
        .then(translations => {
          state.translations = translations;
          UI._populateTranslationSelect(translations);
          DOM.translationSelect.value = CONFIG.defaultTranslation;
          UI._handleTranslationChange();
        })
        .catch(error => UI.showError('Initialization failed'));
    }
  };
})();

// Initialize Application
document.addEventListener('DOMContentLoaded', BibleReader.init);