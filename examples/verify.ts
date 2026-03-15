/**
 * Example: Verify an AI agent's identity and trust status
 *
 * This example shows how a third party can verify an agent
 * using the public Trust API — no authentication required.
 */

import createVorim from "@vorim/sdk";

// Trust verification is public — no API key needed for verify()
// but we still need to initialize the SDK
const vorim = createVorim({
  apiKey: "", // not required for public endpoints
  baseUrl: "https://api.vorim.ai",
});

async function main() {
  const agentId = "agid_acme_a1b2c3d4";

  // 1. Verify the agent's identity and trust status
  const trust = await vorim.verify(agentId);

  console.log("Agent Verification Result:");
  console.log(`  Agent ID:     ${trust.agent_id}`);
  console.log(`  Verified:     ${trust.status === "active"}`);
  console.log(`  Trust Score:  ${trust.trust_score}/100`);
  console.log(`  Status:       ${trust.status}`);
  console.log(`  Owner:        ${trust.owner.org_name}`);
  console.log(`  Fingerprint:  ${trust.key_fingerprint}`);
  console.log(`  Scopes:       ${trust.active_scopes.join(", ")}`);

  // 2. Make a trust decision based on the score
  if (trust.trust_score >= 80) {
    console.log("\n✅ High trust — allow full interaction");
  } else if (trust.trust_score >= 50) {
    console.log("\n⚠️  Medium trust — allow with monitoring");
  } else {
    console.log("\n❌ Low trust — require additional verification");
  }

  // 3. Check a specific permission before allowing an action
  const permission = await vorim.check(agentId, "agent:execute");

  if (permission.allowed) {
    console.log(`\nPermission agent:execute: ALLOWED`);
    if (permission.remaining_quota !== undefined) {
      console.log(`  Remaining quota: ${permission.remaining_quota}`);
    }
  } else {
    console.log(`\nPermission agent:execute: DENIED`);
    console.log(`  Reason: ${permission.reason}`);
  }
}

main().catch(console.error);
