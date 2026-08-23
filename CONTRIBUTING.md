# Contributing

Thanks for improving MeepleReach. Keep changes inside its stated geometric model and avoid inferring medical facts from participant data.

## Development gate

```bash
npm ci
npm run check
```

Use Node.js 22 or 24. The project has zero runtime dependencies; discuss any proposed runtime dependency before adding it.

## Bug reports

Include the smallest scenario JSON that reproduces the behavior, the command, actual exit code/output, and expected result. Remove personal labels or measurements before posting.

## Pull requests

- Add a failing test before changing planner behavior.
- Preserve deterministic assignment and artifact ordering.
- Update the specification when changing public JSON, API, CLI, objective, or exit codes.
- Keep scope narrow and state any accessibility-model tradeoff explicitly.
