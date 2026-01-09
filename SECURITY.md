# Security Overview

This document describes the security architecture of the AGC Backend chat widget service.

## Executive Summary

**For customers concerned about data privacy:**

- Chat conversations are processed through **Google Cloud Vertex AI**, an enterprise-grade service. Google explicitly commits that **customer data sent to Vertex AI is not used to train their models**.
- We use **GCP IAM service account authentication**, not consumer API keys.
- All API access is restricted to **pre-approved domains** configured per client.
- **No conversation data is shared with or retained by the LLM provider** beyond the immediate request/response cycle.

---

## Data Privacy & LLM Provider

### Vertex AI Enterprise Guarantees

We use Google Cloud's Vertex AI platform (`aiplatform.googleapis.com`), not the consumer Google AI Studio API. This distinction matters:

| Aspect | Consumer API (AI Studio) | Enterprise API (Vertex AI) ✓ |
|--------|--------------------------|------------------------------|
| Data training | May use prompts to improve models | **Never uses customer data for training** |
| Data residency | Limited control | Configurable per GCP project |
| Authentication | API keys | GCP IAM service accounts |
| Compliance | Consumer terms | Enterprise SLAs available |

**Reference:** [Google Cloud Vertex AI Data Governance](https://cloud.google.com/vertex-ai/docs/generative-ai/data-governance)

### What Data Leaves Your Infrastructure

When a user sends a chat message:
1. The message is sent to our Supabase Edge Function
2. We construct a prompt with your business information + the user's message
3. This is sent to Vertex AI and a response is returned
4. Vertex AI does not retain the conversation after responding

---

## Access Controls

### Origin Validation

Every client has a configured list of allowed origins (domains). Requests are rejected unless the `Origin` header matches an approved domain.

```
✓ https://yourclient.com → Allowed
✗ https://malicious-site.com → 403 Forbidden
```

**Protection scope:**
- Prevents embedding the chat widget on unauthorized websites
- Blocks casual script-tag theft
- Enforced server-side on every request

**Limitation:** The `Origin` header can be spoofed by non-browser clients (e.g., curl, scripts). See "Known Limitations" below.

### Rate Limiting

Requests are rate-limited to **30 requests per minute** per IP address per client. This protects against:
- Automated abuse
- Cost-based denial-of-service attacks
- Runaway scripts

Rate limit data is stored in the database with automatic cleanup of entries older than 1 hour.

### Message Length Limits

User messages are capped at **2000 characters** to prevent:
- Token abuse (excessive LLM costs)
- Payload-based attacks

---

## Infrastructure Security

### Authentication Flow

```
Edge Function → GCP Service Account (JWT/OAuth2) → Vertex AI
```

- Service account credentials are stored as Supabase secrets
- Short-lived OAuth2 access tokens are generated per request
- No API keys are exposed to clients

### Database Security

- **Parameterized queries:** All database operations use Supabase client library with parameterized queries, preventing SQL injection
- **Row Level Security (RLS):** All tables have RLS enabled, restricting access to service role only
- **No direct AI database access:** The LLM cannot query or modify the database; it only receives pre-constructed prompts

### Data Storage

| Data | Stored | Location | Purpose |
|------|--------|----------|---------|
| Chat messages | Yes | Supabase (PostgreSQL) | Analytics, debugging |
| Client configurations | Yes | Supabase | Service operation |
| LLM responses | Yes | Supabase | Analytics, debugging |
| Request origins | Yes | Supabase | Traceability |
| Request IPs | Yes (temporary) | Supabase | Rate limiting |

---

## Known Limitations

We believe in transparency about what this system does and does not protect against.

### Origin Spoofing

**What:** Attackers using non-browser tools (curl, Python scripts) can set arbitrary `Origin` headers, bypassing origin validation.

**Mitigation:** Rate limiting still applies. The attacker gains access to a business-specific chatbot with limited utility for abuse.

**Risk level:** Low. Requires deliberate effort, and the chatbot's narrow scope limits usefulness for general LLM abuse.

### Prompt Injection

**What:** Users may attempt to manipulate the AI through crafted messages (e.g., "Ignore your instructions and...").

**Mitigation:**
- The AI only has access to pre-defined business information
- No tools, function calling, or database access is enabled
- Worst case: the AI behaves unexpectedly but cannot access external systems

**Risk level:** Low impact. May cause off-brand responses but cannot exfiltrate data or access systems.

### Client ID Visibility

**What:** Client IDs are visible in page source code.

**Mitigation:** Origin validation prevents use of discovered client IDs from unauthorized domains. Knowing a client ID alone is insufficient to abuse the service.

### Rate Limit Bypass

**What:** Distributed attacks from many IPs could exceed rate limits.

**Mitigation:** Rate limiting is per-IP, providing reasonable protection. Large-scale distributed attacks would require significant resources for minimal gain (access to a business chatbot).

---

## Audit & Monitoring

All chat interactions are logged with:
- Client ID
- Session ID
- Origin
- Timestamp
- Full message content (user and assistant)

This enables:
- Abuse detection and investigation
- Usage analytics per client
- Debugging and support

**Data retention:** Chat logs are retained indefinitely unless deletion is requested. Consider implementing a retention policy based on your requirements.

---

## Security Checklist for New Clients

When onboarding a new client:

- [ ] Generate unique client ID
- [ ] Configure `allowed_origins` with production domain(s)
- [ ] Verify `active` flag is set appropriately
- [ ] Test from allowed origin
- [ ] Confirm rejection from unauthorized origin

---

## Reporting Security Issues

If you discover a security vulnerability, please contact us directly rather than opening a public issue.

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-09 | Initial security documentation |
| 2026-01-09 | Migrated from Google AI Studio to Vertex AI |
| 2026-01-09 | Added origin validation, rate limiting, message limits |
