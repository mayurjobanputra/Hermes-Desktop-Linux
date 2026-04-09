/**
 * PythonScripts — wraps JSON payloads into self-contained Python scripts
 * that are piped to `python3 -` on the remote host via SSH.
 *
 * Mirrors RemotePythonScript.swift: base64-encodes the payload so it
 * survives any shell escaping issues.
 */

export function wrapPythonScript(payload: Record<string, unknown>, body: string): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");
  return `import base64
import json

payload = json.loads(base64.b64decode("${encoded}").decode("utf-8"))

${body}`;
}

// ── Discovery script ───────────────────────────────────────────────
// Inspects ~/.hermes on the remote host and returns structure info.

export const DISCOVERY_BODY = `
import json
import pathlib
import sqlite3
import sys

def tilde(path, home):
    try:
        relative = path.relative_to(home)
        return "~/" + relative.as_posix() if relative.as_posix() != "." else "~"
    except ValueError:
        return path.as_posix()

def choose_table(tables, needle):
    lowered = needle.lower()
    for table in tables:
        if table.lower() == lowered:
            return table
    for table in tables:
        if lowered in table.lower():
            return table
    return None

def fail(message):
    print(json.dumps({"ok": False, "error": message}, ensure_ascii=False))
    sys.exit(1)

def discover_session_store(hermes_home, home):
    if not hermes_home.exists():
        return None
    candidates = [
        hermes_home / "state.db",
        hermes_home / "state.sqlite",
        hermes_home / "state.sqlite3",
        hermes_home / "store.db",
        hermes_home / "store.sqlite",
        hermes_home / "store.sqlite3",
    ]
    for candidate in candidates:
        if not candidate.is_file():
            continue
        try:
            conn = sqlite3.connect(f"file:{candidate}?mode=ro", uri=True)
            cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            tables = [row[0] for row in cursor.fetchall()]
            session_table = choose_table(tables, "sessions")
            message_table = choose_table(tables, "messages")
            if session_table and message_table:
                conn.close()
                return {
                    "kind": "sqlite",
                    "path": tilde(candidate, home),
                    "session_table": session_table,
                    "message_table": message_table,
                }
            conn.close()
        except Exception:
            continue
    return None

try:
    home = pathlib.Path.home()
    hermes_home = home / ".hermes"
    user_path = hermes_home / "memories" / "USER.md"
    memory_path = hermes_home / "memories" / "MEMORY.md"
    soul_path = hermes_home / "SOUL.md"
    sessions_dir = hermes_home / "sessions"

    result = {
        "ok": True,
        "remote_home": tilde(home, home),
        "hermes_home": tilde(hermes_home, home),
        "paths": {
            "user": tilde(user_path, home),
            "memory": tilde(memory_path, home),
            "soul": tilde(soul_path, home),
            "sessions_dir": tilde(sessions_dir, home),
        },
        "exists": {
            "user": user_path.exists(),
            "memory": memory_path.exists(),
            "soul": soul_path.exists(),
            "sessions_dir": sessions_dir.exists(),
        },
        "session_store": discover_session_store(hermes_home, home),
    }
    print(json.dumps(result, ensure_ascii=False))
except Exception as exc:
    fail(f"Unable to discover the remote Hermes workspace: {exc}")
`;

// ── File read script body ──────────────────────────────────────────

export const FILE_READ_BODY = `
import json
import os
import pathlib
import sys

def fail(message):
    print(json.dumps({"ok": False, "error": message}, ensure_ascii=False))
    sys.exit(1)

try:
    target = pathlib.Path(os.path.expanduser(payload["path"]))
    if not target.exists():
        fail(f"{payload['path']} does not exist on the remote host.")
    if not target.is_file():
        fail(f"{payload['path']} is not a regular file.")
    content = target.read_text(encoding="utf-8")
    print(json.dumps({"ok": True, "content": content}, ensure_ascii=False))
except UnicodeDecodeError:
    fail(f"{payload['path']} is not valid UTF-8.")
except PermissionError:
    fail(f"Permission denied while reading {payload['path']}.")
except Exception as exc:
    fail(f"Unable to read {payload['path']}: {exc}")
`;

// ── File write script body (atomic) ────────────────────────────────

export const FILE_WRITE_BODY = `
import json
import os
import pathlib
import sys
import tempfile

def fail(message):
    print(json.dumps({"ok": False, "error": message}, ensure_ascii=False))
    sys.exit(1)

temp_name = None
directory_fd = None

try:
    target = pathlib.Path(os.path.expanduser(payload["path"]))
    target.parent.mkdir(parents=True, exist_ok=True)

    fd, temp_name = tempfile.mkstemp(
        dir=str(target.parent),
        prefix=f".{target.name}.",
        suffix=".tmp",
    )
    with os.fdopen(fd, "w", encoding="utf-8") as handle:
        handle.write(payload["content"])
        handle.flush()
        os.fsync(handle.fileno())

    if target.exists():
        os.chmod(temp_name, target.stat().st_mode)

    os.replace(temp_name, target)

    directory_fd = os.open(target.parent, os.O_RDONLY)
    os.fsync(directory_fd)

    print(json.dumps({"ok": True, "path": payload["path"]}, ensure_ascii=False))
except PermissionError:
    fail(f"Permission denied while writing {payload['path']}.")
except Exception as exc:
    fail(f"Unable to write {payload['path']}: {exc}")
finally:
    if directory_fd is not None:
        os.close(directory_fd)
    if temp_name and os.path.exists(temp_name):
        os.unlink(temp_name)
`;

// ── Connection test body ───────────────────────────────────────────

export const CONNECTION_TEST_BODY = `
import json
import pathlib
import sys

print(json.dumps({
    "ok": True,
    "remote_home": str(pathlib.Path.home()),
    "python_executable": sys.executable,
}, ensure_ascii=False))
`;
