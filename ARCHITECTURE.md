# Hermes Desktop Linux — Architecture

Extracted from [dodo-reach/hermes-desktop](https://github.com/dodo-reach/hermes-desktop) (macOS/Swift).
Rewritten as a Linux-compatible Electron + TypeScript app.

## Original Architecture (macOS)

The macOS app has five sections: Connections, Overview, Files, Sessions, Terminal.
All remote operations go through a single SSH transport layer that:
1. Shells out to `/usr/bin/ssh` with `BatchMode=yes` (no interactive prompts)
2. Pipes inline Python scripts via stdin to `python3 -` on the remote host
3. Parses JSON responses from stdout

There is no HTTP API, no gateway, no local mirroring. The remote `~/.hermes` directory
is the single source of truth.

## Core Services (platform-agnostic logic)

### SSHTransport
- Spawns `ssh` with connection profile args
- Supports `executeJSON()`: sends a Python script, decodes typed JSON response
- Supports `shellArguments()`: returns args for an interactive terminal session
- Uses SSH multiplexing (`ControlMaster=auto`, `ControlPersist=300`)

### RemoteHermesService
- `discover()`: runs a Python script that inspects `~/.hermes` on the remote host
- Returns: home path, hermes paths, which files exist, session store info (SQLite or JSONL)

### FileEditorService
- `read(file)`: reads a remote `~/.hermes` file via Python over SSH
- `write(file, content)`: atomic write via temp file + `os.replace()` over SSH

### SessionBrowserService
- `listSessions()`: queries remote SQLite `state.db` (or falls back to JSONL files)
- `loadTranscript(sessionID)`: fetches full message history for a session

## Data Model

### ConnectionProfile
```
id, label, sshAlias, sshHost, sshPort, sshUser,
createdAt, updatedAt, lastConnectedAt
```
Stored locally as JSON in app data directory.

### RemoteDiscovery
```
remoteHome, hermesHome,
paths: { user, memory, soul, sessionsDir },
exists: { user, memory, soul, sessionsDir },
sessionStore: { kind, path, sessionTable, messageTable }
```

### Tracked Files
Three remote files the app can edit:
- `~/.hermes/memories/USER.md`
- `~/.hermes/memories/MEMORY.md`
- `~/.hermes/SOUL.md`

### Session Models
- `SessionSummary`: id, title, startedAt, lastActive, messageCount, preview
- `SessionMessage`: id, role, content, timestamp, metadata

## Remote Python Scripts

All remote operations use the same pattern:
1. Encode a JSON payload as base64
2. Wrap it in a Python script: `payload = json.loads(base64.b64decode("...").decode("utf-8"))`
3. Append the operation-specific Python body
4. Pipe the whole script to `python3 -` over SSH
5. Parse the JSON output

The Python scripts are self-contained — no dependencies beyond stdlib.

## UI Sections

| Section     | Purpose                                      |
|-------------|----------------------------------------------|
| Connections | CRUD for SSH connection profiles              |
| Overview    | Remote discovery results, health check        |
| Files       | Edit USER.md, MEMORY.md, SOUL.md remotely     |
| Sessions    | Browse and read Hermes conversation history   |
| Terminal    | Interactive SSH terminal with tabs            |

## Linux Stack

This project uses Electron + TypeScript + xterm.js to replicate the above on Linux.
- `node-pty` for the terminal (replaces SwiftTerm + forkpty)
- `xterm.js` for terminal rendering
- Node.js `child_process.spawn` for SSH transport (replaces Foundation.Process)
- Local JSON files for connection storage (replaces NSApplicationSupportDirectory)
