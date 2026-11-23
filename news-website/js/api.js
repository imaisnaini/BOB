/**
 * api.js
 * NewsAPI integration — all network calls live here.
 * Depends on: config.js (CONFIG must be loaded first)
 */

'use strict';

// ── In-flight request tracking (prevents duplicate concurrent calls) ──────────
const _pendingRequests = new Map();

/**
 * Core fetch wrapper.
 * @param {string} endpoint  e.g. '/everything' or '/sources'
 * @param {Object} params    Query-string parameters (key/value pairs)
 * @returns {Promise<Object>} Parsed JSON response
 */
async function _apiFetch(endpoint, params = {}) {
  // Guard: only the literal placeholder string means "not configured"
  if (!CONFIG.API_KEY || CONFIG.API_KEY === 'YOUR_NEWSAPI_API_KEY') {
    throw new Error('API key not configured. Open js/config.js and replace YOUR_NEWSAPI_API_KEY with your NewsAPI key.');
  }

  // Build URL — omit apiKey from the logged params for security
  const url = new URL(`${CONFIG.BASE_URL}${endpoint}`);
  url.searchParams.set('apiKey', CONFIG.API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  const urlString = url.toString();

  // Log the request (mask the key in output)
  const loggableUrl = urlString.replace(CONFIG.API_KEY, '***');
  console.debug('[NewsAPI] REQUEST', endpoint, params);

  // Deduplicate concurrent identical requests
  if (_pendingRequests.has(urlString)) {
    console.debug('[NewsAPI] Deduplicating in-flight request for', endpoint);
    return _pendingRequests.get(urlString);
  }

  const promise = fetch(urlString)
    .then(async (res) => {
      _pendingRequests.delete(urlString);

      console.debug('[NewsAPI] RESPONSE', endpoint, res.status, res.statusText);

      if (res.status === 426) {
        throw new Error('NewsAPI requires HTTPS. Please serve this page over HTTPS or use localhost.');
      }
      if (res.status === 401) {
        throw new Error('Invalid API key. Check your key in js/config.js.');
      }
      if (res.status === 429) {
        throw new Error('Rate limit reached. Please wait a moment before retrying.');
      }

      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        throw new Error(`Failed to parse API response (HTTP ${res.status}): ${parseErr.message}`);
      }

      if (!res.ok || data.status === 'error') {
        const msg = data.message || `Request failed with status ${res.status}`;
        console.error('[NewsAPI] API error:', msg);
        throw new Error(msg);
      }

      console.debug('[NewsAPI] OK', endpoint, '—', data.totalResults ?? (data.sources?.length ?? 0), 'results');
      return data;
    })
    .catch((err) => {
      _pendingRequests.delete(urlString);
      console.error('[NewsAPI] FETCH ERROR', endpoint, err.message);
      throw err;
    });

  _pendingRequests.set(urlString, promise);
  return promise;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch articles from /v2/everything.
 *
 * @param {Object} options
 * @param {string}  options.q          Keyword search query (required by endpoint)
 * @param {string}  [options.sources]  Comma-separated source IDs
 * @param {string}  [options.from]     ISO date string (YYYY-MM-DD)
 * @param {string}  [options.to]       ISO date string (YYYY-MM-DD)
 * @param {string}  [options.language] 2-letter language code
 * @param {string}  [options.sortBy]   publishedAt | relevancy | popularity
 * @param {number}  [options.page]     Page number (default 1)
 * @param {number}  [options.pageSize] Results per page (default CONFIG.DEFAULT_PAGE_SIZE)
 * @returns {Promise<{articles: Array, totalResults: number}>}
 */
async function fetchEverything({
  q = CONFIG.DEFAULT_QUERY,
  sources = '',
  from = '',
  to = '',
  language = CONFIG.DEFAULT_LANGUAGE,
  sortBy = CONFIG.DEFAULT_SORT_BY,
  page = 1,
  pageSize = CONFIG.DEFAULT_PAGE_SIZE,
} = {}) {
  // /everything requires either q or sources
  const effectiveQ = sources ? '' : (q || CONFIG.DEFAULT_QUERY);

  const params = {
    sortBy,
    page,
    pageSize,
  };

  if (effectiveQ) params.q = effectiveQ;
  if (sources)    params.sources = sources;
  if (from)       params.from = from;
  if (to)         params.to = to;
  // NewsAPI rejects requests that mix `sources` with `language` or `country`
  if (language && !sources) params.language = language;

  const data = await _apiFetch('/everything', params);
  return {
    articles:     data.articles     || [],
    totalResults: data.totalResults || 0,
  };
}

/**
 * Fetch available news sources from /v2/sources.
 *
 * @param {Object} options
 * @param {string} [options.category] Filter by category
 * @param {string} [options.language] 2-letter language code
 * @param {string} [options.country]  2-letter country code
 * @returns {Promise<Array>} Array of source objects
 */
async function fetchSources({ category = '', language = '', country = '' } = {}) {
  const data = await _apiFetch('/sources', { category, language, country });
  return data.sources || [];
}
