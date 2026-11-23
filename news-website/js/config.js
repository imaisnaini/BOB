/**
 * config.js
 * Application configuration and settings for NewsAPI integration.
 *
 * HOW TO SET YOUR API KEY:
 *   Replace 'YOUR_NEWSAPI_API_KEY' with your actual key from https://newsapi.org/
 */

const CONFIG = {
  // ── API ────────────────────────────────────────────────────────────────────
  API_KEY: 'bcd62d59431b49488528f5926f606c05',
  BASE_URL: 'https://newsapi.org/v2',

  // ── Default query settings ─────────────────────────────────────────────────
  DEFAULT_QUERY: 'world',        // initial keyword shown on first load
  DEFAULT_PAGE_SIZE: 12,         // articles per page
  DEFAULT_SORT_BY: 'publishedAt',// publishedAt | relevancy | popularity
  DEFAULT_LANGUAGE: 'en',

  // ── Categories → search queries ────────────────────────────────────────────
  // The /v2/everything endpoint has no native category param.
  // We map each category to a representative keyword search.
  CATEGORIES: [
    { id: 'general',       label: 'General',       query: 'world news'   },
    { id: 'business',      label: 'Business',       query: 'business'     },
    { id: 'technology',    label: 'Technology',     query: 'technology'   },
    { id: 'science',       label: 'Science',        query: 'science'      },
    { id: 'health',        label: 'Health',         query: 'health'       },
    { id: 'sports',        label: 'Sports',         query: 'sports'       },
    { id: 'entertainment', label: 'Entertainment',  query: 'entertainment'},
  ],

  // ── Language options ───────────────────────────────────────────────────────
  LANGUAGES: [
    { code: '',   label: 'All Languages' },
    { code: 'en', label: 'English'       },
    { code: 'es', label: 'Spanish'       },
    { code: 'fr', label: 'French'        },
    { code: 'de', label: 'German'        },
    { code: 'it', label: 'Italian'       },
    { code: 'pt', label: 'Portuguese'    },
    { code: 'ru', label: 'Russian'       },
    { code: 'zh', label: 'Chinese'       },
    { code: 'ar', label: 'Arabic'        },
    { code: 'ja', label: 'Japanese'      },
  ],

  // ── Sort options ───────────────────────────────────────────────────────────
  SORT_OPTIONS: [
    { value: 'publishedAt', label: 'Newest First'  },
    { value: 'relevancy',   label: 'Most Relevant' },
    { value: 'popularity',  label: 'Most Popular'  },
  ],

  // ── Fallback image ─────────────────────────────────────────────────────────
  PLACEHOLDER_IMAGE: 'https://placehold.co/800x450/e9ecef/6c757d?text=No+Image',

  // ── Debounce delay (ms) for search input ───────────────────────────────────
  SEARCH_DEBOUNCE_MS: 500,
};
