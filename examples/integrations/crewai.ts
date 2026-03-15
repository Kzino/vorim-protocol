/**
 * Vorim × CrewAI Integration Example
 *
 * Register an entire crew with Vorim, verify trust before running,
 * and emit audit events for every task execution.
 */

import createVorim from "@vorim/sdk";
import {
  registerCrew,
  emitCrewTaskEvent,
  verifyCrewTrust,
  checkDelegationPermission,
} from "@vorim/sdk/integrations/crewai";

const vorim = createVorim({ apiKey: "agid_sk_live_..." });

// ── Register the crew ────────────────────────────────────────────────────

const crew = await registerCrew(vorim, {
  crewName: "content-pipeline",
  members: [
    {
      role: "researcher",
      name: "crew-researcher",
      capabilities: ["web_search", "summarization"],
      scopes: ["agent:read", "agent:execute"],
    },
    {
      role: "writer",
      name: "crew-writer",
      capabilities: ["file_write", "formatting"],
      scopes: ["agent:read", "agent:write"],
    },
    {
      role: "editor",
      name: "crew-editor",
      capabilities: ["review", "approval"],
      scopes: ["agent:read", "agent:write"],
      allowDelegation: true,
    },
  ],
});

// ── Verify trust before running ──────────────────────────────────────────

const trustReport = await verifyCrewTrust(vorim, crew);
console.log(trustReport);
// [{ role: "researcher", agentId: "agid_...", trustScore: 50, status: "active" }, ...]

// ── Check delegation permissions ─────────────────────────────────────────

const canDelegate = await checkDelegationPermission(vorim, crew, "editor", "writer");
if (canDelegate.allowed) {
  console.log("Editor can delegate to Writer");
}

// ── Emit audit events after each task ────────────────────────────────────

await emitCrewTaskEvent(vorim, {
  role: "researcher",
  agentId: crew.getMember("researcher")!.agentId,
  task: "research_competitors",
  tool: "web_search",
  result: "success",
  latencyMs: 3200,
});
