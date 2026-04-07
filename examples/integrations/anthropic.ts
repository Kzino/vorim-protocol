/**
 * Example: Claude (Anthropic) integration with Vorim
 *
 * This example shows how to wrap Claude's tool use with
 * automatic identity verification, permission checks,
 * and audit trail emission using the Vorim SDK.
 */

import createVorim from "@vorim/sdk";
import { VorimAnthropicMiddleware } from "@vorim/sdk/integrations/anthropic";
import Anthropic from "@anthropic-ai/sdk";

const vorim = createVorim({
  apiKey: "agid_sk_live_your_api_key_here",
  baseUrl: "https://api.vorim.ai",
});

const anthropic = new Anthropic({
  apiKey: "sk-ant-your-anthropic-key",
});

async function main() {
  // 1. Register an agent for this Claude instance
  const result = await vorim.register({
    name: "claude-support-agent",
    description: "Customer support agent powered by Claude",
    capabilities: ["customer_lookup", "ticket_management", "knowledge_base"],
    scopes: ["agent:read", "agent:write", "agent:communicate"],
  });

  const agentId = result.agent.agent_id;
  console.log(`Agent registered: ${agentId}\n`);

  // 2. Grant scoped permissions
  await vorim.grant(agentId, "agent:read");
  await vorim.grant(agentId, "agent:write", {
    rate_limit: { max: 50, window: "1h" },
  });
  await vorim.grant(agentId, "agent:communicate");

  // 3. Create the Vorim middleware for Claude
  const middleware = new VorimAnthropicMiddleware(vorim, {
    agentId,
    autoAudit: true,    // automatically log every tool call
    autoCheck: true,     // automatically check permissions before tool execution
  });

  // 4. Define tools with permission requirements
  const tools: Anthropic.Tool[] = [
    {
      name: "lookup_customer",
      description: "Look up a customer by email or ID",
      input_schema: {
        type: "object" as const,
        properties: {
          query: { type: "string", description: "Customer email or ID" },
        },
        required: ["query"],
      },
    },
    {
      name: "create_ticket",
      description: "Create a support ticket",
      input_schema: {
        type: "object" as const,
        properties: {
          subject: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          description: { type: "string" },
        },
        required: ["subject", "description"],
      },
    },
    {
      name: "send_response",
      description: "Send a response to the customer",
      input_schema: {
        type: "object" as const,
        properties: {
          message: { type: "string" },
          channel: { type: "string", enum: ["email", "chat"] },
        },
        required: ["message", "channel"],
      },
    },
  ];

  // 5. Run Claude with tool use — Vorim handles identity, permissions, and audit
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    tools,
    messages: [
      {
        role: "user",
        content: "Customer john@example.com says their invoice is wrong. Look them up and create a high priority ticket.",
      },
    ],
  });

  // 6. Process tool calls through Vorim middleware
  for (const block of response.content) {
    if (block.type === "tool_use") {
      console.log(`Tool call: ${block.name}`);

      // Middleware checks permission and logs the action automatically
      const permitted = await middleware.beforeToolCall(block.name, block.input);

      if (permitted) {
        // Execute the tool (your actual implementation)
        const toolResult = await executeToolCall(block.name, block.input);

        // Middleware logs the result to the audit trail
        await middleware.afterToolCall(block.name, block.input, toolResult);
        console.log(`  ✓ ${block.name} — permitted and logged`);
      } else {
        console.log(`  ✗ ${block.name} — permission denied`);
      }
    }
  }

  // 7. Check the agent's trust score after the interaction
  const trust = await vorim.verify(agentId);
  console.log(`\nTrust score: ${trust.trust_score}/100`);
  console.log("✅ All tool calls identity-verified, permission-checked, and audit-logged.");
}

// Mock tool implementation
async function executeToolCall(name: string, input: any): Promise<any> {
  switch (name) {
    case "lookup_customer":
      return { id: "cust_123", name: "John Doe", email: input.query, plan: "growth" };
    case "create_ticket":
      return { ticket_id: "TKT-2026-0042", status: "open" };
    case "send_response":
      return { sent: true, channel: input.channel };
    default:
      return { error: "Unknown tool" };
  }
}

main().catch(console.error);
