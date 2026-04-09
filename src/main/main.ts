/**
 * Electron main process.
 * Sets up the BrowserWindow and IPC handlers for all services.
 */

import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import * as connectionStore from "./services/connection-store";
import * as remoteHermes from "./services/remote-hermes";
import * as fileEditor from "./services/file-editor";
import * as sessionBrowser from "./services/session-browser";
import { executeJSON } from "./services/ssh-transport";
import { wrapPythonScript, CONNECTION_TEST_BODY } from "./services/python-scripts";
import type { ConnectionProfile, ConnectionTestResponse, TrackedFileKey } from "../shared/types";

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 940,
    minHeight: 520,
    title: "Hermes Desktop",
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // In dev, load from file. Replace with a dev server URL if using a bundler.
  mainWindow.loadFile(path.join(__dirname, "..", "..", "src", "renderer", "index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());

// ── IPC Handlers ───────────────────────────────────────────────────

// Connections
ipcMain.handle("connections:list", () => connectionStore.loadConnections());
ipcMain.handle("connections:upsert", (_e, profile: ConnectionProfile) =>
  connectionStore.upsertConnection(profile)
);
ipcMain.handle("connections:delete", (_e, id: string) =>
  connectionStore.deleteConnection(id)
);
ipcMain.handle("connections:test", async (_e, profile: ConnectionProfile) => {
  const script = wrapPythonScript({}, CONNECTION_TEST_BODY);
  return executeJSON<ConnectionTestResponse>(profile, script);
});

// Preferences
ipcMain.handle("preferences:load", () => connectionStore.loadPreferences());
ipcMain.handle("preferences:save", (_e, prefs) =>
  connectionStore.savePreferences(prefs)
);

// Discovery
ipcMain.handle("remote:discover", (_e, profile: ConnectionProfile) =>
  remoteHermes.discover(profile)
);

// File editor
ipcMain.handle("files:read", (_e, profile: ConnectionProfile, fileKey: TrackedFileKey) =>
  fileEditor.readFile(profile, fileKey)
);
ipcMain.handle("files:write", (_e, profile: ConnectionProfile, fileKey: TrackedFileKey, content: string) =>
  fileEditor.writeFile(profile, fileKey, content)
);

// Sessions
ipcMain.handle("sessions:list", (_e, profile: ConnectionProfile, offset: number, limit: number) =>
  sessionBrowser.listSessions(profile, offset, limit)
);
ipcMain.handle("sessions:transcript", (_e, profile: ConnectionProfile, sessionID: string) =>
  sessionBrowser.loadTranscript(profile, sessionID)
);
