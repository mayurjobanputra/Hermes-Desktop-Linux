/**
 * Preload script — exposes IPC methods to the renderer via contextBridge.
 * The renderer never has direct access to Node.js APIs.
 */

import { contextBridge, ipcRenderer } from "electron";
import type {
  ConnectionProfile,
  ConnectionTestResponse,
  RemoteDiscovery,
  SessionListPage,
  SessionMessage,
  TrackedFileKey,
} from "../shared/types";

const api = {
  // Connections
  listConnections: (): Promise<ConnectionProfile[]> =>
    ipcRenderer.invoke("connections:list"),
  upsertConnection: (profile: ConnectionProfile): Promise<ConnectionProfile[]> =>
    ipcRenderer.invoke("connections:upsert", profile),
  deleteConnection: (id: string): Promise<ConnectionProfile[]> =>
    ipcRenderer.invoke("connections:delete", id),
  testConnection: (profile: ConnectionProfile): Promise<ConnectionTestResponse> =>
    ipcRenderer.invoke("connections:test", profile),

  // Preferences
  loadPreferences: (): Promise<{ lastConnectionID?: string }> =>
    ipcRenderer.invoke("preferences:load"),
  savePreferences: (prefs: { lastConnectionID?: string }): Promise<void> =>
    ipcRenderer.invoke("preferences:save", prefs),

  // Remote discovery
  discover: (profile: ConnectionProfile): Promise<RemoteDiscovery> =>
    ipcRenderer.invoke("remote:discover", profile),

  // File editor
  readFile: (profile: ConnectionProfile, fileKey: TrackedFileKey): Promise<string> =>
    ipcRenderer.invoke("files:read", profile, fileKey),
  writeFile: (profile: ConnectionProfile, fileKey: TrackedFileKey, content: string): Promise<void> =>
    ipcRenderer.invoke("files:write", profile, fileKey, content),

  // Sessions
  listSessions: (profile: ConnectionProfile, offset: number, limit: number): Promise<SessionListPage> =>
    ipcRenderer.invoke("sessions:list", profile, offset, limit),
  loadTranscript: (profile: ConnectionProfile, sessionID: string): Promise<SessionMessage[]> =>
    ipcRenderer.invoke("sessions:transcript", profile, sessionID),
};

contextBridge.exposeInMainWorld("hermesAPI", api);

export type HermesAPI = typeof api;
