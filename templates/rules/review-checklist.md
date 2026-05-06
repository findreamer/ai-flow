# Team Review Checklist

All code reviews must check these items before approving.

## Correctness

- [ ] Code implements the requirement as specified in the design doc
- [ ] Edge cases handled (empty input, null, boundary values)
- [ ] Error paths are covered with meaningful messages

## Code Quality

- [ ] Follows team coding standards (`rules/coding-standards.md`)
- [ ] No duplicated logic (DRY)
- [ ] Function/class responsibilities are focused (SRP)
- [ ] Naming is intent-revealing

## Security

- [ ] No hardcoded secrets or credentials
- [ ] User input is validated and sanitized
- [ ] No SQL injection / XSS / command injection vectors
- [ ] Sensitive data not logged

## Testing

- [ ] Unit tests cover happy path and error cases
- [ ] E2E tests exist for critical user flows
- [ ] No skipped or flaky tests
- [ ] Test names describe the scenario being tested
