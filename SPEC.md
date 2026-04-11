# Vorim Agent Identity Protocol (VAIP)

**Version:** 3.0.0
**Status:** Stable
**Authors:** Vorim AI
**Date:** April 2026

---

## Abstract

The Vorim Agent Identity Protocol (VAIP) defines a standard for establishing verifiable identity, fine-grained permissions, trust scoring, and tamper-evident audit trails for autonomous AI agents. It provides the cryptographic primitives and data structures necessary for any system to issue, verify, and manage agent identities in a multi-tenant environment.

This specification is implementation-agnostic. Any conforming system may implement VAIP regardless of programming language, database, or deployment model.

---

## 1. Introduction

### 1.1 Problem Statement

Autonomous AI agents are increasingly deployed to perform real-world tasks: executing code, sending messages, making transactions, and accessing sensitive resources. Unlike human users, agents lack a standardized identity layer. There is no widely adopted protocol for answering fundamental questions about an agent:

- **Who is this agent?** (Identity)
- **What is it allowed to do?** (Permissions)
- **What has it done?** (Audit)
- **Should I trust it?** (Trust)

Existing identity systems (OAuth 2.0, API keys, X.509 certificates) were designed for human users or static services. They do not address the unique requirements of autonomous agents that act independently, accumulate behavioral history, and require dynamic trust assessment.

### 1.2 Design Principles

1. **Cryptographic verifiability** — Every identity claim MUST be verifiable through public key cryptography without relying on a central authority at verification time.
2. **Minimal trust** — Private keys are generated once and never stored by the issuing system. The agent (or its operator) is the sole custodian of its private key.
3. **Auditability** — Every action performed by an agent MUST be logged in a tamper-evident ledger. Audit records MUST support independent integrity verification.
4. **Interoperability** — The protocol uses widely supported cryptographic standards (Ed25519, SHA-256) and data formats (JSON, PEM) to enable cross-platform verification.
5. **Multi-tenancy** — All identities, permissions, and audit records are scoped to an organisation. No data leaks across tenants.

### 1.3 Terminology

| Term | Definition |
|------|-----------|
| **Agent** | An autonomous software entity that performs actions on behalf of an organisation |
| **Organisation** | A tenant entity that owns and manages agents |
| **Operator** | A human user who registers and configures agents within an organisation |
| **Scope** | A named permission that authorises a specific category of action |
| **Trust Score** | A numeric assessment (0-100) of an agent's reliability based on behavioral history |
| **Audit Event** | An immutable record of an action performed by or on behalf of an agent |

### 1.4 Notation

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHOULD", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

---

## 2. Agent Identity

### 2.1 Identity Format

Every agent MUST be assigned a unique agent identifier upon registration. The identifier follows this format:

```
agid_{org_slug}_{random}
```

Where:
- `agid_` is a fixed prefix identifying the string as a VAIP agent identifier
- `{org_slug}` is a truncated (up to 8 characters) alphanumeric slug identifying the owning organisation
- `{random}` is a cryptographically random string (8 characters, derived from UUID v4)

**Example:** `agid_acme_a1b2c3d4`

Agent identifiers MUST be globally unique and MUST NOT be reused after revocation.

### 2.2 Keypair Generation

Each agent MUST be assigned an **Ed25519** keypair at registration time. Ed25519 was chosen for the following properties:

- 128-bit security level
- Fast key generation, signing, and verification
- Small key and signature sizes (32-byte public keys, 64-byte signatures)
- Deterministic signatures (no nonce reuse vulnerabilities)
- Resistance to timing attacks

The keypair MUST be generated as follows:

1. Generate an Ed25519 keypair using the system's cryptographic random number generator
2. Encode the public key in SPKI/PEM format
3. Encode the private key in PKCS#8/PEM format
4. Compute the key fingerprint (see Section 2.3)
5. Return the private key to the operator **exactly once**
6. Store the public key and fingerprint; **never store the private key**

### 2.3 Key Fingerprint

A key fingerprint is a SHA-256 hash of the PEM-encoded public key, represented as a hexadecimal string (64 characters):

```
fingerprint = SHA-256(public_key_pem)[0:64]
```

The fingerprint serves as a compact, verifiable reference to an agent's identity. It MUST be included in trust verification responses and MAY be used for identity comparison without transmitting the full public key.

### 2.4 Agent Metadata

Each agent identity MUST include the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agent_id` | string | Yes | Unique identifier (Section 2.1) |
| `org_id` | string | Yes | Owning organisation identifier |
| `owner_user_id` | string | Yes | Human operator who registered the agent |
| `name` | string | Yes | Human-readable agent name |
| `description` | string | No | Purpose or function of the agent |
| `status` | AgentStatus | Yes | Current lifecycle status |
| `public_key` | string | Yes | Ed25519 public key in PEM format |
| `key_fingerprint` | string | Yes | SHA-256 fingerprint of public key |
| `trust_score` | number | Yes | Current trust score (0-100) |
| `capabilities` | string[] | Yes | Declared capabilities of the agent |
| `metadata` | object | No | Arbitrary key-value metadata |
| `expires_at` | timestamp | No | Optional expiration time |
| `created_at` | timestamp | Yes | Registration timestamp |
| `updated_at` | timestamp | Yes | Last modification timestamp |
| `revoked_at` | timestamp | No | Revocation timestamp, if revoked |
| `revoked_by` | string | No | User who revoked the agent |

### 2.5 Agent Lifecycle

An agent MUST exist in exactly one of the following states at any time:

```
  pending ──> active ──> suspended ──> active
                │              │
                ▼              ▼
             revoked        revoked
                │              │
                ▼              ▼
             expired        expired
```

| Status | Description |
|--------|-------------|
| `pending` | Registered but not yet activated |
| `active` | Fully operational, permissions enforceable |
| `suspended` | Temporarily disabled, can be reactivated |
| `revoked` | Permanently disabled, cannot be reactivated |
| `expired` | Past its `expires_at` timestamp |

Transitions:
- `pending` → `active`: Operator activates the agent
- `active` → `suspended`: Operator suspends or anomaly detected
- `suspended` → `active`: Operator reactivates
- `active` → `revoked`: Operator permanently revokes
- `suspended` → `revoked`: Operator permanently revokes

A revoked agent MUST NOT be reactivated. Its identifier MUST NOT be reused.

### 2.6 Key Rotation

An agent's keypair MAY be rotated by revoking the current agent and registering a new agent with the same metadata. The new agent MUST receive a new `agent_id` and keypair.

Conforming implementations SHOULD provide a convenience method that:
1. Creates a new agent with the same name, description, capabilities, and permissions
2. Revokes the original agent
3. Returns the new agent's private key

---

## 3. Permission Model

### 3.1 Scopes

VAIP defines 7 hierarchical permission scopes. Each scope authorises a category of agent actions:

| Scope | Identifier | Description | Risk Level |
|-------|-----------|-------------|------------|
| Read | `agent:read` | Query data, retrieve information | Low |
| Write | `agent:write` | Create or modify data | Medium |
| Execute | `agent:execute` | Run code, invoke functions, trigger workflows | Medium |
| Transact | `agent:transact` | Financial operations, purchases, transfers | High |
| Communicate | `agent:communicate` | Send messages, emails, notifications to external parties | Medium |
| Delegate | `agent:delegate` | Grant permissions to other agents | High |
| Elevate | `agent:elevate` | Modify own permissions, escalate privilege | Critical |

Scopes are **not hierarchical by default** — possessing `agent:write` does not imply `agent:read`. Each scope MUST be granted independently.

### 3.2 Permission Grants

A permission grant binds a scope to an agent with optional constraints:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique grant identifier |
| `agent_id` | string | Yes | Target agent |
| `scope` | PermissionScope | Yes | Scope being granted |
| `granted_by` | string | Yes | User who issued the grant |
| `valid_from` | timestamp | Yes | When the grant becomes effective |
| `valid_until` | timestamp | No | Expiration time (null = no expiry) |
| `rate_limit` | RateLimit | No | Usage limits (see Section 3.3) |
| `conditions` | object | No | Additional constraints (see Section 3.4) |
| `created_at` | timestamp | Yes | When the grant was created |
| `revoked_at` | timestamp | No | When the grant was revoked |

### 3.3 Rate Limits

A rate limit constrains how frequently a scope can be exercised:

```json
{
  "max": 1000,
  "window": "1h"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `max` | integer | Maximum number of uses within the window |
| `window` | string | Time window: `"1m"` (minute), `"1h"` (hour), `"1d"` (day) |

When an agent exceeds its rate limit, permission checks MUST return `denied` with reason `RATE_LIMIT_EXCEEDED`.

### 3.4 Conditional Constraints

Permission grants MAY include conditions that further restrict when the scope is valid:

```json
{
  "ip_allowlist": ["10.0.0.0/8", "192.168.1.0/24"]
}
```

Conditions are evaluated at check time. If any condition is not met, the permission check MUST return `denied`.

### 3.5 Permission Check Flow

When an agent requests to perform an action, the system MUST execute the following check sequence:

```
1. Validate agent_id exists and status is 'active'
2. Check cache for recent permission decision
3. If cache miss:
   a. Query grants for the agent + scope combination
   b. Filter to grants where valid_from <= now AND (valid_until IS NULL OR valid_until > now)
   c. Filter to grants where revoked_at IS NULL
   d. Evaluate rate limits
   e. Evaluate conditional constraints
4. Cache the decision (RECOMMENDED TTL: 300 seconds)
5. Return PermissionCheckResult
```

### 3.6 Permission Check Response

```json
{
  "allowed": true,
  "scope": "agent:write",
  "agent_id": "agid_acme_a1b2c3d4",
  "reason": null,
  "remaining_quota": 847
}
```

When denied:

```json
{
  "allowed": false,
  "scope": "agent:transact",
  "agent_id": "agid_acme_a1b2c3d4",
  "reason": "SCOPE_NOT_GRANTED"
}
```

Valid denial reasons:
- `AGENT_NOT_FOUND` — Agent identifier does not exist
- `AGENT_NOT_ACTIVE` — Agent is suspended, revoked, or expired
- `SCOPE_NOT_GRANTED` — No active grant for this scope
- `GRANT_EXPIRED` — Grant has passed its `valid_until` time
- `RATE_LIMIT_EXCEEDED` — Rate limit exhausted for current window
- `CONDITION_NOT_MET` — A conditional constraint was not satisfied

---

## 4. Audit Trail

### 4.1 Event Schema

Every auditable action MUST produce an audit event with the following structure:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event_id` | string | Yes | Unique event identifier (time-sortable, e.g. ULID) |
| `agent_id` | string | Yes | Agent that performed or triggered the action |
| `org_id` | string | Yes | Organisation context |
| `event_type` | EventType | Yes | Category of event |
| `action` | string | Yes | Specific action performed (e.g. `"create_order"`) |
| `resource` | string | No | Target resource identifier |
| `input_hash` | string | No | SHA-256 hash of the action input |
| `output_hash` | string | No | SHA-256 hash of the action output |
| `permission` | string | No | Scope under which the action was performed |
| `result` | Result | Yes | Outcome: `success`, `denied`, or `error` |
| `latency_ms` | number | No | Execution time in milliseconds |
| `error_code` | string | No | Error code if result is `error` |
| `signature` | string | No | Ed25519 signature of the event payload |
| `metadata` | object | No | Arbitrary additional context |
| `timestamp` | timestamp | Yes | When the event occurred (ISO 8601) |

### 4.2 Event Types

| Type | Description |
|------|-------------|
| `tool_call` | Agent invoked a tool or function |
| `api_request` | Agent made an API request |
| `message_sent` | Agent sent a message to an external party |
| `permission_change` | A permission was granted or revoked |
| `status_change` | Agent status was modified |
| `key_rotation` | Agent keypair was rotated |
| `login` | Human operator logged in |
| `export` | Audit data was exported |

### 4.3 Hash Format

All hashes in audit events MUST use the following format:

```
sha256:{hex_digest}
```

Where `{hex_digest}` is the lowercase hexadecimal representation of the SHA-256 hash.

**Example:** `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

### 4.4 Event Signatures

Audit events MAY be signed by the agent that produced them. When present, the `signature` field MUST contain an Ed25519 signature of the canonical JSON representation of the event (excluding the `signature` field itself), encoded as:

```
ed25519:{base64_signature}
```

Verifiers can confirm authenticity by:
1. Retrieving the agent's public key via its `agent_id`
2. Reconstructing the canonical event payload (all fields except `signature`)
3. Verifying the Ed25519 signature against the public key

### 4.5 Immutability

Audit events MUST be append-only. Once written, an event MUST NOT be modified or deleted (except by automated retention policies). Conforming implementations SHOULD use append-only storage mechanisms.

### 4.6 Signed Audit Bundles

A conforming system MUST support exporting audit events as signed bundles for external verification. A bundle consists of:

```json
{
  "events": [ ... ],
  "event_count": 1247,
  "from": "2026-01-01T00:00:00Z",
  "to": "2026-01-31T23:59:59Z",
  "org_id": "org_acme_123",
  "manifest": "sha256:a1b2c3d4...",
  "generated_at": "2026-02-01T00:00:01Z"
}
```

The `manifest` field contains a SHA-256 hash of the JSON-serialised `events` array. Any modification to any event will produce a different manifest hash, making tampering detectable.

To verify a bundle:
1. Extract the `events` array
2. Serialise it as JSON with consistent formatting
3. Compute SHA-256 of the serialised string
4. Compare with the `manifest` value

---

## 5. Trust Scoring

### 5.1 Overview

Trust scoring provides a quantitative assessment of an agent's reliability. The score is a number from 0 to 100, computed from multiple behavioral and configuration factors.

Trust scores are:
- **Dynamic** — recalculated based on recent behavior
- **Public** — available through unauthenticated verification endpoints
- **Composite** — derived from multiple independent factors

### 5.2 Scoring Algorithm

The trust score is computed as follows:

```
score = base_score
      + status_factor
      + age_factor
      + success_rate_factor
      - denial_penalty
      - scope_breadth_penalty
```

**Base Score:** 50

**Status Factor:**
| Status | Factor |
|--------|--------|
| `active` | +10 |
| `suspended` | -20 |
| `revoked` | Score is fixed at 0 |
| `pending` | 0 |

**Age Factor** (days since registration):
| Age | Factor |
|-----|--------|
| > 90 days | +15 |
| > 30 days | +10 |
| > 7 days | +5 |
| <= 7 days | 0 |

**Success Rate Factor** (over trailing 30-day window):
```
success_rate = success_count / (success_count + denied_count + error_count)
factor = round(success_rate * 15)
```

**Denial Penalty:**
If `denied_count > total_events * 0.1` (more than 10% denials), apply -10.

**Scope Breadth Penalty:**
If the agent holds more than 5 active scopes, apply -5.

The final score is clamped to the range [0, 100].

### 5.3 Trust Verification

Conforming implementations MUST provide a public, unauthenticated endpoint for trust verification. The response MUST include:

```json
{
  "agent_id": "agid_acme_a1b2c3d4",
  "verified": true,
  "owner": {
    "org_name": "Acme Corp",
    "org_slug": "acme",
    "verified": true
  },
  "trust_score": 82,
  "status": "active",
  "created_at": "2026-01-15T10:30:00Z",
  "active_scopes": ["agent:read", "agent:write", "agent:execute"],
  "key_fingerprint": "a1b2c3d4e5f6...",
  "revocation_status": false,
  "last_audit_event": "2026-03-14T18:22:01Z"
}
```

The `verified` field is `true` if and only if `status` is `"active"`.

Trust verification responses SHOULD be cached for 60 seconds to balance freshness with performance.

### 5.4 Trust Badges

Conforming implementations SHOULD provide embeddable SVG trust badges. A badge displays:
- The protocol name (VORIM)
- The verification status (Verified, Suspended, Revoked)
- The trust score (0-100)

Badge colour coding:
| Score Range | Colour | Meaning |
|-------------|--------|---------|
| 80-100 | Green (#4ade80) | High trust |
| 50-79 | Amber (#f59e0b) | Moderate trust |
| 0-49 | Red (#f43f5e) | Low trust |

---

## 6. Authentication

### 6.1 Human Operator Authentication

Human operators authenticate via email and password. Conforming implementations MUST:

- Hash passwords with bcrypt (minimum cost factor 12)
- Issue short-lived access tokens (RECOMMENDED: 15 minutes / 900 seconds)
- Issue refresh tokens for session continuity (RECOMMENDED: 7 days / 604800 seconds)
- Support token rotation on refresh

### 6.2 Server-to-Server Authentication (API Keys)

Agent operations (audit event ingestion, permission checks) authenticate via API keys. The key format:

```
agid_sk_{environment}_{random}
```

Where:
- `agid_sk_` is a fixed prefix identifying the string as a VAIP API key
- `{environment}` is `live` or `test`
- `{random}` is 24 bytes of cryptographically random data, base64url-encoded

**Example:** `agid_sk_live_aBcDeFgHiJkLmNoPqRsTuV`

API keys MUST:
- Be shown to the operator exactly once upon creation
- Be stored as SHA-256 hashes (never plaintext)
- Be scoped to a single organisation
- Support optional expiration dates
- Be revocable at any time

A key prefix (first 16 characters) is stored alongside the hash for identification purposes.

---

## 7. API Surface

### 7.1 Base URL

All endpoints are served under a versioned path prefix:

```
{base_url}/v1
```

### 7.2 Endpoints

#### Identity

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/agents` | JWT | Register a new agent |
| `GET` | `/agents` | JWT | List organisation agents |
| `GET` | `/agents/:id` | JWT | Get agent details |
| `PATCH` | `/agents/:id` | JWT | Update agent metadata |
| `DELETE` | `/agents/:id` | JWT | Revoke agent permanently |

#### Permissions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/agents/:id/permissions` | JWT | Grant a scope |
| `GET` | `/agents/:id/permissions` | JWT | List active permissions |
| `DELETE` | `/agents/:id/permissions/:scope` | JWT | Revoke a scope |
| `POST` | `/agents/:id/permissions/verify` | JWT | Check a permission |

#### Audit

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/audit/events` | API Key | Ingest audit events (batch) |
| `GET` | `/audit/events` | JWT | Query events with filters |
| `GET` | `/audit/stats` | JWT | Event statistics (configurable window) |
| `GET` | `/audit/hourly` | JWT | Hourly event counts for charts |
| `POST` | `/audit/export` | JWT | Export signed audit bundle |

#### Trust (Public)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/trust/verify/:agentId` | None | Public trust verification |
| `GET` | `/trust/badge/:agentId.svg` | None | Embeddable trust badge |

#### API Keys

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api-keys` | JWT | Create API key |
| `GET` | `/api-keys` | JWT | List API keys |
| `DELETE` | `/api-keys/:id` | JWT | Revoke API key |

#### Documentation

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/docs` | None | Interactive API documentation (Swagger UI) |
| `GET` | `/docs/openapi.json` | None | OpenAPI 3.1 specification (JSON) |

### 7.3 Response Envelope

All successful responses MUST use this envelope:

```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 50,
    "total": 247,
    "total_pages": 5
  }
}
```

The `meta` field is present only for paginated responses.

### 7.4 Error Envelope

All error responses MUST use this envelope:

```json
{
  "error": {
    "code": "AGENT_NOT_FOUND",
    "message": "Agent agid_acme_a1b2c3d4 not found in the trust registry",
    "details": {},
    "request_id": "req_a1b2c3d4"
  }
}
```

Standard error codes:
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request body failed validation |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Authenticated but insufficient permissions |
| `AGENT_NOT_FOUND` | 404 | Agent identifier not found |
| `ORG_NOT_FOUND` | 404 | Organisation not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### 7.5 Rate Limiting Headers

All responses from rate-limited endpoints MUST include:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1711234567
```

---

## 8. Security Considerations

### 8.1 Cryptographic Choices

| Primitive | Algorithm | Rationale |
|-----------|-----------|-----------|
| Agent identity | Ed25519 | Fast, compact, timing-attack resistant, no nonce reuse risk |
| Fingerprints | SHA-256 | Widely supported, collision resistant, 256-bit security |
| Audit integrity | SHA-256 | Industry standard for data integrity verification |
| Password hashing | bcrypt (cost 12) | Memory-hard, adjustable work factor |
| API key storage | SHA-256 | One-way hashing for stored secrets |

### 8.2 Private Key Handling

The private key is the most sensitive artifact in the protocol. Conforming implementations:
- MUST generate private keys server-side using a cryptographic random number generator
- MUST return the private key to the operator exactly once
- MUST NOT store, log, or persist the private key after returning it
- MUST NOT transmit private keys over unencrypted channels

If a private key is compromised, the operator MUST revoke the agent and register a new one. Lost private keys cannot be recovered.

### 8.3 Multi-Tenant Isolation

All database queries MUST be scoped to the authenticated organisation's identifier. Conforming implementations MUST ensure that:
- No agent, permission, or audit record from one organisation is accessible by another
- API keys are scoped to a single organisation
- Trust verification endpoints expose only public-facing data (no audit events, no internal permissions)

### 8.4 Transport Security

All API communications MUST use TLS 1.2 or higher. TLS 1.3 is RECOMMENDED. Implementations MUST NOT allow plaintext HTTP in production.

### 8.5 Threat Model

| Threat | Mitigation |
|--------|------------|
| Key compromise | Immediate revocation, new agent registration |
| Audit tampering | SHA-256 manifest on export bundles, append-only storage |
| Cross-tenant access | Organisation-scoped queries, API key isolation |
| Replay attacks | Time-sortable event IDs, timestamp validation |
| Brute-force authentication | bcrypt password hashing, API key entropy (192 bits) |
| Trust score manipulation | Score derived from audited behavior, not self-reported |

---

## 9. Conformance Levels

Implementations MAY conform to one or more levels:

### Level 1 — Identity
- Agent registration with Ed25519 keypairs
- Key fingerprint generation
- Agent lifecycle management (activate, suspend, revoke)
- Agent identifier format compliance

### Level 2 — Permissions
- All Level 1 requirements
- 7 permission scopes
- Time-bounded grants with validity windows
- Rate limiting on scopes
- Permission check with caching

### Level 3 — Audit
- All Level 2 requirements
- Audit event ingestion and storage
- Event schema compliance (all required fields)
- SHA-256 hash format for input/output hashes
- Event query with filtering and pagination

### Level 4 — Trust
- All Level 3 requirements
- Trust score computation (5-factor algorithm)
- Public trust verification endpoint
- Embeddable trust badge generation
- Trust record caching (60-second TTL)

### Level 5 — Full Conformance
- All Level 4 requirements
- Signed audit bundle export with SHA-256 manifest
- Ed25519 event signatures
- Multi-format export (JSON, CSV, PDF)
- API key management with SHA-256 hashed storage

---

## 10. Credential Delegation (Extension)

### 10.1 Overview

When an agent needs to access a third-party service (e.g., Google Drive, GitHub, Salesforce) on behalf of a user, it requires OAuth credentials. Credential delegation defines how an agent receives scoped, time-limited credentials without exposing raw refresh tokens or long-lived secrets.

This extension is complementary to draft-sweeney-wimse-credential-delegation-00, which defines the wire protocol for OAuth token delegation. VAIP's contribution is binding credential delegation to verified agent identities, permission scopes, and audit trails.

### 10.2 Delegation Model

A credential delegation binds an agent to a user's OAuth connection with attenuated scopes:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `delegation_id` | string | Yes | Unique delegation identifier |
| `connection_id` | string | Yes | Reference to the user's OAuth connection |
| `agent_id` | string | Yes | Agent receiving the delegation |
| `scopes_delegated` | string[] | Yes | Must be a subset of the connection's granted scopes |
| `max_requests_per_hr` | integer | No | Rate limit on token requests |
| `valid_from` | timestamp | Yes | When the delegation becomes effective |
| `valid_until` | timestamp | No | Expiration time (null = no expiry) |
| `granted_by` | string | Yes | User who authorised the delegation |

A conforming system MUST:
- Verify the requesting agent's VAIP identity before issuing any credential
- Check the agent's permission scope against the requested OAuth scope
- Issue short-lived access tokens only; refresh tokens MUST remain in the delegation server's encrypted vault (AES-256-GCM)
- Record every credential issuance as an audit event
- Support immediate revocation that propagates across delegation chains

### 10.3 Multi-Hop Delegation Chains

In multi-agent systems, credentials may flow through delegation chains: User → Agent A → Agent B → Agent C. At each hop, credentials SHOULD be attenuated — narrowing the scope, reducing the time-to-live, and lowering the rate limit.

Each delegation hop MUST:
1. Verify the delegating agent has the `agent:delegate` permission
2. Produce a signed delegation receipt (Ed25519 JWS) linking the delegator's `agent_id` to the delegate's `agent_id`
3. Record the delegation as an audit event with `event_type: "credential_delegation"`
4. Enforce that the delegated credential's scope is a strict subset of the delegator's scope

### 10.4 Cascading Revocation

Revoking any link in a delegation chain MUST cascade to all downstream delegates. Revocation MUST propagate synchronously (within 5 seconds). Revocation events MUST be recorded in the credential audit trail.

### 10.5 Token Request Flow

```
1. Agent sends POST /credentials/token with agent_id and scope
2. System verifies agent VAIP identity (active, not revoked)
3. System finds active credential delegation for this agent
4. System verifies requested scope is within delegated scopes
5. System decrypts refresh token from encrypted vault
6. System exchanges refresh token for short-lived access token
7. System returns access token to agent (never the refresh token)
8. System logs the token issuance to credential audit trail
```

---

## 11. Ephemeral Agent Identity (Extension)

### 11.1 Overview

For short-lived agents that do not require persistent identity registration, VAIP supports ephemeral identity using W3C `did:key` format. Ephemeral agents bootstrap identity on instantiation without traditional pre-registration.

### 11.2 did:key Format

An ephemeral agent identity is derived from an Ed25519 public key:

```
did:key:z{base58btc(0xed01 + raw_32_byte_public_key)}
```

The `did:key` identifier is deterministic — the same public key always produces the same DID. No registry lookup is required for resolution.

### 11.3 Ephemeral Agent Properties

| Property | Value |
|----------|-------|
| `agent_id` format | `did:key:z6Mk...` (W3C standard) |
| Maximum lifetime | 24 hours (RECOMMENDED default: 1 hour) |
| Permission lifetime | Expires with agent TTL |
| Status transitions | `active` → `expired` (automatic) |
| Audit trail | Full — all actions attributable to the `did:key` |
| Revocation | Automatic on TTL expiry, or manual |

### 11.4 Conformance

Ephemeral identity support is OPTIONAL. It does not replace persistent Ed25519 identity for production agents requiring long-term accountability. Implementations that support ephemeral identity MUST still enforce all VAIP permission checks and audit trail requirements.

---

## 12. References

### Normative References

- **RFC 8032** — Edwards-Curve Digital Signature Algorithm (Ed25519)
- **RFC 6234** — US Secure Hash Algorithms (SHA-256)
- **RFC 2119** — Key words for use in RFCs to Indicate Requirement Levels
- **RFC 8259** — The JavaScript Object Notation (JSON) Data Interchange Format

### Informative References

- **OAuth 2.0** (RFC 6749) — Framework for authorisation delegation. VAIP differs by focusing on autonomous agents rather than human-delegated access.
- **DID** (W3C Decentralized Identifiers) — Decentralized identity standard. VAIP is complementary; agent identifiers could be extended to DID format.
- **SPIFFE** (Secure Production Identity Framework for Everyone) — Workload identity standard. VAIP adds trust scoring and audit trails beyond identity attestation.
- **X.509** (RFC 5280) — Certificate-based identity. VAIP uses Ed25519 directly rather than certificate chains for simplicity and agent-specific semantics.
- **EU AI Act** — European regulation on AI systems. VAIP's audit and identity features support compliance with high-risk AI system requirements.
- **US Executive Order on AI** (EO 14110) — Federal executive order on safe, secure, and trustworthy AI. VAIP's identity verification, scoped permissions, and tamper-evident audit trails directly support the order's requirements for risk management, transparency, and accountability in AI systems.
- **Credential Delegation Protocol** (draft-sweeney-wimse-credential-delegation-00) — Defines secure OAuth token delegation across multi-agent systems. VAIP is complementary: VAIP provides the identity, permission, and audit layers; the Credential Delegation Protocol provides the credential flow mechanics.
- **W3C did:key** — Self-certifying key-based decentralized identifiers. VAIP uses did:key for ephemeral agent identity (Section 11).
- **US State AI Laws** — Colorado AI Act (SB 24-205), Illinois AI Video Interview Act, Texas AI Advisory Council Act (HB 2060), and California's proposed AI transparency legislation. VAIP's audit event logging, agent identity tracking, and permission scoping provide the technical controls these laws require for automated decision-making systems.
- **NIST AI RMF** — AI Risk Management Framework. VAIP aligns with governance, transparency, and accountability principles.

---

## Appendix A: Example Flows

### A.1 Agent Registration

```
Operator                          VAIP Server
   │                                   │
   │  POST /v1/agents                  │
   │  { name, capabilities, scopes }   │
   │──────────────────────────────────>│
   │                                   │
   │                          Generate Ed25519 keypair
   │                          Compute SHA-256 fingerprint
   │                          Create agent record
   │                          Grant initial permissions
   │                                   │
   │  { agent, private_key,            │
   │    public_key, fingerprint }      │
   │<──────────────────────────────────│
   │                                   │
   │  Store private_key securely       │
   │  (never sent again)              │
```

### A.2 Permission Check

```
Agent Runtime                     VAIP Server
   │                                   │
   │  POST /v1/agents/:id/             │
   │    permissions/verify             │
   │  { scope: "agent:write" }         │
   │──────────────────────────────────>│
   │                                   │
   │                          Check cache (Redis)
   │                          If miss: query database
   │                          Evaluate time bounds
   │                          Evaluate rate limits
   │                          Cache result (300s)
   │                                   │
   │  { allowed: true,                 │
   │    remaining_quota: 847 }         │
   │<──────────────────────────────────│
```

### A.3 Trust Verification (Public)

```
Third Party                       VAIP Server
   │                                   │
   │  GET /v1/trust/verify/            │
   │    agid_acme_a1b2c3d4             │
   │──────────────────────────────────>│
   │                                   │
   │                          Check cache (60s TTL)
   │                          If miss: query agent + org
   │                          Compute active scopes
   │                          Cache result
   │                                   │
   │  { verified: true,                │
   │    trust_score: 82,               │
   │    key_fingerprint: "a1b2..." }   │
   │<──────────────────────────────────│
```

---

## Appendix B: SDK Interface

A conforming SDK SHOULD expose the following operations:

```typescript
interface VAIP_SDK {
  // Identity
  register(input: AgentRegistrationInput): Promise<AgentRegistrationResult>;
  getAgent(agentId: string): Promise<Agent>;
  listAgents(params?: PaginationParams): Promise<{ agents: Agent[]; meta: Meta }>;
  revoke(agentId: string): Promise<void>;

  // Permissions
  grant(agentId: string, scope: PermissionScope, options?: GrantOptions): Promise<Permission>;
  check(agentId: string, scope: PermissionScope): Promise<PermissionCheckResult>;

  // Audit
  emit(event: AuditEventInput): Promise<{ event_id: string }>;
  emitBatch(events: AuditEventInput[]): Promise<{ ingested: number }>;

  // Trust
  verify(agentId: string): Promise<TrustVerificationResult>;

  // Signing
  sign(payload: string, privateKey: string): string;
}
```

---

*This specification is maintained by Vorim AI. For questions, feedback, or contributions, contact spec@vorim.dev or open an issue at github.com/Kzino/vorim-protocol.*
