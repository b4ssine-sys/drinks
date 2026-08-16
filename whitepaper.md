# Beverage Tracking Platform: A Lightweight Approach

## Problem Statement

In shared workspaces, people notice their coworkers' drink habits — the daily refresher, the third cold brew, the afternoon bubble tea. It becomes a running joke, a bonding ritual, a piece of office culture. But there is no simple way to actually track it. Existing health apps are personal, private, and bloated with features nobody asked for. What is missing is a lightweight, shared drink counter that a group can use together — tap a button when you see someone grab their drink, and watch the tally climb through the day.

## Design Goals

1. **Ultra-lightweight** — minimal dependencies, fast to start, fast to use. No heavyweight frameworks.
2. **Node.js full stack** — Node.js serves the frontend, runs the backend, and hosts the application. One runtime, one language, one deployment target.
3. **Aiven-managed backend services** — database and real-time infrastructure run on Aiven's managed cloud platform. No self-managed databases, no ops burden.
4. **Iterative by design** — start with the smallest useful version and layer capabilities on top without rewriting what came before. Each iteration is independently deployable.
5. **Free to host** — deployable on free-tier Node.js hosting with Aiven's free-tier managed services.
6. **Multi-user, shared access** — multiple people open the same site and can log drinks for anyone in the group. This is a communal board, not a personal diary.
7. **UI separated from logic** — presentation code and business logic live in separate layers so either can be changed independently.

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

Node.js is the single runtime for the entire application. It serves the frontend, handles API requests, and connects to Aiven-managed backend services. No separate web server, no separate backend language.

### Backend Services: Aiven (aiven.io)

Aiven provides managed cloud infrastructure so the app never needs to self-host a database or message broker:

- **Aiven for PostgreSQL** — managed PostgreSQL database for persistent storage of all drink entries, person profiles, and historical data. Handles structured queries, aggregations, and date-range filtering. Connected via the `pg` Node.js driver using Aiven-provided connection credentials.

- **Aiven for Redis** — managed Redis instance for real-time pub/sub. When a drink is logged, the server publishes the event to a Redis channel. All connected Node.js server instances subscribe to the channel and push updates to their WebSocket clients. This enables horizontal scaling — multiple server instances stay in sync through Redis without direct coordination.

### Backend: Express.js (Node.js)

A lightweight Express server provides:

- **Static file serving** — serves the HTML, CSS, and JavaScript frontend.
- **REST API** — endpoints for logging drinks, querying counts, and managing people.
- **PostgreSQL persistence** — drink entries written to Aiven PostgreSQL via the `pg` driver.
- **WebSocket + Redis pub/sub** — real-time updates pushed to all connected browsers. Redis pub/sub ensures updates propagate across multiple server instances.

### Frontend: Vanilla HTML/CSS/JS

The frontend is plain HTML, CSS, and JavaScript served by the Node.js backend. No React, no Vue, no build step. The browser loads static files and communicates with the backend over REST and WebSocket.

### Project Structure

```
drinks/
  server.js          — Express server, API routes, WebSocket setup
  lib/
    logic.js         — pure business logic (no Express, no DOM)
    db.js            — PostgreSQL connection and queries (Aiven)
    pubsub.js        — Redis pub/sub connection (Aiven)
  public/
    index.html       — main page markup
    css/
      style.css      — retro Tokyo x Miami Vice theme
    js/
      app.js         — UI rendering and event handling
      api.js         — fetch wrapper for backend communication
  package.json
```

### Infrastructure Diagram

```
┌─────────────────────────────────────────────────────┐
│                    Aiven Cloud                       │
│                                                      │
│   ┌──────────────────┐    ┌──────────────────┐      │
│   │   PostgreSQL     │    │     Redis         │      │
│   │   (persistence)  │    │   (pub/sub)       │      │
│   └────────┬─────────┘    └────────┬─────────┘      │
│            │                       │                  │
└────────────┼───────────────────────┼──────────────────┘
             │                       │
     ┌───────┴───────────────────────┴───────┐
     │           Node.js Server              │
     │  Express + WebSocket + pg + ioredis   │
     └───────────────────┬───────────────────┘
                         │
          ┌──────────────┼──────────────────┐
          │              │                  │
     ┌────┴────┐   ┌────┴────┐       ┌────┴────┐
     │ Browser │   │ Browser │  ...  │ Browser │
     │ (phone) │   │(laptop) │       │(tablet) │
     └─────────┘   └─────────┘       └─────────┘
```

## Architecture

### Separation of UI and Logic

The codebase enforces a strict boundary between three layers:

**Logic Layer** (`lib/logic.js`) — pure functions with no side effects:
- `createEntry(personId, beverage, loggedBy)` — builds a drink entry object.
- `addEntry(entries, entry)` — returns a new array with the entry appended.
- `getDailySummary(entries, date)` — computes drink counts and totals for a given day.
- `getPersonSummary(entries, personId, date)` — returns one person's daily tally.

**Server Layer** (`server.js`, `lib/db.js`, `lib/pubsub.js`) — handles HTTP, WebSocket, and persistence:
- Receives API requests and delegates to the logic layer.
- Persists entries to Aiven PostgreSQL.
- Publishes drink events to Aiven Redis; subscribes to receive events from other server instances.
- Broadcasts updates to all connected clients via WebSocket.

**UI Layer** (`public/js/app.js`, `public/css/style.css`) — renders state to the DOM:
- Renders person cards with drink counts.
- Handles tap/click events and sends requests to the API.
- Listens for WebSocket messages to update the display in real time.

The logic layer can be tested with plain Node.js — no browser, no server, no database. The UI layer can be reskinned without touching the counting logic. The server layer can swap its persistence backend without affecting either.

### Data Shape

Every drink event is a flat JSON object (and a corresponding PostgreSQL row):

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

### Database Schema (Aiven PostgreSQL)

```sql
CREATE TABLE drinks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
  person      TEXT NOT NULL,
  beverage    TEXT NOT NULL,
  logged_by   TEXT NOT NULL
);

CREATE TABLE people (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  avatar      TEXT DEFAULT '',
  default_bev TEXT DEFAULT 'drink'
);

CREATE INDEX idx_drinks_person_date ON drinks (person, timestamp);
CREATE INDEX idx_drinks_date ON drinks (timestamp);
```

### Multi-User Access

All connected browsers see the same data because the Node.js server reads from and writes to a shared Aiven PostgreSQL database. When one user logs a drink:

1. The server writes the entry to PostgreSQL.
2. The server publishes the event to an Aiven Redis channel.
3. All server instances (if scaled horizontally) receive the event via Redis subscription.
4. Each server instance pushes the update to its connected WebSocket clients.

No polling, no manual refresh, no stale data.

### Hosting Strategy

The app is a Node.js process that connects to Aiven-managed services. The Node.js server can run on any free-tier hosting platform:

| Service | How to Deploy | Always On (Free Tier) |
|---|---|---|
| **Render** | Connect a Git repo, set start command to `node server.js` | Spins down after inactivity, wakes on request |
| **Railway** | Connect a Git repo, auto-detects Node.js | 500 hours/month free |
| **Fly.io** | `fly launch` from the command line | 3 shared VMs free |

Aiven services are configured via environment variables (`DATABASE_URL`, `REDIS_URL`) set in the hosting platform's dashboard. No credentials in code.

| Aiven Service | Purpose | Free Tier |
|---|---|---|
| **Aiven for PostgreSQL** | Persistent storage for drink entries and people | Free plan available |
| **Aiven for Redis** | Real-time pub/sub for cross-instance sync | Free plan available |

## Iteration Plan

### Iteration 0 — Tap to Count

The smallest useful version. A Node.js server that:

- Serves a single page with a card for each person in the group.
- Each card has a button to log a drink (defaults to a generic "drink").
- Tapping the button sends a POST to the API, which writes to PostgreSQL and broadcasts via WebSocket.
- All connected browsers see the count update in real time.
- The count resets visually each day.
- Styled with the retro Tokyo x Miami Vice theme from day one.
- Uses Aiven PostgreSQL from day one — no throwaway local storage to migrate later.

**Done when:** you tap a coworker's card on your phone and your coworker sees the count go up on their laptop.

### Iteration 1 — Beverage Selection

Add drink-specific logging:

- Tapping a person's card opens a beverage picker (refresher, coffee, tea, water, soda, etc.).
- Each beverage has its own count on the card.
- Users can add custom beverages via the UI.

**Done when:** Sarah's card shows "Refresher x3, Coffee x1."

### Iteration 2 — Daily History and Trends

Add the ability to look back:

- PostgreSQL queries for historical data by date range.
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

### Iteration 4 — Horizontal Scaling with Redis

Enable multiple server instances behind a load balancer:

- Aiven Redis pub/sub ensures all instances stay in sync.
- Any instance can handle any request — stateless server design.
- WebSocket connections distribute across instances; Redis relays events between them.

**Done when:** the app handles traffic spikes by adding server instances without any code changes.

### Iteration 5 — Progressive Web App

Make the app installable:

- Service worker for offline caching of static assets.
- Web app manifest for home screen installation.
- Queued offline entries that sync to PostgreSQL when the connection is restored.

**Done when:** the team has the app on their home screens and can log drinks even when the Wi-Fi drops.

## What This Platform Is Not

- **Not a calorie tracker.** It does not estimate nutritional content.
- **Not a personal health app.** It is a shared, social activity board.
- **Not a subscription service.** It runs on free-tier hosting and Aiven's free plans.
- **Not a native app.** It runs in the browser, served by Node.js.

## Summary

The platform is a Node.js application backed by Aiven-managed PostgreSQL and Redis, styled like a neon-lit Tokyo arcade crossed with a Miami Vice sunset. Aiven handles the database and real-time messaging so the app never self-manages infrastructure. A group of coworkers opens the same page, taps buttons when they see each other grab a drink, and watches the tallies update in real time across every screen. The UI is static files. The logic is pure functions. The data lives in PostgreSQL. Run `node server.js`, open a browser, start counting.
