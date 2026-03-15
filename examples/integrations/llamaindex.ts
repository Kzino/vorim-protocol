/**
 * Vorim × LlamaIndex TS Integration Example
 *
 * Wrap LlamaIndex tools with Vorim permission checks and audit trails.
 */

import createVorim from "@vorim/sdk";
import { wrapTool, createVorimAgent } from "@vorim/sdk/integrations/llamaindex";

const vorim = createVorim({ apiKey: "agid_sk_live_..." });

// ── Wrap a single tool ───────────────────────────────────────────────────

// Assuming a LlamaIndex FunctionTool:
// const searchTool = FunctionTool.from(
//   async ({ query }: { query: string }) => `Results for: ${query}`,
//   { name: "search", description: "Search documents" }
// );

const guarded = wrapTool(searchTool, {
  vorim,
  agentId: "agid_acme_a1b2c3d4",
  permissionMap: { search: "agent:read" },
});

// Use with any LlamaIndex agent:
// const agent = new OpenAIAgent({ tools: [guarded] });

// ── Full agent factory ───────────────────────────────────────────────────

const { agentId, tools } = await createVorimAgent({
  vorim,
  name: "research-agent",
  capabilities: ["search", "write"],
  scopes: ["agent:read", "agent:write", "agent:execute"],
  tools: [searchTool, writeTool],
  permissionMap: {
    search: "agent:read",
    write: "agent:write",
  },
});

// const agent = new OpenAIAgent({ tools });
// const response = await agent.chat({ message: "Research AI trends" });
