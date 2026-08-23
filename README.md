# MeepleReach

[![CI](https://github.com/KanadeK/meeple-reach/actions/workflows/ci.yml/badge.svg)](https://github.com/KanadeK/meeple-reach/actions/workflows/ci.yml)
[![Pages](https://github.com/KanadeK/meeple-reach/actions/workflows/pages.yml/badge.svg)](https://kanadek.github.io/meeple-reach/)
[![License: MIT](https://img.shields.io/badge/License-MIT-bef264.svg)](LICENSE)

**Exact, local component-placement planning for tabletop reach accessibility.**

MeepleReach takes a measured table layout, fixed player anchors, participant-provided comfortable reach radii, component sizes, interaction frequency, and candidate slots. It audits the current layout and exhaustively searches collision-free assignments, then explains the result as JSON, CSV, SVG, and offline HTML.

It does not move people, infer disability, implement game rules, or claim medical/legal compliance.

> [Try the browser demo](https://kanadek.github.io/meeple-reach/) · [中文说明](README.zh-CN.md)

## Why this exists

Mobility accessibility in tabletop play includes reaching and managing components, and component position matters more as interaction frequency increases. MeepleReach makes that concrete for one real layout. See the [bounded project research](docs/RESEARCH.md) and the [v0.1 specification](docs/SPEC.md).

## Quick start

Requirements: Node.js 22 or 24.

```bash
git clone https://github.com/KanadeK/meeple-reach.git
cd meeple-reach
npm ci
node ./bin/meeple-reach.js audit ./samples/cooperative-table.json
node ./bin/meeple-reach.js plan ./samples/cooperative-table.json --out ./plan --fail-on-barrier
```

The sample begins with four blocked interaction pairs. Exact search reassigns four shared components and proves a zero-barrier plan within the declared candidate slots.

Open `plan/report.html` without a server, or inspect:

- `plan.json` — normalized scenario, assignment, objective evidence, and search proof;
- `interactions.csv` — one measured player/component interaction per row;
- `layout.svg` — accessible, scalable planned table;
- `report.html` — self-contained human report.

## Install the packaged CLI

```bash
npm pack
npm install --global ./meeple-reach-0.1.0.tgz
meeple-reach demo --out ./demo
```

No runtime dependency or network service is required.

## Commands

```text
meeple-reach validate INPUT
meeple-reach audit INPUT [--format text|json] [--fail-on-barrier]
meeple-reach plan INPUT --out DIR [--max-search-nodes N] [--fail-on-barrier] [--force]
meeple-reach demo --out DIR [--force]
meeple-reach --version
```

Exit codes are stable: `0` success, `1` unexpected runtime failure, `2` input/usage/output error, `3` accessibility gate failure, `4` search budget exhausted, and `5` no feasible placement. The [testing and repair guide](docs/TESTING.md) shows a real command for each failure.

## Model in one minute

Every component is centred in a named rectangular slot. Reach is Euclidean distance from a fixed player anchor to that centre. A pair is blocked when the distance exceeds that player's own `comfortableReachCm`. Candidate slots can overlap, but assigned component footprints cannot.

Feasible plans are ranked lexicographically by:

1. blocked interaction count;
2. frequency-weighted overreach;
3. components moved;
4. total movement distance;
5. canonical assignment string.

If the node limit is reached, MeepleReach exits `4` and refuses to label or write a best-so-far plan as optimal. Details: [algorithm](docs/ALGORITHM.md) · [input format](docs/INPUT_FORMAT.md) · [ADR](docs/adr/0001-exact-discrete-search.md).

## JavaScript API

```js
import { planScenario, validateScenario } from "meeple-reach";

const scenario = validateScenario(JSON.parse(source));
const plan = planScenario(scenario, { maxSearchNodes: 250_000 });
```

The API is synchronous, deterministic, browser-compatible, and performs no filesystem or network I/O.

## Verify everything

```bash
npm ci
npm run check
```

The gate runs all tests, builds the Pages app, validates and plans the sample, packs the npm tarball, installs it into an isolated consumer directory, and runs the installed CLI. A pass ends with `MEEPLE_REACH_CHECK=PASS`.

## Scope and limitations

Results are exact only within the candidate slots supplied. v0.1 does not model rotation, arbitrary continuous placement, 3D obstacles, hand paths, line of sight, fatigue, or legal standards. A zero-barrier result means only that every declared centre-point distance is within the declared comfort radius.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). Please bring a minimal failing scenario when reporting planner behavior.

MIT © 2026 KanadeK
