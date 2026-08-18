# Security, Secrets & Privacy Guardrails

## Data Privacy Policy: Strict Enterprise: 100% On-Premise, zero external cloud telemetry, anti-secret scanning
- **Zero Secrets in Codebase:** Absolutely no API keys, private tokens, passwords, or credentials committed to git. Use `.env` variables.
- **Data Sovereignty:** No telemetry, internal project source code, or customer context may be dispatched to public cloud endpoints.
- **Input Validation & Sanitization:** Validate and sanitize all external inputs, shell arguments, and file paths.
