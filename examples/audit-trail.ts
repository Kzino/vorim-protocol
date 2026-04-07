/**
 * Example: Emit and export audit trail events with Vorim
 *
 * This example shows how to log agent actions to an immutable,
 * cryptographically signed audit trail — and export bundles
 * for compliance reviews.
 */

import createVorim from "@vorim/sdk";

const vorim = createVorim({
  apiKey: "agid_sk_live_your_api_key_here",
  baseUrl: "https://api.vorim.ai",
});

async function main() {
  const agentId = "agid_acme_a1b2c3d4";

  // 1. Emit a single audit event
  console.log("Emitting audit events...\n");

  await vorim.emit({
    agent_id: agentId,
    event_type: "tool_call",
    action: "query_customer_database",
    resource: "customers/12345",
    result: "success",
    latency_ms: 23,
    metadata: { query: "SELECT * FROM customers WHERE id = 12345", rows_returned: 1 },
  });
  console.log("  ✓ tool_call: query_customer_database");

  await vorim.emit({
    agent_id: agentId,
    event_type: "api_request",
    action: "POST /api/invoices",
    resource: "invoices/INV-2026-0099",
    result: "success",
    latency_ms: 156,
    permission: "agent:write",
  });
  console.log("  ✓ api_request: POST /api/invoices");

  // 2. Emit a batch of events (up to 1,000 per call)
  console.log("\nEmitting batch...\n");

  await vorim.emitBatch([
    {
      agent_id: agentId,
      event_type: "tool_call",
      action: "send_email",
      resource: "customer@example.com",
      result: "success",
      latency_ms: 340,
      permission: "agent:communicate",
    },
    {
      agent_id: agentId,
      event_type: "tool_call",
      action: "update_crm_record",
      resource: "contacts/67890",
      result: "success",
      latency_ms: 45,
      permission: "agent:write",
    },
    {
      agent_id: agentId,
      event_type: "api_request",
      action: "GET /api/reports/q1",
      result: "error",
      error_code: "PERMISSION_DENIED",
      latency_ms: 3,
    },
  ]);
  console.log("  ✓ 3 events batch submitted");

  // 3. Export a signed audit bundle for compliance
  console.log("\nExporting signed audit bundle...\n");

  const bundle = await vorim.exportAudit({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // last 30 days
    to: new Date().toISOString(),
    format: "json",
  });

  console.log(`  Events:     ${bundle.event_count}`);
  console.log(`  SHA-256:    ${bundle.manifest_hash}`);
  console.log(`  Signed:     ${bundle.signed ? "yes" : "no"}`);
  console.log(`  Bundle URL: ${bundle.download_url}`);

  console.log("\n✅ Audit trail complete — tamper-proof and compliance-ready.");
}

main().catch(console.error);
