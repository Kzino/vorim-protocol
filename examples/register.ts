/**
 * Example: Register an AI agent with Vorim
 *
 * This example shows how to register a new agent identity,
 * receive its Ed25519 keypair, and store the private key securely.
 */

import createVorim from "@vorim/sdk";

const vorim = createVorim({
  apiKey: "agid_sk_live_your_api_key_here",
  baseUrl: "https://api.vorim.ai", // or your self-hosted instance
});

async function main() {
  // 1. Register a new agent
  const result = await vorim.register({
    name: "invoice-processor",
    description: "Processes and validates incoming invoices",
    capabilities: ["read_documents", "extract_data", "validate_amounts"],
    scopes: ["agent:read", "agent:execute"],
  });

  console.log("Agent registered:");
  console.log(`  ID:          ${result.agent.agent_id}`);
  console.log(`  Fingerprint: ${result.key_fingerprint}`);
  console.log(`  Status:      ${result.agent.status}`);
  console.log(`  Trust Score: ${result.agent.trust_score}`);

  // 2. The private key is returned ONCE — store it securely
  console.log("\n⚠️  Store this private key securely (shown once):");
  console.log(result.private_key);

  // 3. Sign a payload to prove agent identity
  const payload = JSON.stringify({
    action: "process_invoice",
    invoice_id: "INV-2026-0042",
    timestamp: new Date().toISOString(),
  });

  const signature = await vorim.sign(payload, result.private_key);
  console.log(`\nSigned payload: ${signature}`);

  // 4. Emit an audit event for the action
  await vorim.emit({
    agent_id: result.agent.agent_id,
    event_type: "tool_call",
    action: "process_invoice",
    resource: "INV-2026-0042",
    result: "success",
    latency_ms: 142,
    signature,
    metadata: { invoice_amount: 4250.0, currency: "USD" },
  });

  console.log("Audit event recorded.");
}

main().catch(console.error);
