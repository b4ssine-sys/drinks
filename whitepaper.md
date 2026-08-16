# Beverage Tracking Platform: A Lightweight Approach

## Problem Statement

People drink a variety of beverages throughout the day — water, coffee, tea, juice, smoothies, sodas, alcohol — but rarely have a clear picture of what they actually consume. Existing health trackers either ignore beverages entirely, bury them inside bloated calorie-counting apps, or require scanning barcodes for packaged drinks. There is no simple, standalone tool focused purely on beverage consumption.

## Design Goals

1. **Ultra-lightweight** — minimal footprint, no framework bloat, fast to load and fast to use.
2. **Zero external dependencies** — the core platform must function without third-party services, APIs, or package ecosystems. Everything needed ships with the platform itself.
3. **Iterative by design** — start with the smallest useful version and layer capabilities on top without rewriting what came before. Each iteration is independently deployable and complete.
4. **Offline-first** — all data stays local. No account creation, no cloud sync required. The user owns their data from day one.

## Architecture Principles

### Decoupled Modules

The platform is organized as independent, self-contained modules that communicate through plain data structures (JSON). No module imports another module directly. This means:

- The **input module** captures what the user drank and when.
- The **storage module** persists entries to a local store.
- The **display module** reads the store and renders views.
- The **export module** transforms stored data into portable formats.

Each module can be replaced, rewritten in a different language, or removed without affecting the others. The contract between them is the data shape, not the implementation.

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

No nested structures. No relational joins. One entry, one object. The entire day's data is a JSON array of these objects stored in a single file named by date (`2026-08-16.json`).

## Iteration Plan

### Iteration 0 — CLI Logger

The smallest useful version. A single-file script (Bash, Python, or any language already on the user's machine) that:

- Accepts a beverage name and optional volume from the command line.
- Appends a timestamped JSON entry to today's date file.
- Prints a summary of today's entries when run with no arguments.

No install step. No config file. Copy the script, run it.

**Done when:** a user can log "coffee 350ml" and see their day's log.

### Iteration 1 — Daily Summary

Add a read-only summary view:

- Total volume consumed.
- Beverage frequency count (e.g., "coffee x3, water x5").
- Hydration estimate (flag days below a configurable water threshold).

This is a separate script that reads the same date files. It does not modify the logger.

**Done when:** a user can review yesterday's intake in one glance.

### Iteration 2 — Simple Web View

A single static HTML file with inline CSS and JavaScript. No build step, no bundler, no node_modules.

- Opens the current day's JSON file (via File API or drag-and-drop).
- Renders the log as a list and the summary as a card.
- Allows adding new entries through a minimal form that downloads the updated file.

**Done when:** a non-technical user can track beverages by opening one HTML file in a browser.

### Iteration 3 — Local Persistence

Replace file-per-day storage with browser `localStorage` or `IndexedDB` so the web view no longer requires manual file handling.

- Migration path: import existing JSON date files.
- Export button to download all data as a single JSON archive.

The CLI logger continues to work independently using flat files. Both are valid entry points.

**Done when:** the web version works without any file management.

### Iteration 4 — Trends and Patterns

Add a trends page (still a single HTML file, still no dependencies):

- Weekly and monthly volume charts rendered with inline SVG or canvas.
- Most-consumed beverages over time.
- Caffeine and hydration streaks.

**Done when:** a user can see whether they're drinking more water this month than last.

### Iteration 5 — Optional Sync (Opt-In)

For users who want multi-device access, introduce an optional sync layer:

- Data encrypted client-side before leaving the device.
- Sync target is configurable: a personal server, a cloud storage folder, or a Git repository.
- The platform works identically with sync disabled.

This is the first iteration that touches the network. Everything before it is fully offline.

**Done when:** a user can see the same log on their phone and laptop without compromising the offline-first guarantee.

## What This Platform Is Not

- **Not a calorie tracker.** It does not estimate nutritional content.
- **Not a social app.** There are no profiles, leaderboards, or sharing features.
- **Not a subscription service.** There is no server to pay for in the default configuration.

## Summary

The platform starts as a script you can run in a terminal and grows into a portable web app — without ever requiring a package manager, a framework, or an account. Each iteration stands on its own. Each module is replaceable. The data format is simple enough to read in a text editor. That is the point.
