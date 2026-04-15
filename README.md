# Vorim Agent Identity Protocol (VAIP)

An open protocol for AI agent identity, permissions, and cryptographically signed audit trails.

## Overview

As AI agents become autonomous participants in business processes, the need for verifiable identity, scoped permissions, and tamper-evident accountability has never been greater. VAIP defines the standards that make agent deployment safe and auditable.

> **EU AI Act** (enforced Aug 2026) mandates traceability and audit trails for high-risk AI systems. **US Executive Order 14110** requires risk management, transparency, and accountability. **Colorado AI Act**, **Connecticut SB 1103**, **NYC Local Law 144**, **California SB 942**, and **Utah AI Policy Act** mandate audit trails, risk assessment, and transparency for AI systems. VAIP makes your agents compliant out of the box.

## Repository Structure

```
vorim-protocol/
├── SPEC.md              ← Core protocol specification
├── README.md            ← Overview, why this exists, links
├── LICENSE              ← BSL 1.1 (Business Source License)
├── CONTRIBUTING.md      ← How to propose changes
├── examples/
│   ├── register.ts      ← Register an agent and emit audit events
│   ├── verify.ts        ← Verify agent identity and check permissions
│   ├── permissions.ts   ← Grant, check, list, and revoke permissions
│   ├── audit-trail.ts   ← Emit events, batch emit, export signed bundles
│   ├── multi-agent.ts   ← Multi-agent system with delegation tracking
│   ├── quickstart.py    ← Python SDK full quickstart
│   └── integrations/
│       ├── langchain.ts          ← LangChain / LangGraph
│       ├── openai.ts             ← OpenAI function calling
│       ├── anthropic.ts          ← Claude (Anthropic) tool use
│       ├── crewai.ts             ← CrewAI (crew registration, delegation)
│       ├── llamaindex.ts         ← LlamaIndex (tool wrapping)
│       └── python_quickstart.py  ← Python integrations
└── rfcs/
    └── 001-template.md  ← Template for proposing protocol changes
```

## Key Concepts

- **Agent Identity** — Ed25519 keypairs with structured IDs (`agid_{org}_{uuid}`) and SHA-256 fingerprints
- **Permission Model** — 7 hierarchical scopes (`agent:read` through `agent:elevate`) with time-bounded grants and rate limiting
- **Audit Trail** — Append-only event ledger with ULID ordering, content hashing, and exportable signed bundles
- **Trust Scoring** — 5-factor algorithm (status, age, success rate, denial ratio, scope breadth) producing a 0-100 score
- **Credential Delegation** — Secure OAuth token proxy with AES-256-GCM encrypted vault, multi-hop delegation chains, scope attenuation, and cascading revocation
- **Ephemeral Identity** — W3C did:key identifiers for short-lived agents with TTL-based auto-expiry
- **Conformance Levels** — 7 tiers from basic identity to full cryptographic audit with credential delegation and ephemeral identity

## Conformance Levels

| Level | Name | Requirements |
|-------|------|-------------|
| 1 | Identity | Agent registration with Ed25519 keypairs |
| 2 | Permissioned | Level 1 + scoped permissions with time bounds |
| 3 | Audited | Level 2 + append-only audit trail with content hashing |
| 4 | Trusted | Level 3 + trust scoring and public verification |
| 5 | Sealed | Level 4 + signed audit bundles with SHA-256 manifests |
| 6 | Delegated | Level 5 + credential delegation with scope attenuation and cascading revocation |
| 7 | Ephemeral | Level 5 + W3C did:key identifiers with TTL-based auto-expiry |

## SDKs

### TypeScript

```bash
npm install @vorim/sdk
```

```typescript
import createVorim from "@vorim/sdk";

const vorim = createVorim({
  apiKey: "agid_sk_live_...",
});

// Register an agent — returns Ed25519 keypair (private key shown once)
const { agent, private_key } = await vorim.register({
  name: "my-agent",
  capabilities: ["read_documents"],
  scopes: ["agent:read", "agent:execute"],
});

// Verify any agent (public, no auth required)
const trust = await vorim.verify("agid_acme_a1b2c3d4");
console.log(`Trust score: ${trust.trust_score}/100`);

// Check permissions before acting (<5ms via Redis)
const perm = await vorim.check(agent.agent_id, "agent:execute");
if (perm.allowed) {
  // proceed with action
}

// Emit an audit event
await vorim.emit({
  agent_id: agent.agent_id,
  event_type: "tool_call",
  action: "process_invoice",
  result: "success",
  latency_ms: 142,
});
```

Full SDK docs: [@vorim/sdk on npm](https://www.npmjs.com/package/@vorim/sdk)

### Python

```bash
pip install vorim
```

```python
from vorim import Vorim

vorim = Vorim(api_key="agid_sk_live_...")

# Register an agent
result = vorim.register(
    name="my-agent",
    capabilities=["read_documents"],
    scopes=["agent:read", "agent:execute"],
)

# Verify any agent (public, no auth required)
trust = vorim.verify("agid_acme_a1b2c3d4")
print(f"Trust score: {trust.trust_score}/100")

# Check permissions (<5ms via Redis)
check = vorim.check(result.agent.agent_id, "agent:execute")

# Emit an audit event
vorim.emit(
    agent_id=result.agent.agent_id,
    event_type="tool_call",
    action="process_invoice",
    result="success",
)
```

Async client available via `AsyncVorim`. Full docs: [vorim on PyPI](https://pypi.org/project/vorim/)

## Framework Integrations

VAIP SDKs ship with first-class integrations for popular AI agent frameworks. Each integration provides permission-checked tool execution and automatic audit trail emission.

| Framework | TypeScript | Python | Example |
|-----------|-----------|--------|---------|
| **LangChain / LangGraph** | `@vorim/sdk/integrations/langchain` | `vorim[langchain]` | [langchain.ts](examples/integrations/langchain.ts) |
| **OpenAI Function Calling** | `@vorim/sdk/integrations/openai` | `vorim[openai]` | [openai.ts](examples/integrations/openai.ts) |
| **CrewAI** | `@vorim/sdk/integrations/crewai` | `vorim[crewai]` | [crewai.ts](examples/integrations/crewai.ts) |
| **LlamaIndex** | `@vorim/sdk/integrations/llamaindex` | — | [llamaindex.ts](examples/integrations/llamaindex.ts) |
| **Anthropic / Claude** | `@vorim/sdk/integrations/anthropic` | `vorim[anthropic]` | [anthropic.ts](examples/integrations/anthropic.ts) |

See [examples/integrations/](examples/integrations/) for complete working examples, including a [Python quick start](examples/integrations/python_quickstart.py).

## MCP Server

Vorim AI ships an MCP (Model Context Protocol) server that exposes all Vorim operations as tools for Claude, Cursor, VS Code, and any MCP-compatible client.

```bash
npm install -g @vorim/mcp-server
```

Configure in Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "vorim": {
      "command": "npx",
      "args": ["@vorim/mcp-server"],
      "env": { "VORIM_API_KEY": "agid_sk_live_..." }
    }
  }
}
```

13 tools available: `vorim_ping`, `vorim_register_agent`, `vorim_get_agent`, `vorim_list_agents`, `vorim_update_agent`, `vorim_revoke_agent`, `vorim_check_permission`, `vorim_grant_permission`, `vorim_list_permissions`, `vorim_revoke_permission`, `vorim_emit_event`, `vorim_export_audit`, `vorim_verify_trust`.

## A2A Protocol Integration

Vorim provides an identity and trust verification layer for [Google's A2A (Agent-to-Agent) Protocol](https://a2a-protocol.org/). Extends A2A Agent Cards with cryptographic identity and live trust scoring.

```bash
npm install @vorim/a2a
```

```typescript
import { createVorimA2A } from '@vorim/a2a';

const a2a = createVorimA2A({ apiKey: 'agid_sk_...' });

// Extend your Agent Card with Vorim identity
const card = await a2a.extendAgentCard(baseCard, agentId);
// card.vorimIdentity = { agentId, trustScore, publicKeyFingerprint, scopes, verifyUrl }

// Verify an incoming agent before interacting
const result = await a2a.verifyAgent(incomingCard);
if (result.trusted) {
  // Trust score verified via public API, not self-reported
}

// Middleware for automatic verification
const handler = a2a.middleware({ minTrustScore: 70 })(yourHandler);
```

Python:

```python
from vorim.a2a import VorimA2A

a2a = VorimA2A(api_key="agid_sk_...")
result = a2a.verify_agent(incoming_card, min_trust_score=60)
```

Full details: [@vorim/a2a on npm](https://www.npmjs.com/package/@vorim/a2a) | [Blog post](https://vorim.ai/blog/vorim-a2a-identity-trust-layer)

## Agent Discovery

Vorim AI publishes a machine-readable Agent Card for automated discovery:

```
GET https://vorim.ai/.well-known/agent.json
```

This follows the A2A (Agent-to-Agent) discovery pattern, allowing other agents to programmatically discover Vorim's capabilities, endpoints, and authentication requirements.

## Implementation Guide

A managed implementation of VAIP is available at [vorim.ai](https://vorim.ai). Interactive API documentation is available at [vorim.ai/docs](https://vorim.ai/docs). To build your own conforming implementation, refer to:

- [SPEC.md](SPEC.md) — Full protocol specification with wire formats and algorithms
- [examples/register.ts](examples/register.ts) — Agent registration, signing, and audit event emission
- [examples/verify.ts](examples/verify.ts) — Public trust verification and permission checks
- [Appendix B: SDK Interface](SPEC.md#appendix-b-sdk-interface) — Required SDK operations for a conforming client

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on proposing changes through the RFC process.

## License

Business Source License 1.1 (BSL 1.1) — see [LICENSE](LICENSE) for details.

---

Built by [Vorim AI](https://vorim.ai)
