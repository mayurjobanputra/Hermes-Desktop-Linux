/**
 * ConnectionStore — persists SSH connection profiles as local JSON.
 * Mirrors ConnectionStore.swift + AppPaths.swift.
 *
 * Data lives in ~/.config/hermes-desktop/ on Linux.
 */

import fs from "fs";
import path from "path";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import type { ConnectionProfile } from "../../shared/types";

const CONFIG_DIR = path.join(os.homedir(), ".config", "hermes-desktop");
const CONNECTIONS_FILE = path.join(CONFIG_DIR, "connections.json");
const PREFERENCES_FILE = path.join(CONFIG_DIR, "preferences.json");

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

// ── Connections ────────────────────────────────────────────────────

export function loadConnections(): ConnectionProfile[] {
  ensureConfigDir();
  if (!fs.existsSync(CONNECTIONS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(CONNECTIONS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function saveConnections(connections: ConnectionProfile[]): void {
  ensureConfigDir();
  fs.writeFileSync(CONNECTIONS_FILE, JSON.stringify(connections, null, 2));
}

export function upsertConnection(profile: ConnectionProfile): ConnectionProfile[] {
  const connections = loadConnections();
  const now = new Date().toISOString();
  const normalized: ConnectionProfile = {
    ...profile,
    id: profile.id || uuidv4(),
    label: profile.label.trim(),
    sshAlias: profile.sshAlias.trim(),
    sshHost: profile.sshHost.trim(),
    sshUser: profile.sshUser.trim(),
    sshPort: profile.sshPort && profile.sshPort > 0 ? profile.sshPort : null,
    createdAt: profile.createdAt || now,
    updatedAt: now,
  };

  const index = connections.findIndex((c) => c.id === normalized.id);
  if (index >= 0) {
    connections[index] = normalized;
  } else {
    connections.push(normalized);
  }

  connections.sort((a, b) => a.label.localeCompare(b.label));
  saveConnections(connections);
  return connections;
}

export function deleteConnection(id: string): ConnectionProfile[] {
  let connections = loadConnections();
  connections = connections.filter((c) => c.id !== id);
  saveConnections(connections);
  return connections;
}

// ── Preferences (last used connection) ─────────────────────────────

interface Preferences {
  lastConnectionID?: string;
}

export function loadPreferences(): Preferences {
  ensureConfigDir();
  if (!fs.existsSync(PREFERENCES_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(PREFERENCES_FILE, "utf-8"));
  } catch {
    return {};
  }
}

export function savePreferences(prefs: Preferences): void {
  ensureConfigDir();
  fs.writeFileSync(PREFERENCES_FILE, JSON.stringify(prefs, null, 2));
}
