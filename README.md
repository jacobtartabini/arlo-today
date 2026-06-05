# Arlo Menu Bar

macOS menu bar companion for Arlo productivity — a condensed **Today** view of your tasks.

Click the tray icon to open a popover with today's tasks, quick-add, and links back to the full Arlo web app.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/learn/get-started#installing-rust) (for Tauri)
- [Tauri prerequisites for macOS](https://tauri.app/start/prerequisites/)

## Setup

1. Copy environment variables from your local Arlo `.env`:

```bash
cp .env.example .env
```

Fill in at minimum:

- `VITE_SUPABASE_URL` — same Supabase project as Arlo
- `VITE_AEGIS_BASE_URL` — Aegis auth service URL
- `VITE_ARLO_WEB_URL` — base URL for "Open Arlo" (e.g. `https://arlo.jacobtartabini.com`)

2. Install dependencies:

```bash
npm install
```

3. Run in development:

```bash
npm run tauri dev
```

The app runs as a menu bar utility (no Dock icon). Click the tray icon to toggle the popover.

## Sign-in

### Browser OAuth (recommended)

1. Click **Sign in with browser** in the popover.
2. Complete login in your default browser.
3. Aegis redirects to `arlo-menubar://auth/callback?token=...`.
4. macOS hands control back to the menubar app; the JWT is stored in Keychain.

Ensure `arlo-menubar://auth/callback` is registered as an allowed redirect URI in Aegis.

### Paste token (dev / fallback)

If OAuth redirect is not yet whitelisted:

1. Sign in to Arlo in your browser.
2. Open DevTools → Application → Session Storage → copy `arlo_auth_token`.
3. In the menubar app, use **Paste token (dev)**.

## Features (v1)

- Menu bar tray icon with popover (~380×520)
- Today task filter (matches Arlo `/productivity` Today tab)
- Toggle task completion via `data-api`
- Quick add with Arlo defaults (`scheduledDate: today`, `priority: 3`, `energyLevel: medium`)
- Open Arlo / Sign out
- Escape or click outside closes popover

## Architecture

All task reads/writes go through Arlo's `data-api` edge function:

```
POST {VITE_SUPABASE_URL}/functions/v1/data-api
Header: X-Arlo-Authorization: Bearer <jwt>
```

Auth uses Aegis JWT (not Supabase Auth). Tokens are stored in macOS Keychain via the `keyring` crate.

## Build

```bash
npm run tauri build
```

Unsigned local builds work for development. Distribution requires Apple Developer ID code signing.

## Bundle ID

`com.tartabinienterprises.arlo-menubar`

## Out of scope (v1)

Week/Schedule/Projects tabs, drag-and-drop, time blocks, energy settings, full task edit dialogs, calendar sync, Windows/Linux.
