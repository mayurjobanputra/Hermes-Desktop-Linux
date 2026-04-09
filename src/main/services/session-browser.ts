/**
 * SessionBrowserService — list and read Hermes sessions from the remote host.
 * Mirrors SessionBrowserService.swift.
 *
 * The heavy lifting is done by the Python scripts that run on the remote host.
 * They handle both SQLite and JSONL fallback — same scripts as the macOS app.
 */

import { executeJSON } from "./ssh-transport";
import { wrapPythonScript } from "./python-scripts";
import type {
  ConnectionProfile,
  SessionListPage,
  SessionDetailResponse,
  SessionMessage,
} from "../../shared/types";

// The session list and detail Python bodies are large. They are extracted
// verbatim from the macOS app's SessionBrowserService.swift — the Python
// code is platform-agnostic.
//
// For brevity in this skeleton, we reference them from a separate file.
import { SESSION_LIST_BODY, SESSION_DETAIL_BODY } from "./session-scripts";

export async function listSessions(
  connection: ConnectionProfile,
  offset: number,
  limit: number
): Promise<SessionListPage> {
  const script = wrapPythonScript({ offset, limit }, SESSION_LIST_BODY);
  return executeJSON<SessionListPage>(connection, script);
}

export async function loadTranscript(
  connection: ConnectionProfile,
  sessionID: string
): Promise<SessionMessage[]> {
  const script = wrapPythonScript({ session_id: sessionID }, SESSION_DETAIL_BODY);
  const response = await executeJSON<SessionDetailResponse>(connection, script);
  return response.items;
}
