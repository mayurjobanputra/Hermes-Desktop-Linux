/**
 * RemoteHermesService — discovers the Hermes workspace on the remote host.
 * Mirrors RemoteHermesService.swift.
 */

import { executeJSON } from "./ssh-transport";
import { wrapPythonScript, DISCOVERY_BODY } from "./python-scripts";
import type { ConnectionProfile, RemoteDiscovery } from "../../shared/types";

export async function discover(connection: ConnectionProfile): Promise<RemoteDiscovery> {
  const script = wrapPythonScript({}, DISCOVERY_BODY);
  return executeJSON<RemoteDiscovery>(connection, script);
}
