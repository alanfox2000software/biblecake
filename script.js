// Bible Reader PWA - Initialization Fixed
const BibleReader = (() => {
  const CONFIG = {
    appPrefix: '/biblecake/',
    defaultTranslation: 'ckjv',
    paths: {
      translations: 'data/translations/translations.json',
      manifest: 'data/translations/{translation}/manifest.json',
      book: 'data/translations/{translation}/{book}.json'
    },
    cache: {
      name: 'BibleCache-v2',
      version: '2.0.0'
    }
  };

  // State Management
  const state = {
    translations: [],
    current: {
      translation: null,
      book: null,
      chapter: 1
    },
    manifest: null,
    content: null
  };

  // DOM References
  const DOM = {
    translationSelect: document.getElementById('translationSelect'),
    bookSelect: document.getElementById('bookSelect'),
    chapterSelect: document.getElementById('chapterSelect'),
    versesContainer: document.getElementById('verses'),
    loading: document.getElementById('loading'),
    installPrompt: document.getElementById('installPrompt')
  };

  // Service Worker Registration
  const ServiceWorker = {
    async register() {
      if (!('serviceWorker' in navigator)) return;

      try {
        const reg = await navigator.serviceWorker.register(
          `${CONFIG.appPrefix}sw.js`,
          { scope: CONFIG.appPrefix }
        );
        console.log('Service Worker registered:', reg);
        return reg;
      } catch (err) {
        console.error('SW registration failed:', err);
        throw err;
      }
    }
  };

  // Data Service
  const DataService = {
    async fetchTranslations() {
      return this._fetchJSON(CONFIG.paths.translations);
    },

    async fetchManifest(translation) {
      const path = CONFIG.paths.manifest.replace('{translation}', translation);
      return this._fetchJSON(path);
    },

    async fetchBook(translation, book) {
      const path = CONFIG.paths.book
        .replace('{translation}', translation)
        .replace('{book}', book);
      return this._fetchJSON(path);
    },

    async _fetchJSON(path) {
      try {
        const response = await fetch(`${CONFIG.appPrefix}${path}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      } catch (err) {
        console.error(`Fetch failed: ${path}`, err);
        throw err;
      }
    }
  };

  // UI Controller
  const UI = {
    async initialize() {
      this._bindEvents();
      await this._loadTranslations();
      await this._loadInitialTranslation();
    },

    async _loadTranslations() {
      try {
        this.showLoading();
        state.translations = await DataService.fetchTranslations();
        this._populateSelect(DOM.translationSelect, state.translations);
      } catch (err) {
        this.showError('Failed to load translations. Please refresh the page.');
        throw err;
      } finally {
        this.hideLoading();
      }
    },

    async _loadInitialTranslation() {
      try {
        const defaultTrans = state.translations.find(
          t => t.id === CONFIG.defaultTranslation
        );
        
        if (!defaultTrans) {
          throw new Error('Default translation not found');
        }

        await this._loadTranslation(CONFIG.defaultTranslation);
      } catch (err) {
        this.showError('Failed to load initial translation');
        throw err;
      }
    },

    async _loadTranslation(translationId) {
      try {
        this.showLoading();
        state.current.translation = translationId;
        state.manifest = await DataService.fetchManifest(translationId);
        
        if (!state.manifest?.books) {
          throw new Error('Invalid manifest format');
        }

        this._populateSelect(DOM.bookSelect, Object.keys(state.manifest.books));
        await this._loadInitialBook();
      } catch (err) {
        this.showError(`Translation load failed: ${err.message}`);
        throw err;
      } finally {
        this.hideLoading();
      }
    },

    async _loadInitialBook() {
      const firstBook = Object.keys(state.manifest.books)[0];
      if (!firstBook) {
        throw new Error('No books available');
      }
      DOM.bookSelect.value = firstBook;
      await this._loadBook(firstBook);
    },

    async _loadBook(bookName) {
      try {
        this.showLoading();
        state.current.book = bookName;
        const bookFile = state.manifest.books[bookName];
        
        if (!bookFile) {
          throw new Error('Book file not specified');
        }

        const data = await DataService.fetchBook(
          state.current.translation, 
          bookFile
        );
        
        if (!data[bookName]) {
          throw new Error('Invalid book format');
        }

        state.content = data;
        this._populateChapters(Object.keys(data[bookName]));
        this._loadChapter();
      } catch (err) {
        this.showError(`Book load failed: ${err.message}`);
        throw err;
      } finally {
        this.hideLoading();
      }
    },

    _populateChapters(chapters) {
      this._populateSelect(DOM.chapterSelect, chapters);
    },

    _loadChapter() {
      const chapterData = state.content[state.current.book][state.current.chapter];
      DOM.versesContainer.innerHTML = Object.entries(chapterData)
        .map(([verse, text]) => `
          <div class="verse">
            <span class="verse-number">${verse}</span>
            ${text}
          </div>
        `)
        .join('');
    },

    _populateSelect(selectElement, items) {
      selectElement.innerHTML = items
        .map(item => `<option value="${item}">${item}</option>`)
        .join('');
      selectElement.disabled = false;
    },

    showLoading() {
      DOM.loading.style.display = 'flex';
    },

    hideLoading() {
      DOM.loading.style.display = 'none';
    },

    showError(message) {
      DOM.versesContainer.innerHTML = `
        <div class="error">
          <p>⚠️ ${message}</p>
          <button onclick="location.reload()">Retry</button>
        </div>
      `;
    },

    _bindEvents() {
      DOM.translationSelect.addEventListener('change', async (e) => {
        await this._loadTranslation(e.target.value);
      });

      DOM.bookSelect.addEventListener('change', async (e) => {
        await this._loadBook(e.target.value);
      });

      DOM.chapterSelect.addEventListener('change', (e) => {
        state.current.chapter = e.target.value;
        this._loadChapter();
      });
    }
  };

  // Public API
  return {
    init: async () => {
      try {
        await ServiceWorker.register();
        await UI.initialize();
      } catch (err) {
        UI.showError('Initialization failed. Please check your connection.');
        console.error('Critical initialization error:', err);
      }
    }
  };
})();

// Initialize the application
document.addEventListener('DOMContentLoaded', BibleReader.init);
