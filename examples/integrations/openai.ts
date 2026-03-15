/**
 * Vorim × OpenAI Function Calling Integration Example
 *
 * Shows how to use VorimToolRegistry for permission-checked,
 * audited tool execution with OpenAI's chat completions API.
 */

import OpenAI from "openai";
import createVorim from "@vorim/sdk";
import { VorimToolRegistry, runAgentLoop } from "@vorim/sdk/integrations/openai";

const vorim = createVorim({ apiKey: "agid_sk_live_..." });
const openai = new OpenAI();

// ── Tool Registry ────────────────────────────────────────────────────────

const registry = new VorimToolRegistry({
  vorim,
  agentId: "agid_acme_a1b2c3d4",
});

registry.add({
  name: "search_docs",
  description: "Search internal documents",
  parameters: {
    type: "object",
    properties: { query: { type: "string" } },
    required: ["query"],
  },
  execute: async ({ query }) => `Results for: ${query}`,
  permission: "agent:read",
});

// ── Manual loop ──────────────────────────────────────────────────────────

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Search for onboarding docs" }],
  tools: registry.toOpenAITools(),
});

const toolMessages = await registry.executeToolCalls(
  response.choices[0].message.tool_calls ?? []
);
// Each tool call is permission-checked and audited automatically.

// ── Or use the built-in agent loop ───────────────────────────────────────

const answer = await runAgentLoop({
  vorim,
  agentId: "agid_acme_a1b2c3d4",
  openai,
  model: "gpt-4o",
  systemPrompt: "You are a helpful assistant.",
  registry,
  userMessage: "Find docs about onboarding",
});
