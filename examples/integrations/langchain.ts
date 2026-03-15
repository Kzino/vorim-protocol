/**
 * Vorim × LangChain / LangGraph Integration Example
 *
 * Shows three approaches:
 *   1. Tool wrapping — permission checks + audit on every tool call
 *   2. Callback handler — non-intrusive observability
 *   3. Agent factory — register + wrap + observe in one call
 */

import createVorim from "@vorim/sdk";
import { wrapTools, VorimCallbackHandler, createVorimAgent } from "@vorim/sdk/integrations/langchain";

const vorim = createVorim({ apiKey: "agid_sk_live_..." });

// ── Approach 1: Wrap individual tools ────────────────────────────────────

const guardedTools = wrapTools([searchTool, analysisTool], {
  vorim,
  agentId: "agid_acme_a1b2c3d4",
  permissionMap: {
    search_docs: "agent:read",
    run_analysis: "agent:execute",
  },
});

// Use guardedTools anywhere you'd use regular LangChain tools.
// Permission is checked before every call; audit events are emitted after.

// ── Approach 2: Callback handler (observability only) ────────────────────

const handler = new VorimCallbackHandler(vorim, "agid_acme_a1b2c3d4");

// Attach to any LangChain invoke/stream call:
// await agent.invoke({ messages }, { callbacks: [handler] });

// ── Approach 3: Full agent factory (register + wrap + observe) ───────────

const { agentId, tools, callbackHandler } = await createVorimAgent({
  vorim,
  name: "research-agent",
  capabilities: ["web_search", "analysis"],
  scopes: ["agent:read", "agent:execute"],
  tools: [searchTool, analysisTool],
  permissionMap: {
    search_docs: "agent:read",
    run_analysis: "agent:execute",
  },
});

// Use with LangGraph's createReactAgent:
// import { createReactAgent } from "@langchain/langgraph/prebuilt";
// const agent = createReactAgent({ llm, tools });
// const result = await agent.invoke({ messages }, { callbacks: [callbackHandler] });
