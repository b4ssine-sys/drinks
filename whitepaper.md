# Beverage Tracking Platform: A Lightweight Approach

## Problem Statement

People drink a variety of beverages throughout the day — water, coffee, tea, juice, smoothies, sodas, alcohol — but rarely have a clear picture of what they actually consume. Existing health trackers either ignore beverages entirely, bury them inside bloated calorie-counting apps, or require scanning barcodes for packaged drinks. There is no simple, standalone tool focused purely on beverage consumption.

## Design Goals

1. **Ultra-lightweight** — a single HTML file with inline CSS and JavaScript. No frameworks, no bundlers, no node_modules.
2. **Zero external dependencies** — everything the app needs is self-contained in one file. No CDN links, no third-party scripts, no API calls.
3. **Iterative by design** — start with the smallest useful version and layer capabilities on top without rewriting what came before. Each iteration is independently deployable.
4. **Free to host** — deployable on GitHub Pages, Netlify, Cloudflare Pages, or any static hosting service at zero cost. No server, no database, no backend.
5. **Offline-capable** — all data lives in the browser's `localStorage`. The app works without an internet connection after the first load.

## Platform Architecture

### Single HTML File

The entire application is one `index.html` file. CSS is inlined in a `<style>` block. JavaScript is inlined in a `<script>` block. There is nothing to install, nothing to build, and nothing to configure. Deploying the app means pushing one file to a static host.

### Decoupled Internal Modules

Inside the single file, the JavaScript is organized as independent modules that communicate through plain data structures. No module calls into another directly. This means:

- The **input module** captures what the user drank and when via a form.
- The **storage module** persists entries to `localStorage` as JSON.
- The **display module** reads the store and renders the log and summaries.
- The **export module** transforms stored data into downloadable formats.

Each module can be rewritten without affecting the others. The contract between them is the data shape, not the implementation.

### Data Shape

Every beverage entry is a flat JSON object:

```json
{
  "id": "a1b2c3",
  "timestamp": "2026-08-16T09:15:00Z",
  "beverage": "coffee",
  "volume_ml": 350,
  "tags": ["caffeinated", "hot"],
  "notes": ""
}
```

No nested structures. No relational joins. One entry, one object. The entire dataset is a JSON array of these objects stored under a single `localStorage` key.

### Hosting Strategy

The app is a static file. Any free static hosting service works:

| Service | How to Deploy | Custom Domain |
|---|---|---|
| **GitHub Pages** | Push `index.html` to a repo, enable Pages in settings | Yes (free) |
| **Netlify** | Drag and drop the file, or connect a Git repo | Yes (free) |
| **Cloudflare Pages** | Connect a Git repo | Yes (free) |
| **Surge.sh** | `surge ./` from the command line | Yes (free) |

GitHub Pages is the default choice since the source code already lives on GitHub. Enabling it is a single toggle in repository settings.

## Iteration Plan

### Iteration 0 — Log a Drink

The smallest useful version. A single `index.html` file that:

- Shows a form with a beverage name, volume, and optional tags.
- Saves each entry to `localStorage` with a timestamp.
- Displays today's log as a simple list below the form.
- Works on mobile and desktop.

No install step. No config. Open the page, log a drink.

**Done when:** a user can log "coffee 350ml" and see their day's entries.

### Iteration 1 — Daily Summary

Add a summary card above the log:

- Total volume consumed today.
- Beverage frequency count (e.g., "coffee x3, water x5").
- Hydration indicator (flag if water intake is below a threshold).

**Done when:** a user can glance at their daily intake in one view.

### Iteration 2 — History and Navigation

Add the ability to view past days:

- Date picker or arrow navigation to browse previous days.
- Entries grouped by date.
- Delete or edit individual entries.

**Done when:** a user can review what they drank last Tuesday.

### Iteration 3 — Trends and Patterns

Add a trends view using inline SVG or canvas (no charting library):

- Weekly and monthly volume charts.
- Most-consumed beverages over time.
- Caffeine and hydration streaks.

**Done when:** a user can see whether they're drinking more water this month than last.

### Iteration 4 — Data Portability

Add import and export capabilities:

- Export all data as a single JSON file download.
- Import a previously exported JSON file to restore or migrate data.
- Clear all data with a confirmation step.

**Done when:** a user can move their data to a new browser or device.

### Iteration 5 — Progressive Web App

Make the app installable and fully offline:

- Add a service worker for offline caching (inlined in the same HTML file or as a minimal second file).
- Add a web app manifest so the app can be installed to the home screen.
- The app loads and functions with no network connection.

**Done when:** a user can tap an icon on their phone's home screen and log a drink with airplane mode on.

## What This Platform Is Not

- **Not a calorie tracker.** It does not estimate nutritional content.
- **Not a social app.** There are no profiles, leaderboards, or sharing features.
- **Not a subscription service.** There is no server to pay for.
- **Not a native app.** It runs in the browser. That is a feature, not a limitation.

## Summary

The platform is one HTML file. It costs nothing to host. It requires nothing to build. Data stays in the user's browser. Each iteration adds a layer without rewriting what came before. Ship `index.html`, open a browser, log a drink.
