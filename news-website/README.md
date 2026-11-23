# NewsHub

A lightweight, responsive news discovery website powered by [NewsAPI](https://newsapi.org/).

Browse, search, filter, and read news articles from hundreds of publishers worldwide.

---

## Features

| Feature | Details |
|---|---|
| **News Feed** | Responsive card grid with featured article, thumbnail, description, source, date, and author |
| **Article Detail** | Bootstrap modal with full available content and a "Read Full Article" link |
| **Category Navigation** | General · Business · Technology · Science · Health · Sports · Entertainment |
| **Source Directory** | Searchable, checkable list of publishers fetched from `/v2/sources` |
| **Search** | Keyword search with debounce (500 ms) and clear/reset option |
| **Filters & Sort** | Date range, language, sort order (newest / relevancy / popularity) |
| **Pagination** | Page controls respecting NewsAPI's 100-result cap |
| **Loading / Error / Empty states** | Spinner overlay, error banner with retry, empty-results message |
| **Responsive layout** | Bootstrap 5 grid — works on desktop, tablet, and mobile |

---

## Project Structure

```
news-website/
├── index.html          Main page structure
├── css/
│   └── style.css       Custom styles layered on Bootstrap 5
├── js/
│   ├── config.js       API key, default settings, category/language/sort options
│   ├── api.js          All NewsAPI fetch calls (fetchEverything, fetchSources)
│   └── app.js          UI rendering, state management, event handlers
└── README.md           This file
```

---

## Setup

### 1. Get a free API key

Register at [https://newsapi.org/register](https://newsapi.org/register).  
The free Developer plan allows up to **100 requests/day**.

### 2. Configure your API key

Open **`js/config.js`** and replace the placeholder:

```js
API_KEY: 'YOUR_NEWSAPI_API_KEY',
```

Replace `YOUR_NEWSAPI_API_KEY` with your actual key, for example:

```js
API_KEY: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
```

### 3. Serve over HTTPS or localhost

**NewsAPI blocks requests from `file://` origins.**  
You must run the site through a local web server. Options:

#### VS Code — Live Server extension
Install [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer),
right-click `index.html`, and choose **Open with Live Server**.

#### Python (built-in)
```bash
# Python 3
cd news-website
python3 -m http.server 8080
# then open http://localhost:8080
```

#### Node.js — npx serve
```bash
npx serve news-website
```

---

## Customisation

| File | What to change |
|---|---|
| `js/config.js` | API key, default language, page size, category queries |
| `css/style.css` | Colours (via CSS custom properties at `:root`), layout tweaks |
| `js/config.js → CATEGORIES` | Add, remove, or rename categories and their search queries |

---

## API Notes

- **Endpoint used:** `GET /v2/everything` for articles, `GET /v2/sources` for publishers.
- **Category filtering** is implemented via predefined keyword queries because `/v2/everything` does not accept a `category` parameter directly.
- **Free tier limit:** 100 results per topic (pages × pageSize ≤ 100). The pagination UI enforces this.
- **Article content:** NewsAPI returns only a short snippet (up to ~200 characters). The modal clearly labels this as a preview and provides a link to the original publisher.
- Never commit your real API key to version control. For a production deployment, proxy the API key server-side.

---

## Browser Support

Modern browsers with native `fetch`, `async/await`, and CSS custom property support (Chrome 60+, Firefox 55+, Safari 12+, Edge 79+).

---

## License

Personal / educational use. News data provided by [NewsAPI](https://newsapi.org/).
