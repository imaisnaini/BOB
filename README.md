# BOB — Front-End Project Collection

A collection of standalone front-end mini-applications, each living in its own folder and runnable directly in a browser (or via a local server where required).

---

## Apps

| Folder | App | Description |
|---|---|---|
| [`Climate/`](#climate--climate-intelligence-dashboard) | Climate Intelligence Dashboard | Static climate data dashboard |
| [`Date/`](#date--mau-gak-) | Mau Gak? 💌 | Interactive date-asking web experience |
| [`Game/`](#game--bug-hunter-) | Bug Hunter 🐛 | Typing-based arcade game |
| [`ToDo/`](#todo--task-list) | Task List | Local-storage–backed to-do app |
| [`news-website/`](#news-website--newshub) | NewsHub | Live news feed powered by NewsAPI |

---

## Climate — Climate Intelligence Dashboard

A fully static, pixel-polished **climate data dashboard** with a sidebar layout. Displays key climate KPIs (temperature anomaly, CO₂ concentration, renewable energy share, risk index), active disaster alerts, a sustainability progress tracker, and a climate news section.

**Technology:** Plain HTML5 + CSS3 (no JavaScript, no dependencies).

**How to run:**
```bash
# Just open the file directly in any browser:
open Climate/index.html
```

---

## Date — Mau Gak? 💌

A playful, multi-scene **date-asking web experience** (in Indonesian). It features an animated loading sequence that "uploads feelings", a swipeable stats carousel, a question scene where the "No" button actively dodges the cursor, a confetti celebration on acceptance, and a WhatsApp deep-link to send a date confirmation message.

**Technology:** Single-file HTML5 with all CSS and JavaScript inlined. No external dependencies.

**How to run:**
```bash
# Open directly in any browser:
open Date/index.html

# Optional URL parameters:
# ?to=Name     – recipient's name shown in the experience
# ?from=Name   – sender's name shown on the confirmation ticket
# Example: Date/index.html?to=Sarah&from=Alex
```

---

## Game — Bug Hunter 🐛

An **arcade typing game** where bugs fall from the top of the screen carrying error names (e.g. `TypeError`, `NullPointerException`). Type the error name and press Enter to destroy the bug before it reaches the production server. Features a combo multiplier, increasing difficulty every 30 seconds, lives system, hi-score persistence via `localStorage`, Web Audio API sound effects, and a pause/resume flow.

**Technology:** Single-file HTML5 with all CSS and JavaScript inlined. Web Audio API for synthesised sound effects. No external dependencies.

**How to run:**
```bash
# Open directly in any browser:
open Game/index.html
```

---

## ToDo — Task List

A clean, accessible **to-do list app** with add, complete, edit, and delete task actions. Supports filtering by All / Active / Completed, an inline edit modal, a "Clear completed" action, and a live task counter. All tasks are persisted in `localStorage`.

**Technology:** HTML5 · [Tailwind CSS](https://tailwindcss.com/) (via CDN) · Vanilla JavaScript (`script.js`).

**How to run:**
```bash
# Open directly in any browser:
open ToDo/index.html
```

---

## news-website — NewsHub

A responsive **news discovery website** that fetches live articles from [NewsAPI](https://newsapi.org/). Features a featured article banner, a paginated card grid, category tabs (General, Business, Technology, Science, Health, Sports, Entertainment), a searchable publisher list, keyword search with debounce, date-range / language / sort filters, and an article detail modal.

**Technology:** HTML5 · [Bootstrap 5](https://getbootstrap.com/) · Bootstrap Icons · Vanilla JavaScript (split across `config.js`, `api.js`, `app.js`).

**Setup:**

1. Register for a free API key at <https://newsapi.org/register>.
2. Open `news-website/js/config.js` and replace the placeholder:
   ```js
   API_KEY: 'YOUR_NEWSAPI_API_KEY',
   ```

3. Serve via a local web server (NewsAPI blocks `file://` origins):

   ```bash
   # Python 3
   cd news-website
   python3 -m http.server 8080
   # then open http://localhost:8080
   ```

   ```bash
   # Node.js
   npx serve news-website
   ```

   Or use the **Live Server** extension in VS Code (right-click `index.html` → *Open with Live Server*).

---

## Project Structure

```
BOB/
├── Climate/
│   ├── index.html      Dashboard markup
│   └── style.css       Dashboard styles
├── Date/
│   └── index.html      All-in-one date experience (HTML + CSS + JS)
├── Game/
│   └── index.html      All-in-one typing game (HTML + CSS + JS)
├── ToDo/
│   ├── index.html      App markup
│   ├── style.css       Custom styles
│   └── script.js       Task logic & localStorage
└── news-website/
    ├── index.html      App markup
    ├── css/
    │   └── style.css   Custom styles on top of Bootstrap
    └── js/
        ├── config.js   API key, categories, defaults
        ├── api.js      NewsAPI fetch helpers
        └── app.js      UI rendering & state management
```
