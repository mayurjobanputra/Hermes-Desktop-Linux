/**
 * Renderer process — minimal UI wiring.
 * Talks to the main process exclusively through window.hermesAPI (preload bridge).
 *
 * This is a skeleton. Replace with React/Svelte/Vue or keep it vanilla.
 */

import type { HermesAPI } from "../preload/preload";

export {};

declare global {
  interface Window {
    hermesAPI: HermesAPI;
  }
}

// ── Navigation ─────────────────────────────────────────────────────

const navButtons = document.querySelectorAll<HTMLButtonElement>(".nav-btn");
const sections = document.querySelectorAll<HTMLElement>(".section");

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.section;
    if (!target) return;

    navButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    sections.forEach((s) => {
      s.classList.toggle("active", s.id === `section-${target}`);
    });
  });
});

// ── Connections placeholder ────────────────────────────────────────

async function loadConnections(): Promise<void> {
  const list = document.getElementById("connections-list");
  if (!list) return;

  try {
    const connections = await window.hermesAPI.listConnections();
    if (connections.length === 0) {
      list.innerHTML = "<p style='color: var(--text-muted)'>No connections yet.</p>";
      return;
    }
    list.innerHTML = connections
      .map(
        (c) =>
          `<div style="padding: 8px 12px; margin-bottom: 8px; background: var(--surface); border-radius: 6px; border: 1px solid var(--border);">
            <strong>${c.label}</strong>
            <span style="color: var(--text-muted); margin-left: 12px;">${c.sshAlias || c.sshHost}</span>
          </div>`
      )
      .join("");
  } catch (err) {
    list.innerHTML = `<p style="color: #ff6b6b;">Failed to load connections.</p>`;
  }
}

loadConnections();

console.log("Hermes Desktop Linux — renderer loaded");
