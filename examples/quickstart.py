"""
Example: Python SDK Quickstart

Register an agent, grant permissions, check permissions,
emit audit events, and verify trust — all in Python.
"""

from vorim import Vorim
from vorim.types import AuditEventInput

client = Vorim(
    api_key="agid_sk_live_your_api_key_here",
    base_url="https://api.vorim.ai",
)


def main():
    # 1. Register a new agent
    print("Registering agent...\n")
    result = client.register(
        name="python-research-agent",
        description="Searches documents and answers questions",
        capabilities=["document_search", "question_answering"],
        scopes=["agent:read", "agent:execute"],
    )

    agent_id = result.agent.agent_id
    print(f"  Agent ID:     {agent_id}")
    print(f"  Name:         {result.agent.name}")
    print(f"  Trust Score:  {result.agent.trust_score}")
    print(f"  Private Key:  {'returned (store securely)' if result.private_key else 'none'}")

    # 2. Grant permissions
    print("\nGranting permissions...\n")
    client.grant(agent_id, "agent:read")
    print("  ✓ agent:read granted")
    client.grant(agent_id, "agent:execute")
    print("  ✓ agent:execute granted")

    # 3. Check permission before acting
    print("\nChecking permissions...\n")
    read_check = client.check(agent_id, "agent:read")
    print(f"  agent:read    → {'ALLOWED' if read_check.allowed else 'DENIED'}")

    write_check = client.check(agent_id, "agent:write")
    print(f"  agent:write   → {'ALLOWED' if write_check.allowed else 'DENIED'}")

    # 4. Emit audit events
    print("\nEmitting audit events...\n")
    client.emit(
        agent_id=agent_id,
        event_type="tool_call",
        action="search_documents",
        resource="knowledge_base/engineering",
        result="success",
        latency_ms=45,
    )
    print("  ✓ tool_call: search_documents")

    # 5. Emit a batch of events
    client.emit_batch([
        AuditEventInput(
            agent_id=agent_id,
            event_type="api_request",
            action="GET /api/documents",
            result="success",
            latency_ms=12,
        ),
        AuditEventInput(
            agent_id=agent_id,
            event_type="tool_call",
            action="summarize_results",
            result="success",
            latency_ms=230,
        ),
    ])
    print("  ✓ 2 events batch submitted")

    # 6. List agents
    print("\nAgents in organisation:\n")
    agents = client.list_agents()
    for agent in agents[:5]:
        print(f"  {agent.agent_id} — {agent.name} ({agent.status})")

    # 7. Verify trust
    print("\nTrust verification:\n")
    trust = client.verify(agent_id)
    print(f"  Score: {trust.trust_score}/100")

    print("\n✅ Python quickstart complete.")


if __name__ == "__main__":
    main()
