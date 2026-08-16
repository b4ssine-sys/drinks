# Beverage Tracking Platform: A Lightweight Approach

## Problem Statement

In shared workspaces, people notice their coworkers' drink habits — the daily refresher, the third cold brew, the afternoon bubble tea. It becomes a running joke, a bonding ritual, a piece of office culture. But there is no simple way to actually track it. Existing health apps are personal, private, and bloated with features nobody asked for. What is missing is a lightweight, shared drink counter that a group can use together — tap a button when you see someone grab their drink, and watch the tally climb through the day.

## Design Goals

1. **Ultra-lightweight** — minimal dependencies, fast to start, fast to use. No heavyweight frameworks.
2. **Node.js full stack** — Node.js serves the frontend, runs the backend, and hosts the application. One runtime, one language, one deployment target.
3. **Iterative by design** — start with the smallest useful version and layer capabilities on top without rewriting what came before. Each iteration is independently deployable.
4. **Free to host** — deployable on free-tier Node.js hosting services at zero cost.
5. **Multi-user, shared access** — multiple people open the same site and can log drinks for anyone in the group. This is a communal board, not a personal diary.
6. **UI separated from logic** — presentation code and business logic live in separate layers so either can be changed independently.

## Core Concept

The app is a shared drink counter board. Each person in the group has a card on the board. When anyone in the group sees a coworker grab a drink, they tap that person's card to log it. The count updates and everyone on the site sees the tally.

**Example flow:**
1. You see your coworker Sarah grab her second Starbucks refresher.
2. You open the site on your phone.
3. You tap Sarah's card and select "Refresher."
4. Sarah's drink count for the day goes from 1 to 2.
5. Everyone else on the site sees the updated count.

## Visual Design: Retro Tokyo x Miami Vice

The visual identity blends two aesthetics:

### Retro Japan

- Pixel-style typography and iconography inspired by 1980s Japanese arcade games and vending machine interfaces.
- Warm neon glows against dark backgrounds — think late-night Tokyo street signage.
- Compact, tile-based card layouts reminiscent of Japanese train station drink menus.
- Subtle grid patterns and halftone textures.

### Retro Miami Vice

- A color palette anchored in hot pink, electric teal, soft coral, and deep purple gradients.
- Chrome and metallic accents on borders and dividers.
- Horizontal sunset gradient stripes as section separators.
- Sans-serif headline fonts with wide letter-spacing — clean, confident, 1980s luxury.

### Combined Effect

The result is a neon-soaked, tile-based dashboard that feels like a Tokyo arcade machine designed by a Miami Beach nightclub. Dark background, glowing cards, pixel accents, gradient edges. Playful but legible. Retro but responsive.

## Technology Stack

### Runtime: Node.js

Node.js is the single runtime for the entire application. It serves the frontend, handles API requests, and manages data persistence. No separate web server, no separate backend language.

### Backend: Express.js (Node.js)

A lightweight Express server provides:

- **Static file serving** — serves the HTML, CSS, and JavaScript frontend.
- **REST API** — endpoints for logging drinks, querying counts, and managing people.
- **In-memory + file persistence** — data stored in a JSON file on disk, loaded into memory on startup. No database required.
- **WebSocket support** — real-time updates pushed to all connected browsers via `ws` or Socket.io.

### Frontend: Vanilla HTML/CSS/JS

The frontend is plain HTML, CSS, and JavaScript served by the Node.js backend. No React, no Vue, no build step. The browser loads static files and communicates with the backend over REST and WebSocket.

### Project Structure

```
drinks/
  server.js          — Express server, API routes, WebSocket setup
  lib/
    logic.js         — pure business logic (no Express, no DOM)
    store.js         — data persistence (read/write JSON file)
  public/
    index.html       — main page markup
    css/
      style.css      — retro Tokyo x Miami Vice theme
    js/
      app.js         — UI rendering and event handling
      api.js         — fetch wrapper for backend communication
  data/
    drinks.json      — persistent data file (auto-created)
  package.json
```

## Architecture

### Separation of UI and Logic

The codebase enforces a strict boundary between three layers:

**Logic Layer** (`lib/logic.js`) — pure functions with no side effects:
- `createEntry(personId, beverage, loggedBy)` — builds a drink entry object.
- `addEntry(entries, entry)` — returns a new array with the entry appended.
- `getDailySummary(entries, date)` — computes drink counts and totals for a given day.
- `getPersonSummary(entries, personId, date)` — returns one person's daily tally.

**Server Layer** (`server.js`, `lib/store.js`) — handles HTTP, WebSocket, and persistence:
- Receives API requests and delegates to the logic layer.
- Persists state to a JSON file on disk.
- Broadcasts updates to all connected clients via WebSocket.

**UI Layer** (`public/js/app.js`, `public/css/style.css`) — renders state to the DOM:
- Renders person cards with drink counts.
- Handles tap/click events and sends requests to the API.
- Listens for WebSocket messages to update the display in real time.

The logic layer can be tested with plain Node.js — no browser, no server. The UI layer can be reskinned without touching the counting logic. The server layer can swap its persistence backend without affecting either.

### Data Shape

Every drink event is a flat JSON object:

```json
{
  "id": "a1b2c3",
  "timestamp": "2026-08-16T09:15:00Z",
  "person": "sarah",
  "beverage": "refresher",
  "logged_by": "mike"
}
```

No volume tracking, no calories, no nutritional data. Just who drank what, when, and who saw it.

### Multi-User Access

Because the Node.js server is the single source of truth, all connected browsers see the same data from the start. When one user logs a drink, the server persists it and broadcasts the update over WebSocket to every open client. No polling, no manual refresh.

### Hosting Strategy

The app is a Node.js process. Any free-tier Node.js hosting service works:

| Service | How to Deploy | Always On (Free Tier) |
|---|---|---|
| **Render** | Connect a Git repo, set start command to `node server.js` | Spins down after inactivity, wakes on request |
| **Railway** | Connect a Git repo, auto-detects Node.js | 500 hours/month free |
| **Glitch** | Import from GitHub or edit in browser | Sleeps after 5 min inactivity |
| **Fly.io** | `fly launch` from the command line | 3 shared VMs free |
| **Cyclic** | Connect a Git repo | Serverless, scales to zero |

For always-on behavior on a free tier, Render or Railway are the strongest options. Glitch is good for quick demos and collaborative editing.

## Iteration Plan

### Iteration 0 — Tap to Count

The smallest useful version. A Node.js server that:

- Serves a single page with a card for each person in the group.
- Each card has a button to log a drink (defaults to a generic "drink").
- Tapping the button sends a POST to the API, which persists the entry and broadcasts the update.
- All connected browsers see the count update in real time via WebSocket.
- The count resets visually each day.
- Styled with the retro Tokyo x Miami Vice theme from day one.

**Done when:** you tap a coworker's card on your phone and your coworker sees the count go up on their laptop.

### Iteration 1 — Beverage Selection

Add drink-specific logging:

- Tapping a person's card opens a beverage picker (refresher, coffee, tea, water, soda, etc.).
- Each beverage has its own count on the card.
- Users can add custom beverages via the UI.

**Done when:** Sarah's card shows "Refresher x3, Coffee x1."

### Iteration 2 — Daily History and Trends

Add the ability to look back:

- API endpoints for querying historical data by date range.
- View previous days' counts in the UI.
- Simple inline charts (SVG or canvas, no library) showing drink frequency over time.
- "Most consumed" and "streak" indicators per person.

**Done when:** you can see that Sarah averaged 4 refreshers a day this week.

### Iteration 3 — Group Management

Add the ability to manage the group:

- API endpoints for adding, removing, and updating people.
- Each person can have a display name and avatar (emoji or initials).
- Configurable beverage presets per person (Sarah's default is "Refresher," Mike's is "Cold Brew").

**Done when:** a new coworker joins the team and can be added to the board in seconds.

### Iteration 4 — Persistent Database

Replace the JSON file with a lightweight database:

- SQLite via `better-sqlite3` for zero-config, file-based persistence.
- Migration path: import existing `drinks.json` into SQLite on first run.
- Faster queries for historical data and trends.

**Done when:** the app handles months of data without slowing down.

### Iteration 5 — Progressive Web App

Make the app installable:

- Service worker for offline caching of static assets.
- Web app manifest for home screen installation.
- Queued offline entries that sync when the connection is restored.

**Done when:** the team has the app on their home screens and can log drinks even when the Wi-Fi drops.

## What This Platform Is Not

- **Not a calorie tracker.** It does not estimate nutritional content.
- **Not a personal health app.** It is a shared, social activity board.
- **Not a subscription service.** It costs nothing to run on free-tier hosting.
- **Not a native app.** It runs in the browser, served by Node.js.

## Summary

The platform is a Node.js application styled like a neon-lit Tokyo arcade crossed with a Miami Vice sunset. Node.js serves the frontend, runs the API, and persists data — one runtime, one language, one deployment. A group of coworkers opens the same page, taps buttons when they see each other grab a drink, and watches the tallies update in real time across every screen. The UI is static files. The logic is pure functions. The data is flat JSON. Run `node server.js`, open a browser, start counting.
