# Hermes Desktop Linux

A Linux-compatible desktop client for [Hermes](https://github.com/dodo-reach/hermes-desktop), built with Electron + TypeScript.

Extracted from the macOS-native Swift app and rewritten for cross-platform use.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design extracted from the original macOS app.

## Stack

- Electron (main + renderer process)
- TypeScript
- xterm.js + node-pty (terminal)
- SSH via system `ssh` binary (same approach as the macOS app)
- Local JSON storage in `~/.config/hermes-desktop/`

## Setup

```bash
npm install
npm run build
npm start
```

## Development

```bash
npm run dev
```

## Project Structure

```
src/
  shared/types.ts          — shared type definitions
  main/
    main.ts                — Electron main process + IPC handlers
    services/
      ssh-transport.ts     — SSH command execution (spawns ssh)
      python-scripts.ts    — Python script templates for remote ops
      remote-hermes.ts     — Remote discovery service
      file-editor.ts       — Remote file read/write
      session-browser.ts   — Session list + transcript loading
      session-scripts.ts   — Python scripts for session queries
      connection-store.ts  — Local JSON persistence
  preload/
    preload.ts             — contextBridge API for renderer
  renderer/
    index.html             — App shell
    styles.css             — Minimal dark theme
    renderer.ts            — UI wiring (replace with framework of choice)
```

## What Works

The core service layer is fully ported:
- SSH transport with multiplexing
- Remote discovery of `~/.hermes`
- File read/write (USER.md, MEMORY.md, SOUL.md)
- Session browsing (SQLite + JSONL fallback)
- Connection profile CRUD with local persistence

## What Needs Building

- Terminal integration (xterm.js + node-pty)
- Full UI for each section (connections editor, file editor, session viewer)
- Error handling and status messages in the UI
