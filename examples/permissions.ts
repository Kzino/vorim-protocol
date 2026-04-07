/**
 * Example: Manage AI agent permissions with Vorim
 *
 * This example shows how to grant, check, list, and revoke
 * scoped permissions for an AI agent.
 */

import createVorim from "@vorim/sdk";

const vorim = createVorim({
  apiKey: "agid_sk_live_your_api_key_here",
  baseUrl: "https://api.vorim.ai",
});

async function main() {
  const agentId = "agid_acme_a1b2c3d4";

  // 1. Grant a time-limited permission
  console.log("Granting permissions...\n");

  await vorim.grant(agentId, "agent:read", {
    valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    rate_limit: { max: 1000, window: "1h" },
  });
  console.log("  ✓ agent:read — 24h, 1000 req/hour");

  await vorim.grant(agentId, "agent:write");
  console.log("  ✓ agent:write — no expiry");

  await vorim.grant(agentId, "agent:execute", {
    rate_limit: { max: 100, window: "1m" },
  });
  console.log("  ✓ agent:execute — 100 req/minute");

  // 2. Check a permission before taking an action
  console.log("\nChecking permissions...\n");

  const readCheck = await vorim.check(agentId, "agent:read");
  console.log(`  agent:read    → ${readCheck.allowed ? "ALLOWED" : "DENIED"} (${readCheck.latency_ms}ms)`);

  const writeCheck = await vorim.check(agentId, "agent:write");
  console.log(`  agent:write   → ${writeCheck.allowed ? "ALLOWED" : "DENIED"} (${writeCheck.latency_ms}ms)`);

  const deleteCheck = await vorim.check(agentId, "agent:elevate");
  console.log(`  agent:elevate → ${deleteCheck.allowed ? "ALLOWED" : "DENIED"} (${deleteCheck.latency_ms}ms)`);

  // 3. List all active permissions for the agent
  console.log("\nActive permissions:\n");

  const permissions = await vorim.listPermissions(agentId);
  for (const perm of permissions) {
    const expiry = perm.valid_until
      ? `expires ${new Date(perm.valid_until).toLocaleDateString()}`
      : "no expiry";
    const rateLimit = perm.rate_limit
      ? `${perm.rate_limit.max}/${perm.rate_limit.window}`
      : "unlimited";
    console.log(`  ${perm.scope} — ${expiry}, ${rateLimit}`);
  }

  // 4. Revoke a specific permission
  console.log("\nRevoking agent:write...");
  await vorim.revokePermission(agentId, "agent:write");
  console.log("  ✓ agent:write revoked");

  // Verify it's revoked
  const revokedCheck = await vorim.check(agentId, "agent:write");
  console.log(`  agent:write   → ${revokedCheck.allowed ? "ALLOWED" : "DENIED"}`);
}

main().catch(console.error);
