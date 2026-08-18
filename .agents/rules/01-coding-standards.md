# Coding & Code Quality Standards

## Linters & Formatting
- **Configured Linters / Formatters:** Standard Linters & Formatters
- Code must be formatted and lint-clean prior to committing.
- Avoid suppressed warnings (`# noqa`, `#[allow(...)]`, `@ts-ignore`) unless documented with specific rationale.

## Code Design Guidelines
- **Explicit over Implicit:** Explicit typing, clear function signatures, and unambiguous naming.
- **Error Handling:** Never swallow exceptions or discard errors silently. Every error path must return actionable diagnostics.
