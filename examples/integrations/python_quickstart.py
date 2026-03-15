"""
Vorim Python SDK — Quick Start Examples

pip install vorim
pip install vorim[langchain]   # for LangChain integration
pip install vorim[crewai]      # for CrewAI integration
pip install vorim[openai]      # for OpenAI Agents integration
pip install vorim[all]         # all integrations
"""

from vorim import Vorim, AsyncVorim

# ── Synchronous client ────────────────────────────────────────────────────

vorim = Vorim(api_key="agid_sk_live_...")

# Register an agent
result = vorim.register(
    name="invoice-processor",
    capabilities=["read_documents", "extract_data"],
    scopes=["agent:read", "agent:execute"],
)
print(result.agent.agent_id)   # agid_acme_a1b2c3d4
print(result.agent.trust_score)  # 50

# Check permissions (<5ms via Redis)
check = vorim.check(result.agent.agent_id, "agent:execute")
if check.allowed:
    # Emit audit event
    vorim.emit(
        agent_id=result.agent.agent_id,
        event_type="tool_call",
        action="process_invoice",
        resource="INV-2026-0042",
        result="success",
        latency_ms=142,
    )

# Verify any agent's trust (public, no auth required)
trust = vorim.verify(result.agent.agent_id)
print(f"Trust score: {trust.trust_score}/100")


# ── Async client ──────────────────────────────────────────────────────────

async def main():
    async with AsyncVorim(api_key="agid_sk_live_...") as vorim:
        result = await vorim.register(
            name="async-agent",
            capabilities=["search"],
            scopes=["agent:read"],
        )
        print(result.agent.agent_id)


# ── LangChain integration ────────────────────────────────────────────────

from vorim.integrations.langchain import vorim_tool, VorimCallbackHandler

@vorim_tool(vorim, agent_id="agid_acme_...", permission="agent:execute")
def search(query: str) -> str:
    """Search documents."""
    return f"Results for {query}"

# search() is now a standard LangChain tool with Vorim permission checks + audit


# ── CrewAI integration ────────────────────────────────────────────────────

from vorim.integrations.crewai import register_crew

crew = register_crew(vorim, {
    "crew_name": "content-pipeline",
    "members": [
        {
            "role": "researcher",
            "name": "crew-researcher",
            "capabilities": ["web_search"],
            "scopes": ["agent:read", "agent:execute"],
        },
    ],
})


# ── OpenAI integration ──────────────────────────────────────────────────

from openai import OpenAI
from vorim.integrations.openai_agents import VorimToolRegistry

client = OpenAI()
registry = VorimToolRegistry(vorim=vorim, agent_id="agid_acme_...")

registry.add(
    name="search",
    description="Search documents",
    parameters={"type": "object", "properties": {"query": {"type": "string"}}},
    execute=lambda args: f"Results for {args['query']}",
    permission="agent:read",
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Search for AI papers"}],
    tools=registry.to_openai_tools(),
)

# Execute tool calls — permission checked + audited automatically
tool_messages = registry.execute_tool_calls(
    response.choices[0].message.tool_calls or []
)
