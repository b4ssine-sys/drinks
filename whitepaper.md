# Beverage Tracking Platform: A Lightweight Approach

## Problem Statement

In shared workspaces, people notice their coworkers' drink habits — the daily refresher, the third cold brew, the afternoon bubble tea. It becomes a running joke, a bonding ritual, a piece of office culture. But there is no simple way to actually track it. Existing health apps are personal, private, and bloated with features nobody asked for. What is missing is a lightweight, shared drink counter that a group can use together — tap a button when you see someone grab their drink, and watch the tally climb through the day.

## Design Goals

1. **Ultra-lightweight** — a single HTML file with inline CSS and JavaScript. No frameworks, no bundlers, no node_modules.
2. **Zero external dependencies** — everything the app needs is self-contained. No CDN links, no third-party scripts.
3. **Iterative by design** — start with the smallest useful version and layer capabilities on top without rewriting what came before. Each iteration is independently deployable.
4. **Free to host** — deployable on GitHub Pages, Netlify, Cloudflare Pages, or any static hosting service at zero cost. No server, no database, no backend.
5. **Multi-user, shared access** — multiple people open the same site and can log drinks for anyone in the group. This is a communal board, not a personal diary.
6. **UI separated from logic** — presentation code and business logic are cleanly decoupled so either layer can be changed independently.

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

## Architecture

### Separation of UI and Logic

The codebase enforces a strict boundary between presentation and business logic:

**Logic Layer** — pure functions with no DOM access:
- `createEntry(personId, beverage)` — builds a drink entry object.
- `addEntry(store, entry)` — appends an entry to the data store and returns the new state.
- `getDailySummary(store, date)` — computes drink counts and totals for a given day.
- `getPersonSummary(store, personId, date)` — returns one person's daily tally.

**UI Layer** — reads state from the logic layer and renders to the DOM:
- Renders person cards with drink counts.
- Handles tap/click events and calls into the logic layer.
- Updates the display when state changes.

The logic layer can be tested without a browser. The UI layer can be reskinned without touching the counting logic.

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

No volume tracking, no calories, no nutritional data. Just who drank what, when, and who saw it. The dataset is a JSON array stored in `localStorage` under a single key.

### Multi-User Access

In early iterations, each browser holds its own copy of the data in `localStorage`. Users on different devices see their own logs. This is acceptable for a small group in the same room — one person is the designated logger, or a shared tablet sits on a desk.

In later iterations, shared state is introduced so all browsers see the same counts in real time.

### Hosting Strategy

The app is a static file. Any free static hosting service works:

| Service | How to Deploy | Custom Domain |
|---|---|---|
| **GitHub Pages** | Push `index.html` to a repo, enable Pages in settings | Yes (free) |
| **Netlify** | Drag and drop the file, or connect a Git repo | Yes (free) |
| **Cloudflare Pages** | Connect a Git repo | Yes (free) |
| **Surge.sh** | `surge ./` from the command line | Yes (free) |

GitHub Pages is the default choice since the source code already lives on GitHub.

## Iteration Plan

### Iteration 0 — Tap to Count

The smallest useful version. A single `index.html` file that:

- Displays a card for each person in the group.
- Each card has a button to log a drink (defaults to a generic "drink").
- Tapping the button increments that person's daily count.
- The count resets visually each day.
- Data persists in `localStorage`.
- Styled with the retro Tokyo x Miami Vice theme from day one.

**Done when:** you can tap a coworker's card and see their drink count go up.

### Iteration 1 — Beverage Selection

Add drink-specific logging:

- Tapping a person's card opens a beverage picker (refresher, coffee, tea, water, soda, etc.).
- Each beverage has its own count on the card.
- Users can add custom beverages.

**Done when:** Sarah's card shows "Refresher x3, Coffee x1."

### Iteration 2 — Daily History and Trends

Add the ability to look back:

- View previous days' counts.
- Simple inline charts (SVG or canvas, no library) showing drink frequency over time.
- "Most consumed" and "streak" indicators per person.

**Done when:** you can see that Sarah averaged 4 refreshers a day this week.

### Iteration 3 — Group Management

Add the ability to manage the group:

- Add or remove people from the board.
- Each person can have a display name and avatar (emoji or initials).
- Configurable beverage presets per person (Sarah's default is "Refresher," Mike's is "Cold Brew").

**Done when:** a new coworker joins the team and can be added to the board in seconds.

### Iteration 4 — Shared State

Make the board truly multi-user:

- All browsers see the same counts in real time.
- Use a lightweight free backend (Firebase Realtime Database free tier, or Supabase free tier) to sync state.
- Fallback to `localStorage` if the sync service is unavailable.
- The app still works offline; it syncs when reconnected.

**Done when:** you log a drink on your phone and your coworker sees the count update on their laptop.

### Iteration 5 — Progressive Web App

Make the app installable:

- Service worker for offline caching.
- Web app manifest for home screen installation.
- Push notification support for milestones ("Sarah just hit 5 refreshers today").

**Done when:** the team has the app on their home screens and gets a notification when someone hits a new daily record.

## What This Platform Is Not

- **Not a calorie tracker.** It does not estimate nutritional content.
- **Not a personal health app.** It is a shared, social activity board.
- **Not a subscription service.** It costs nothing to run in its default configuration.
- **Not a native app.** It runs in the browser. That is a feature, not a limitation.

## Summary

The platform is one HTML file styled like a neon-lit Tokyo arcade crossed with a Miami Vice sunset. It costs nothing to host. It requires nothing to build. A group of coworkers opens the same page, taps buttons when they see each other grab a drink, and watches the tallies climb through the day. The UI is separate from the logic. The logic is pure functions. The data is flat JSON. Ship `index.html`, open a browser, start counting.
