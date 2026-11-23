/**
 * app.js
 * UI rendering, event handling, filtering, search, and pagination.
 * Depends on: config.js, api.js  (must be loaded first)
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════════
const state = {
  query:           CONFIG.DEFAULT_QUERY,
  activeCategoryId:'general',
  selectedSources: new Set(),       // source IDs selected by user
  sortBy:          CONFIG.DEFAULT_SORT_BY,
  language:        CONFIG.DEFAULT_LANGUAGE,
  from:            '',
  to:              '',
  page:            1,
  pageSize:        CONFIG.DEFAULT_PAGE_SIZE,
  totalResults:    0,
  articles:        [],
  sources:         [],              // all loaded sources
  isSearchMode:    false,           // true when user typed a keyword
  lastFetchParams: null,            // prevent duplicate fetches
};

// ═══════════════════════════════════════════════════════════════════════════════
// DOM REFS
// ═══════════════════════════════════════════════════════════════════════════════
const dom = {
  // Navbar / search
  searchInput:       document.getElementById('search-input'),
  searchForm:        document.getElementById('search-form'),
  searchInputMobile: document.getElementById('search-input-mobile'),
  searchFormMobile:  document.getElementById('search-form-mobile'),
  btnSearch:         document.getElementById('btn-search'),

  // Category tabs
  categoryTabs:      document.getElementById('category-tabs'),

  // Feed
  featuredSection:   document.getElementById('featured-section'),
  feedHeading:       document.getElementById('feed-heading'),
  newsGrid:          document.getElementById('news-grid'),
  emptyState:        document.getElementById('empty-state'),
  errorState:        document.getElementById('error-state'),
  errorTitle:        document.getElementById('error-title'),
  errorMessage:      document.getElementById('error-message'),
  btnRetry:          document.getElementById('btn-retry'),
  btnEmptyReset:     document.getElementById('btn-empty-reset'),

  // Active filter bar
  activeFilterBar:   document.getElementById('active-filter-bar'),
  activeFilterLabel: document.getElementById('active-filter-label'),
  btnResetFilters:   document.getElementById('btn-reset-filters'),

  // Pagination
  paginationWrapper: document.getElementById('pagination-wrapper'),
  paginationInfo:    document.getElementById('pagination-info'),

  // Modal
  articleModal:      document.getElementById('article-modal'),
  modalImage:        document.getElementById('modal-image'),
  modalTitle:        document.getElementById('modal-title'),
  modalSourceName:   document.getElementById('modal-source-name'),
  modalAuthorWrap:   document.getElementById('modal-author-wrap'),
  modalAuthor:       document.getElementById('modal-author'),
  modalDateWrap:     document.getElementById('modal-date-wrap'),
  modalDate:         document.getElementById('modal-date'),
  modalDescription:  document.getElementById('modal-description'),
  modalContentWrap:  document.getElementById('modal-content-wrapper'),
  modalContent:      document.getElementById('modal-content'),
  btnReadFull:       document.getElementById('btn-read-full'),

  // Sidebar — sources
  sourcesLoading:    document.getElementById('sources-loading'),
  sourceListWrapper: document.getElementById('source-list-wrapper'),
  sourceList:        document.getElementById('source-list'),
  sourceSearch:      document.getElementById('source-search'),
  btnApplySources:   document.getElementById('btn-apply-sources'),
  btnResetSources:   document.getElementById('btn-reset-sources'),

  // Sidebar — filters
  filterSort:        document.getElementById('filter-sort'),
  filterLanguage:    document.getElementById('filter-language'),
  filterFrom:        document.getElementById('filter-from'),
  filterTo:          document.getElementById('filter-to'),
  btnApplyFilters:   document.getElementById('btn-apply-filters'),
  btnResetAllFilters:document.getElementById('btn-reset-all-filters'),

  // Loading overlay
  loadingOverlay:    document.getElementById('loading-overlay'),

  // Footer
  footerYear:        document.getElementById('footer-year'),

  // API key banner
  apiKeyBanner:      document.getElementById('api-key-banner'),
};

// ═══════════════════════════════════════════════════════════════════════════════
// BOOTSTRAP MODAL INSTANCE — lazy, so a Bootstrap load failure doesn't crash app
// ═══════════════════════════════════════════════════════════════════════════════
let _articleModal = null;

function getArticleModal() {
  if (!_articleModal) {
    if (typeof bootstrap === 'undefined' || !bootstrap.Modal) {
      console.error('[NewsHub] Bootstrap is not loaded. Cannot open article modal.');
      return null;
    }
    _articleModal = new bootstrap.Modal(dom.articleModal);
  }
  return _articleModal;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/** Simple debounce */
function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

/** Format an ISO date string as a human-readable short date */
function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return iso;
  }
}

/** Sanitize a string for safe HTML insertion (plain text only) */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Return a safe image URL — falls back to placeholder on error */
function safeImageSrc(url) {
  return url || CONFIG.PLACEHOLDER_IMAGE;
}

/** Set loading overlay visibility */
function setLoading(visible) {
  dom.loadingOverlay.classList.toggle('active', visible);
}

/** Build a serialised string of the current fetch params for dedup */
function buildFetchKey(params) {
  return JSON.stringify(params);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOOTSTRAP: Category tabs initialisation
// ═══════════════════════════════════════════════════════════════════════════════
function initCategoryTabs() {
  dom.categoryTabs.innerHTML = '';
  CONFIG.CATEGORIES.forEach((cat) => {
    const li = document.createElement('li');
    li.className = 'category-tab';
    li.setAttribute('role', 'presentation');

    const a = document.createElement('a');
    a.className = 'nav-link' + (cat.id === state.activeCategoryId ? ' active' : '');
    a.href = '#';
    a.textContent = cat.label;
    a.setAttribute('role', 'tab');
    a.setAttribute('data-category', cat.id);
    a.setAttribute('aria-selected', cat.id === state.activeCategoryId ? 'true' : 'false');

    a.addEventListener('click', (e) => {
      e.preventDefault();
      onCategorySelect(cat);
    });

    li.appendChild(a);
    dom.categoryTabs.appendChild(li);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOOTSTRAP: Sidebar filter selects
// ═══════════════════════════════════════════════════════════════════════════════
function initFilterControls() {
  // Sort
  CONFIG.SORT_OPTIONS.forEach((opt) => {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    o.selected = opt.value === state.sortBy;
    dom.filterSort.appendChild(o);
  });

  // Language
  CONFIG.LANGUAGES.forEach((lang) => {
    const o = document.createElement('option');
    o.value = lang.code;
    o.textContent = lang.label;
    o.selected = lang.code === state.language;
    dom.filterLanguage.appendChild(o);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCES
// ═══════════════════════════════════════════════════════════════════════════════
async function loadSources() {
  try {
    const sources = await fetchSources({ language: '' });
    console.debug('[NewsHub] Loaded', sources.length, 'sources');
    state.sources = sources;
    renderSourceList(sources);
  } catch (err) {
    console.warn('[NewsHub] loadSources error (non-fatal):', err.message);
    dom.sourcesLoading.textContent = 'Could not load sources.';
  }
}

function renderSourceList(sources) {
  dom.sourcesLoading.classList.add('d-none');
  dom.sourceListWrapper.classList.remove('d-none');
  dom.sourceList.innerHTML = '';

  if (!sources.length) {
    dom.sourceList.innerHTML = '<p class="text-muted small">No sources available.</p>';
    return;
  }

  sources.forEach((src) => {
    const div = document.createElement('div');
    div.className = 'source-item';
    div.dataset.sourceId = src.id;

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = `src-${src.id}`;
    cb.value = src.id;
    cb.checked = state.selectedSources.has(src.id);
    cb.addEventListener('change', () => {
      if (cb.checked) {
        state.selectedSources.add(src.id);
      } else {
        state.selectedSources.delete(src.id);
      }
    });

    const label = document.createElement('label');
    label.htmlFor = `src-${src.id}`;
    label.textContent = src.name;
    label.style.cursor = 'pointer';
    label.style.flex = '1';

    const badge = document.createElement('span');
    badge.className = 'source-category-badge';
    badge.textContent = src.category || '';

    div.appendChild(cb);
    div.appendChild(label);
    div.appendChild(badge);
    dom.sourceList.appendChild(div);
  });
}

/** Filter the visible source list by the user's search text */
function filterSourceList(query) {
  const q = query.toLowerCase().trim();
  const items = dom.sourceList.querySelectorAll('.source-item');
  items.forEach((item) => {
    const name = item.querySelector('label')?.textContent.toLowerCase() || '';
    item.style.display = !q || name.includes(q) ? '' : 'none';
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARTICLE FETCH & RENDER
// ═══════════════════════════════════════════════════════════════════════════════

/** Collect the current state into a params object */
function buildCurrentParams() {
  const sourcesString = [...state.selectedSources].join(',');
  return {
    q:        state.isSearchMode ? state.query : (sourcesString ? '' : getCategoryQuery()),
    sources:  sourcesString,
    from:     state.from,
    to:       state.to,
    language: state.language,
    sortBy:   state.sortBy,
    page:     state.page,
    pageSize: state.pageSize,
  };
}

function getCategoryQuery() {
  const cat = CONFIG.CATEGORIES.find((c) => c.id === state.activeCategoryId);
  return cat ? cat.query : CONFIG.DEFAULT_QUERY;
}

async function fetchAndRender() {
  const params = buildCurrentParams();
  const key = buildFetchKey(params);

  // Skip if same params already fetched
  if (key === state.lastFetchParams) return;
  state.lastFetchParams = key;

  console.debug('[NewsHub] fetchAndRender', params);
  setLoading(true);
  hideStates();

  try {
    const { articles, totalResults } = await fetchEverything(params);
    console.debug('[NewsHub] Received', articles.length, 'articles, totalResults:', totalResults);

    if (!Array.isArray(articles)) {
      throw new Error('Unexpected API response: articles field is missing.');
    }

    state.articles     = articles;
    state.totalResults = totalResults;
    renderFeed(articles, totalResults);
  } catch (err) {
    console.error('[NewsHub] fetchAndRender error:', err);
    showError(err.message);
    if (err.message.includes('API key') || err.message.includes('not configured')) {
      dom.apiKeyBanner.classList.add('show');
    }
  } finally {
    setLoading(false);
  }
}

function renderFeed(articles, totalResults) {
  renderFeatured(articles[0] || null);
  renderGrid(articles.slice(1));
  renderPagination(totalResults);
  updateFilterBar();

  if (!articles.length) {
    showEmpty();
  }
}

// ── Featured card ──────────────────────────────────────────────────────────────
function renderFeatured(article) {
  if (!article) {
    dom.featuredSection.innerHTML = '';
    return;
  }

  const img = safeImageSrc(article.urlToImage);

  dom.featuredSection.innerHTML = `
    <div
      class="featured-card"
      role="button"
      tabindex="0"
      aria-label="Featured article: ${escapeHtml(article.title)}"
      data-article-index="0"
    >
      <img
        src="${escapeHtml(img)}"
        alt="${escapeHtml(article.title)}"
        loading="eager"
        onerror="this.src='${CONFIG.PLACEHOLDER_IMAGE}'"
      />
      <div class="featured-overlay">
        <span class="featured-badge">Featured</span>
        <h2 class="featured-title">${escapeHtml(article.title)}</h2>
        <div class="featured-meta">
          <span class="me-3"><i class="bi bi-newspaper me-1"></i>${escapeHtml(article.source?.name || 'Unknown source')}</span>
          <span><i class="bi bi-clock me-1"></i>${formatDate(article.publishedAt)}</span>
          ${article.author ? `<span class="ms-3"><i class="bi bi-person me-1"></i>${escapeHtml(article.author)}</span>` : ''}
        </div>
      </div>
    </div>
  `;

  // Click / keyboard open modal
  const card = dom.featuredSection.querySelector('.featured-card');
  card.addEventListener('click', () => openArticleModal(article));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openArticleModal(article); }
  });
}

// ── News grid ──────────────────────────────────────────────────────────────────
function renderGrid(articles) {
  dom.newsGrid.innerHTML = '';

  articles.forEach((article) => {
    const col = document.createElement('div');
    col.className = 'col';

    const img = safeImageSrc(article.urlToImage);

    col.innerHTML = `
      <article
        class="news-card"
        role="button"
        tabindex="0"
        aria-label="${escapeHtml(article.title)}"
      >
        <div class="news-card-img-wrapper">
          <img
            src="${escapeHtml(img)}"
            alt="${escapeHtml(article.title)}"
            loading="lazy"
            onerror="this.src='${CONFIG.PLACEHOLDER_IMAGE}'"
          />
        </div>
        <div class="news-card-body">
          <div class="news-card-source">${escapeHtml(article.source?.name || '')}</div>
          <h3 class="news-card-title">${escapeHtml(article.title)}</h3>
          ${article.description
            ? `<p class="news-card-desc">${escapeHtml(article.description)}</p>`
            : '<p class="news-card-desc text-muted fst-italic">No description available.</p>'
          }
          <div class="news-card-footer">
            <span class="news-card-author" title="${escapeHtml(article.author || '')}">
              ${article.author
                ? `<i class="bi bi-person me-1"></i>${escapeHtml(article.author)}`
                : '<span class="fst-italic">Unknown author</span>'
              }
            </span>
            <span class="news-card-date">
              <i class="bi bi-calendar3 me-1"></i>${formatDate(article.publishedAt)}
            </span>
          </div>
        </div>
      </article>
    `;

    const card = col.querySelector('.news-card');
    card.addEventListener('click', () => openArticleModal(article));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openArticleModal(article); }
    });

    dom.newsGrid.appendChild(col);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARTICLE DETAIL MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function openArticleModal(article) {
  // Image
  const imgSrc = safeImageSrc(article.urlToImage);
  dom.modalImage.src = imgSrc;
  dom.modalImage.alt = article.title || '';
  dom.modalImage.onerror = () => { dom.modalImage.src = CONFIG.PLACEHOLDER_IMAGE; };

  // Title
  dom.modalTitle.textContent = article.title || 'No title available';

  // Source
  dom.modalSourceName.textContent = article.source?.name || 'Unknown source';

  // Author
  if (article.author) {
    dom.modalAuthor.textContent = article.author;
    dom.modalAuthorWrap.classList.remove('d-none');
  } else {
    dom.modalAuthorWrap.classList.add('d-none');
  }

  // Date
  if (article.publishedAt) {
    dom.modalDate.textContent = formatDate(article.publishedAt);
    dom.modalDateWrap.classList.remove('d-none');
  } else {
    dom.modalDateWrap.classList.add('d-none');
  }

  // Description
  dom.modalDescription.textContent = article.description || 'No description available.';

  // Content (truncated snippet from API)
  if (article.content) {
    // NewsAPI appends "[+N chars]" — strip it for cleaner display
    const cleanContent = article.content.replace(/\[\+\d+ chars?\]$/, '').trim();
    dom.modalContent.textContent = cleanContent;
    dom.modalContentWrap.classList.remove('d-none');
  } else {
    dom.modalContentWrap.classList.add('d-none');
  }

  // Read full article button
  if (article.url) {
    dom.btnReadFull.href = article.url;
    dom.btnReadFull.classList.remove('d-none');
  } else {
    dom.btnReadFull.classList.add('d-none');
  }

  const modal = getArticleModal();
  if (modal) modal.show();
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGINATION
// ═══════════════════════════════════════════════════════════════════════════════
function renderPagination(totalResults) {
  dom.paginationWrapper.innerHTML = '';
  dom.paginationInfo.textContent = '';

  if (!totalResults) return;

  // NewsAPI caps at 100 results for free tier (page*pageSize ≤ 100)
  const cappedTotal = Math.min(totalResults, 100);
  const totalPages  = Math.ceil(cappedTotal / state.pageSize);
  if (totalPages <= 1) return;

  const currentPage = state.page;

  // Info line
  const startItem = (currentPage - 1) * state.pageSize + 1;
  const endItem   = Math.min(currentPage * state.pageSize, cappedTotal);
  dom.paginationInfo.textContent =
    `Showing ${startItem}–${endItem} of ${cappedTotal.toLocaleString()} articles`;

  // Prev button
  const prevBtn = makePaginationButton('‹ Prev', currentPage === 1, () => goToPage(currentPage - 1));
  dom.paginationWrapper.appendChild(prevBtn);

  // Page number buttons (window of 5)
  const windowSize = 5;
  let startPage = Math.max(1, currentPage - Math.floor(windowSize / 2));
  let endPage   = startPage + windowSize - 1;
  if (endPage > totalPages) {
    endPage   = totalPages;
    startPage = Math.max(1, endPage - windowSize + 1);
  }

  if (startPage > 1) {
    dom.paginationWrapper.appendChild(makePaginationButton('1', false, () => goToPage(1)));
    if (startPage > 2) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'page-btn';
      ellipsis.textContent = '…';
      ellipsis.style.pointerEvents = 'none';
      dom.paginationWrapper.appendChild(ellipsis);
    }
  }

  for (let p = startPage; p <= endPage; p++) {
    const btn = makePaginationButton(String(p), false, () => goToPage(p));
    if (p === currentPage) btn.classList.add('active');
    dom.paginationWrapper.appendChild(btn);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'page-btn';
      ellipsis.textContent = '…';
      ellipsis.style.pointerEvents = 'none';
      dom.paginationWrapper.appendChild(ellipsis);
    }
    dom.paginationWrapper.appendChild(
      makePaginationButton(String(totalPages), false, () => goToPage(totalPages))
    );
  }

  // Next button
  const nextBtn = makePaginationButton('Next ›', currentPage === totalPages, () => goToPage(currentPage + 1));
  dom.paginationWrapper.appendChild(nextBtn);
}

function makePaginationButton(label, disabled, onClick) {
  const btn = document.createElement('button');
  btn.className = 'page-btn';
  btn.textContent = label;
  btn.disabled = disabled;
  if (!disabled) btn.addEventListener('click', onClick);
  return btn;
}

function goToPage(page) {
  state.page = page;
  state.lastFetchParams = null; // force re-fetch
  fetchAndRender();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVE FILTER BAR
// ═══════════════════════════════════════════════════════════════════════════════
function updateFilterBar() {
  let label = '';

  if (state.isSearchMode) {
    label = `Search: "${state.query}"`;
  } else if (state.selectedSources.size > 0) {
    const names = [...state.selectedSources]
      .map((id) => {
        const src = state.sources.find((s) => s.id === id);
        return src ? src.name : id;
      })
      .join(', ');
    label = `Sources: ${names}`;
  } else {
    const cat = CONFIG.CATEGORIES.find((c) => c.id === state.activeCategoryId);
    label = cat ? cat.label : '';
  }

  dom.activeFilterLabel.textContent = label;
  dom.activeFilterBar.classList.toggle('d-none', !label);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE / UI HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
function hideStates() {
  dom.emptyState.classList.remove('active');
  dom.errorState.classList.remove('active');
}

function showEmpty() {
  dom.emptyState.classList.add('active');
}

function showError(message) {
  dom.errorMessage.textContent = message || 'An unexpected error occurred.';
  dom.errorState.classList.add('active');
  dom.featuredSection.innerHTML = '';
  dom.newsGrid.innerHTML = '';
  dom.paginationWrapper.innerHTML = '';
}

function setActiveCategory(categoryId) {
  state.activeCategoryId = categoryId;
  dom.categoryTabs.querySelectorAll('.nav-link').forEach((a) => {
    const isActive = a.dataset.category === categoryId;
    a.classList.toggle('active', isActive);
    a.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function resetToPage1() {
  state.page           = 1;
  state.lastFetchParams = null;
}

/**
 * Returns true if any sidebar filter differs from its default value.
 * Used to control the Apply / Reset All button states.
 */
function isFiltersDirty() {
  return (
    dom.filterSort.value     !== CONFIG.DEFAULT_SORT_BY ||
    dom.filterLanguage.value !== CONFIG.DEFAULT_LANGUAGE ||
    dom.filterFrom.value     !== '' ||
    dom.filterTo.value       !== ''
  );
}

/** Enable/disable Apply Filters and show/hide Reset All based on dirty state. */
function updateFilterButtons() {
  const dirty = isFiltersDirty();
  dom.btnApplyFilters.disabled = !dirty;
  dom.btnResetAllFilters.classList.toggle('d-none', !dirty);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Category selection ─────────────────────────────────────────────────────────
function onCategorySelect(cat) {
  state.isSearchMode = false;
  state.query        = cat.query;
  state.selectedSources.clear();
  uncheckAllSources();
  setActiveCategory(cat.id);
  dom.searchInput.value = '';
  dom.searchInputMobile.value = '';
  resetToPage1();
  fetchAndRender();
}

// ── Search ─────────────────────────────────────────────────────────────────────
function executeSearch(query) {
  const trimmed = query.trim();
  if (!trimmed) return;

  state.isSearchMode = true;
  state.query        = trimmed;
  state.selectedSources.clear();
  uncheckAllSources();
  resetToPage1();

  dom.feedHeading.textContent = `Results for "${trimmed}"`;

  fetchAndRender();
}

const debouncedSearch = debounce((val) => {
  if (val.trim()) executeSearch(val);
}, CONFIG.SEARCH_DEBOUNCE_MS);

// Desktop search form
dom.searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  executeSearch(dom.searchInput.value);
});
dom.searchInput.addEventListener('input', () => {
  debouncedSearch(dom.searchInput.value);
  if (!dom.searchInput.value.trim()) clearSearch();
});

// Mobile search form
dom.searchFormMobile.addEventListener('submit', (e) => {
  e.preventDefault();
  executeSearch(dom.searchInputMobile.value);
  // sync to desktop input
  dom.searchInput.value = dom.searchInputMobile.value;
  // close the navbar collapse
  const collapse = bootstrap.Collapse.getInstance(document.getElementById('navbarMobile'));
  if (collapse) collapse.hide();
});
dom.searchInputMobile.addEventListener('input', () => {
  debouncedSearch(dom.searchInputMobile.value);
  dom.searchInput.value = dom.searchInputMobile.value;
});

function clearSearch() {
  state.isSearchMode = false;
  state.query        = getCategoryQuery();
  dom.searchInput.value = '';
  dom.searchInputMobile.value = '';
  dom.feedHeading.textContent = 'Latest News';
  resetToPage1();
  fetchAndRender();
}

// ── Reset filter bar ───────────────────────────────────────────────────────────
dom.btnResetFilters.addEventListener('click', () => {
  clearSearch();
  state.selectedSources.clear();
  uncheckAllSources();
  resetToPage1();
  fetchAndRender();
});

// ── Empty state reset ──────────────────────────────────────────────────────────
dom.btnEmptyReset.addEventListener('click', () => {
  clearSearch();
  state.selectedSources.clear();
  uncheckAllSources();
  setActiveCategory('general');
  resetToPage1();
  fetchAndRender();
});

// ── Error retry ────────────────────────────────────────────────────────────────
dom.btnRetry.addEventListener('click', () => {
  state.lastFetchParams = null;
  fetchAndRender();
});

// ── Source filter ──────────────────────────────────────────────────────────────
dom.sourceSearch.addEventListener('input', () => filterSourceList(dom.sourceSearch.value));

dom.btnApplySources.addEventListener('click', () => {
  if (state.selectedSources.size === 0) return;
  state.isSearchMode = false;
  dom.searchInput.value = '';
  dom.searchInputMobile.value = '';
  dom.feedHeading.textContent = 'Latest News';
  resetToPage1();
  fetchAndRender();
});

dom.btnResetSources.addEventListener('click', () => {
  state.selectedSources.clear();
  uncheckAllSources();
  resetToPage1();
  fetchAndRender();
});

function uncheckAllSources() {
  dom.sourceList.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.checked = false;
  });
}

// ── Sidebar filters — update buttons on any control change ────────────────────
[dom.filterSort, dom.filterLanguage, dom.filterFrom, dom.filterTo].forEach((el) => {
  el.addEventListener('change', updateFilterButtons);
  el.addEventListener('input',  updateFilterButtons);
});

dom.btnApplyFilters.addEventListener('click', () => {
  state.sortBy   = dom.filterSort.value;
  state.language = dom.filterLanguage.value;
  state.from     = dom.filterFrom.value;
  state.to       = dom.filterTo.value;
  // After applying, the current control values become the "applied" baseline.
  // Buttons go back to their clean state until values change again.
  dom.btnApplyFilters.disabled = true;
  dom.btnResetAllFilters.classList.remove('d-none');
  resetToPage1();
  fetchAndRender();
});

dom.btnResetAllFilters.addEventListener('click', () => {
  // Reset filter controls to defaults
  dom.filterSort.value     = CONFIG.DEFAULT_SORT_BY;
  dom.filterLanguage.value = CONFIG.DEFAULT_LANGUAGE;
  dom.filterFrom.value     = '';
  dom.filterTo.value       = '';

  state.sortBy   = CONFIG.DEFAULT_SORT_BY;
  state.language = CONFIG.DEFAULT_LANGUAGE;
  state.from     = '';
  state.to       = '';

  // Hide Reset All and disable Apply since we're back to defaults
  dom.btnApplyFilters.disabled = true;
  dom.btnResetAllFilters.classList.add('d-none');

  // Reset sources
  state.selectedSources.clear();
  uncheckAllSources();

  // Reset search
  clearSearch();
  resetToPage1();
  fetchAndRender();
});

// ── Brand link (home) ──────────────────────────────────────────────────────────
document.getElementById('brand-link').addEventListener('click', (e) => {
  e.preventDefault();
  state.selectedSources.clear();
  uncheckAllSources();
  clearSearch();
  setActiveCategory('general');
  resetToPage1();
  fetchAndRender();
});

// ═══════════════════════════════════════════════════════════════════════════════
// BOOTSTRAP: FOOTER YEAR
// ═══════════════════════════════════════════════════════════════════════════════
dom.footerYear.textContent = new Date().getFullYear();

// ═══════════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════════
function init() {
  const keyMissing = !CONFIG.API_KEY || CONFIG.API_KEY === 'YOUR_NEWSAPI_API_KEY';

  if (keyMissing) {
    dom.apiKeyBanner.classList.add('show');
  }

  initCategoryTabs();
  initFilterControls();

  // Load sources asynchronously (non-blocking)
  loadSources();

  if (keyMissing) {
    // Show a friendly error immediately without firing a doomed API call
    showError(
      'Please configure your NewsAPI key in js/config.js to load articles. ' +
      'Get a free key at newsapi.org/register'
    );
    return;
  }

  // Initial article fetch
  fetchAndRender();
}

init();
