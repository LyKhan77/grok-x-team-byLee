# Testing Strategy & QA Standards

## Test Framework: Pytest / Standard Unit Testing
## Testing Protocol: TDD-Strict: Wajib membuat/mengupdate test sebelum/bersama implementasi kode
- **Test-First Verification:** Write or update tests before or alongside implementation.
- **Isolated Unit Testing:** Unit tests must execute quickly and use mocks/stubs for external network or hardware dependencies.
- **Regression Prevention:** Every bug fix must include a test demonstrating the failure before the fix and passing after.
