# Contributing to the Vorim Agent Identity Protocol

Thank you for your interest in improving VAIP. This protocol is open and we welcome contributions from the community.

## How to Propose Changes

### Minor Changes (typos, clarifications)

Open a pull request directly against `main` with your fix.

### Substantive Changes (new fields, behavioral changes, scope modifications)

Substantive changes go through the RFC process:

1. **Copy the template** — `cp rfcs/001-template.md rfcs/NNN-short-title.md`
2. **Fill out the RFC** — Describe the motivation, the proposed change, and any alternatives considered
3. **Open a PR** — Title it `RFC NNN: Short Title` and label it `rfc`
4. **Discussion** — The community reviews and discusses the proposal in the PR
5. **Decision** — RFCs are accepted, rejected, or deferred by maintainers after sufficient discussion

### What Makes a Good RFC

- **Motivation** — Why is the current spec insufficient?
- **Concrete proposal** — Exact fields, behaviors, and wire formats
- **Backward compatibility** — Does this break existing implementations?
- **Alternatives** — What else was considered and why was it rejected?

## Conformance Levels

When proposing changes, indicate which conformance level(s) are affected:

| Level | Name | Scope |
|-------|------|-------|
| 1 | Identity | Agent registration, keypairs, IDs |
| 2 | Permissioned | Scoped permissions, time bounds, rate limits |
| 3 | Audited | Append-only audit trail, content hashing |
| 4 | Trusted | Trust scoring, public verification |
| 5 | Sealed | Signed audit bundles, SHA-256 manifests |

## Code Examples

If your change affects the protocol behavior, update or add examples in the `examples/` directory showing the change in practice.

## Style Guide

- Use RFC 2119 keywords (MUST, SHOULD, MAY) consistently
- Include wire format examples in JSON
- Reference specific sections when cross-linking within the spec
- Keep language precise and implementation-agnostic where possible

## Code of Conduct

Be respectful, constructive, and focused on making the protocol better for everyone building with AI agents.

## Questions?

Open an issue or reach out at spec@vorim.dev.
