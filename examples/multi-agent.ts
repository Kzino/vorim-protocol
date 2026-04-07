/**
 * Example: Multi-agent system with Vorim identity
 *
 * This example shows how to register multiple agents,
 * scope their permissions independently, track delegation,
 * and maintain a complete audit trail across agent interactions.
 */

import createVorim from "@vorim/sdk";

const vorim = createVorim({
  apiKey: "agid_sk_live_your_api_key_here",
  baseUrl: "https://api.vorim.ai",
});

async function main() {
  // 1. Register the orchestrator agent
  console.log("Registering agents...\n");

  const orchestrator = await vorim.register({
    name: "orchestrator",
    description: "Coordinates research and analysis tasks",
    capabilities: ["task_routing", "result_aggregation"],
    scopes: ["agent:read", "agent:execute", "agent:delegate"],
  });
  console.log(`  ✓ Orchestrator: ${orchestrator.agent.agent_id}`);

  // 2. Register a research agent
  const researcher = await vorim.register({
    name: "research-agent",
    description: "Searches and retrieves information",
    capabilities: ["web_search", "document_retrieval"],
    scopes: ["agent:read"],
  });
  console.log(`  ✓ Researcher:   ${researcher.agent.agent_id}`);

  // 3. Register an analysis agent
  const analyst = await vorim.register({
    name: "analysis-agent",
    description: "Analyzes data and generates reports",
    capabilities: ["data_analysis", "report_generation"],
    scopes: ["agent:read", "agent:write"],
  });
  console.log(`  ✓ Analyst:      ${analyst.agent.agent_id}`);

  // 4. Grant scoped permissions to each agent
  console.log("\nGranting permissions...\n");

  // Orchestrator can delegate and execute
  await vorim.grant(orchestrator.agent.agent_id, "agent:delegate");
  await vorim.grant(orchestrator.agent.agent_id, "agent:execute");
  console.log("  ✓ Orchestrator: delegate + execute");

  // Researcher can only read, with a rate limit
  await vorim.grant(researcher.agent.agent_id, "agent:read", {
    rate_limit: { max: 500, window: "1h" },
  });
  console.log("  ✓ Researcher: read (500/hour)");

  // Analyst can read and write, time-limited to 8 hours
  await vorim.grant(analyst.agent.agent_id, "agent:read");
  await vorim.grant(analyst.agent.agent_id, "agent:write", {
    valid_until: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  });
  console.log("  ✓ Analyst: read + write (8h window)");

  // 5. Simulate a multi-agent workflow with full audit trail
  console.log("\nRunning multi-agent workflow...\n");

  // Step 1: Orchestrator receives a task and delegates research
  await vorim.emit({
    agent_id: orchestrator.agent.agent_id,
    event_type: "tool_call",
    action: "delegate_research",
    resource: `task:competitor_analysis`,
    result: "success",
    metadata: { delegated_to: researcher.agent.agent_id, task: "Research competitor pricing" },
  });
  console.log("  [Orchestrator] Delegated research task");

  // Step 2: Researcher performs searches
  const researchAllowed = await vorim.check(researcher.agent.agent_id, "agent:read");
  if (researchAllowed.allowed) {
    await vorim.emit({
      agent_id: researcher.agent.agent_id,
      event_type: "tool_call",
      action: "web_search",
      resource: "competitor_pricing_data",
      result: "success",
      latency_ms: 890,
      metadata: { sources: 12, results_found: 47 },
    });
    console.log("  [Researcher]   Searched 12 sources, found 47 results");
  }

  // Step 3: Orchestrator delegates analysis
  await vorim.emit({
    agent_id: orchestrator.agent.agent_id,
    event_type: "tool_call",
    action: "delegate_analysis",
    resource: `task:competitor_analysis`,
    result: "success",
    metadata: { delegated_to: analyst.agent.agent_id, task: "Analyze pricing data" },
  });
  console.log("  [Orchestrator] Delegated analysis task");

  // Step 4: Analyst processes data and writes report
  const writeAllowed = await vorim.check(analyst.agent.agent_id, "agent:write");
  if (writeAllowed.allowed) {
    await vorim.emit({
      agent_id: analyst.agent.agent_id,
      event_type: "tool_call",
      action: "generate_report",
      resource: "reports/competitor-analysis-q1",
      result: "success",
      latency_ms: 2340,
      permission: "agent:write",
      metadata: { pages: 12, charts: 5 },
    });
    console.log("  [Analyst]      Generated 12-page report");
  }

  // 6. Verify trust scores for all agents
  console.log("\nTrust scores:\n");

  for (const agent of [orchestrator, researcher, analyst]) {
    const trust = await vorim.verify(agent.agent.agent_id);
    console.log(`  ${agent.agent.name}: ${trust.trust_score}/100`);
  }

  console.log("\n✅ Multi-agent workflow complete — every action attributed, signed, and auditable.");
}

main().catch(console.error);
