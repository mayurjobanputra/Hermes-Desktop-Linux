/**
 * FileEditorService — read/write remote Hermes files over SSH.
 * Mirrors FileEditorService.swift.
 */

import { executeJSON } from "./ssh-transport";
import { wrapPythonScript, FILE_READ_BODY, FILE_WRITE_BODY } from "./python-scripts";
import type {
  ConnectionProfile,
  TrackedFileKey,
  FileReadResponse,
  FileWriteResponse,
} from "../../shared/types";
import { TRACKED_FILES } from "../../shared/types";

export async function readFile(
  connection: ConnectionProfile,
  fileKey: TrackedFileKey
): Promise<string> {
  const remotePath = TRACKED_FILES[fileKey].remotePath;
  const script = wrapPythonScript({ path: remotePath }, FILE_READ_BODY);
  const response = await executeJSON<FileReadResponse>(connection, script);
  return response.content;
}

export async function writeFile(
  connection: ConnectionProfile,
  fileKey: TrackedFileKey,
  content: string
): Promise<void> {
  const remotePath = TRACKED_FILES[fileKey].remotePath;
  const script = wrapPythonScript(
    { path: remotePath, content, atomic: true },
    FILE_WRITE_BODY
  );
  await executeJSON<FileWriteResponse>(connection, script);
}
