// ── Connection Profile ──────────────────────────────────────────────

export interface ConnectionProfile {
  id: string;
  label: string;
  sshAlias: string;
  sshHost: string;
  sshPort: number | null;
  sshUser: string;
  createdAt: string;   // ISO 8601
  updatedAt: string;
  lastConnectedAt: string | null;
}

// ── Remote Discovery ───────────────────────────────────────────────

export interface RemoteDiscovery {
  ok: boolean;
  remote_home: string;
  hermes_home: string;
  paths: {
    user: string;
    memory: string;
    soul: string;
    sessions_dir: string;
  };
  exists: {
    user: boolean;
    memory: boolean;
    soul: boolean;
    sessions_dir: boolean;
  };
  session_store: RemoteSessionStore | null;
}

export interface RemoteSessionStore {
  kind: string;
  path: string;
  session_table: string;
  message_table: string;
}

// ── Tracked Files ──────────────────────────────────────────────────

export type TrackedFileKey = "user" | "memory" | "soul";

export const TRACKED_FILES: Record<TrackedFileKey, { title: string; remotePath: string }> = {
  user:   { title: "USER.md",   remotePath: "~/.hermes/memories/USER.md" },
  memory: { title: "MEMORY.md", remotePath: "~/.hermes/memories/MEMORY.md" },
  soul:   { title: "SOUL.md",   remotePath: "~/.hermes/SOUL.md" },
};

// ── Session Models ─────────────────────────────────────────────────

export interface SessionSummary {
  id: string;
  title: string | null;
  started_at: string | number | null;
  last_active: string | number | null;
  message_count: number | null;
  preview: string | null;
}

export interface SessionMessage {
  id: string;
  role: string | null;
  content: string | null;
  timestamp: string | number | null;
  metadata: Record<string, unknown> | null;
}

export interface SessionListPage {
  ok: boolean;
  items: SessionSummary[];
}

export interface SessionDetailResponse {
  ok: boolean;
  items: SessionMessage[];
}

// ── SSH Command Result ─────────────────────────────────────────────

export interface SSHCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

// ── Generic remote JSON response ───────────────────────────────────

export interface RemoteErrorResponse {
  ok: false;
  error: string;
}

export interface FileReadResponse {
  ok: true;
  content: string;
}

export interface FileWriteResponse {
  ok: true;
  path: string;
}

export interface ConnectionTestResponse {
  ok: true;
  remote_home: string;
  python_executable: string | null;
}

// ── App sections ───────────────────────────────────────────────────

export type AppSection = "connections" | "overview" | "files" | "sessions" | "terminal";
