/**
 * SSHTransport — spawns `ssh` and communicates with the remote host.
 *
 * Mirrors the macOS SSHTransport.swift:
 *  - execute(): run a remote command, return stdout/stderr/exitCode
 *  - executeJSON(): pipe a Python script to `python3 -`, parse JSON response
 *  - shellArguments(): return the ssh args needed for an interactive terminal
 *
 * Uses SSH multiplexing (ControlMaster) for connection reuse.
 */

import { spawn } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";
import type { ConnectionProfile, SSHCommandResult } from "../../shared/types";

const CONTROL_DIR = path.join(os.tmpdir(), "hermes-desktop-control");

// Ensure control socket directory exists
if (!fs.existsSync(CONTROL_DIR)) {
  fs.mkdirSync(CONTROL_DIR, { recursive: true });
}

function controlPath(connection: ConnectionProfile): string {
  return path.join(CONTROL_DIR, connection.id.replace(/-/g, ""));
}

function destination(connection: ConnectionProfile): string {
  const target = effectiveTarget(connection);
  const user = connection.sshUser.trim();
  return user ? `${user}@${target}` : target;
}

function effectiveTarget(connection: ConnectionProfile): string {
  const alias = connection.sshAlias.trim();
  if (alias) return alias;
  return connection.sshHost.trim();
}

function resolvedPort(connection: ConnectionProfile): number | null {
  if (!connection.sshPort || connection.sshPort <= 0) return null;
  const usesAlias = connection.sshAlias.trim() && !connection.sshHost.trim();
  if (usesAlias && connection.sshPort === 22) return null;
  return connection.sshPort;
}

function sshArguments(
  connection: ConnectionProfile,
  remoteCommand: string | null,
  allocateTTY: boolean
): string[] {
  const args: string[] = [
    "-o", "BatchMode=yes",
    "-o", "ConnectTimeout=10",
    "-o", "ControlMaster=auto",
    "-o", "ControlPersist=300",
    "-o", "ServerAliveInterval=15",
    "-o", "ServerAliveCountMax=3",
    "-o", `ControlPath=${controlPath(connection)}`,
  ];

  args.push(allocateTTY ? "-tt" : "-T");

  const port = resolvedPort(connection);
  if (port) {
    args.push("-p", String(port));
  }

  args.push(destination(connection));

  if (remoteCommand) {
    args.push(remoteCommand);
  }

  return args;
}

export function getShellArguments(connection: ConnectionProfile): string[] {
  return sshArguments(connection, null, true);
}

export function execute(
  connection: ConnectionProfile,
  remoteCommand: string,
  stdinData?: string,
  allocateTTY = false
): Promise<SSHCommandResult> {
  return new Promise((resolve, reject) => {
    const target = effectiveTarget(connection);
    if (!target) {
      return reject(new Error("SSH target is empty."));
    }

    const args = sshArguments(connection, remoteCommand, allocateTTY);
    const proc = spawn("ssh", args, { stdio: ["pipe", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });

    proc.on("error", (err) => reject(new Error(`Failed to launch ssh: ${err.message}`)));

    proc.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code });
    });

    if (stdinData) {
      proc.stdin.write(stdinData);
      proc.stdin.end();
    } else {
      proc.stdin.end();
    }
  });
}

export async function executeJSON<T>(
  connection: ConnectionProfile,
  pythonScript: string
): Promise<T> {
  const result = await execute(connection, "python3 -", pythonScript);

  if (result.exitCode !== 0) {
    // Try to extract structured error from stdout/stderr
    const errorMsg = extractRemoteError(result.stdout) ??
                     extractRemoteError(result.stderr) ??
                     (result.stderr.trim() ||
                     result.stdout.trim() ||
                     `SSH command failed with exit code ${result.exitCode}`);
    throw new Error(errorMsg);
  }

  try {
    return JSON.parse(result.stdout) as T;
  } catch {
    throw new Error(`Failed to parse remote JSON: ${result.stdout.slice(0, 500)}`);
  }
}

function extractRemoteError(output: string): string | null {
  try {
    const obj = JSON.parse(output);
    if (obj && typeof obj.error === "string" && obj.error.trim()) {
      return obj.error;
    }
  } catch {
    // not JSON
  }
  return null;
}
