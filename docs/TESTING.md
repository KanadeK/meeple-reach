# Testing, acceptance, and failure repair

## Full local acceptance

Run from the repository root with Node.js 22 or 24:

```bash
npm ci
npm run check
```

Success ends with:

```text
MEEPLE_REACH_CHECK=PASS
```

The gate executes unit, integration, CLI, artifact, and site-build tests; then it creates a tarball, installs that tarball into an isolated consumer directory, and runs the installed CLI.

## Manual happy path

```bash
node ./bin/meeple-reach.js validate ./samples/cooperative-table.json
node ./bin/meeple-reach.js audit ./samples/cooperative-table.json
node ./bin/meeple-reach.js plan ./samples/cooperative-table.json --out ./plan --fail-on-barrier
```

Expected plan summary:

```text
Optimal plan: 4 moves, 0 blocked interactions
```

## Real failure paths

### Exit 2 — invalid input

```bash
node ./bin/meeple-reach.js validate ./samples/invalid-reference.json
```

Repair the exact path/reference printed after `Input error`, then rerun `validate` before planning. Do not add silent defaults.

### Exit 3 — accessibility gate

```bash
node ./bin/meeple-reach.js audit ./samples/cooperative-table.json --fail-on-barrier
```

Run `plan`, add plausible candidate slots, or correct a participant-provided measurement. Do not inflate reach values merely to pass the gate.

### Exit 4 — search budget

```bash
node ./bin/meeple-reach.js plan ./samples/cooperative-table.json --out ./plan --max-search-nodes 1
```

Remove implausible candidate slots, mark fixed components accurately, or raise the node limit. MeepleReach writes no plan artifacts because best-so-far is not a proof.

### Exit 5 — impossible assignment

```bash
node ./bin/meeple-reach.js plan ./samples/impossible-overlap.json --out ./plan
```

Move a fixed component, add non-overlapping slots, or reduce a component footprint to its real measured size.

## CI repair

1. Open the failing matrix cell and identify the first failed command.
2. Reproduce on the same Node major (`22` or `24`) and operating system when relevant.
3. Run `npm ci`, then `npm run check`.
4. Fix the smallest root cause and rerun the full gate.

If Pages fails while CI passes, verify repository Pages source is **GitHub Actions**, then inspect the `Pages` workflow's build and deploy jobs. The site artifact must contain `index.html`, `app.js`, `style.css`, `sample.json`, and `lib/`.
