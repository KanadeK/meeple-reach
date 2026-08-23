# MeepleReach v0.1 specification

Status: implementation baseline  
Date: 2026-08-23

## 1. Outcome

MeepleReach reads a JSON scenario, validates the physical model, audits the current setup, and searches all feasible component-to-slot assignments up to a caller-controlled node limit. It emits deterministic JSON, CSV, SVG, and self-contained HTML artifacts.

Success for v0.1 means:

1. A sample with current reach barriers is validated and improved to a zero-barrier exact plan.
2. Invalid input, an impossible placement, an accessibility gate failure, and an exhausted search budget have distinct documented failures.
3. The CLI, package install, generated artifacts, and browser demo execute in automated tests.
4. Linux and Windows CI pass on supported Node.js LTS lines.
5. A public GitHub repository, Pages demo, annotated tag, GitHub Release, and downloadable package exist.

## 2. Coordinate and reach model

- Coordinates and dimensions are centimetres.
- The origin is the table's top-left corner; x increases rightward and y downward.
- A player anchor is a fixed point on or inside the table rectangle.
- A component is centred in its assigned rectangular slot.
- Reach distance is Euclidean distance from the player anchor to the component centre.
- An interaction is blocked when distance exceeds the player's self-reported `comfortableReachCm`.
- `overreachCm = max(0, distanceCm - comfortableReachCm)`.
- Weighted overreach is `overreachCm * usesPerRound`.

The geometric model is a planning aid, not a medical model or compliance certification.

## 3. Input contract

Top-level JSON:

```json
{
  "schemaVersion": 1,
  "name": "Co-op game night",
  "table": { "widthCm": 120, "heightCm": 80 },
  "players": [],
  "slots": [],
  "components": [],
  "interactions": []
}
```

Required records:

- Player: `id`, `label`, `anchor: {xCm, yCm}`, `comfortableReachCm`.
- Slot: `id`, `label`, `rect: {xCm, yCm, widthCm, heightCm}`.
- Component: `id`, `label`, `widthCm`, `heightCm`, `currentSlotId`, `allowedSlotIds`, `movable`.
- Interaction: `playerId`, `componentId`, `usesPerRound`.

Identifiers must be non-empty ASCII slugs. Dimensions, reach, and frequency must be finite and positive; anchor coordinates may be zero. Rectangles must remain inside the table. References must resolve. A component must fit every allowed slot, its current slot must be allowed, and two components cannot share a current slot. Unknown object keys are rejected so misspellings fail at the input boundary.

Candidate slots may overlap because they can represent mutually exclusive alternatives. A complete assignment is feasible only when component footprints do not overlap.

## 4. Planning contract

Fixed components remain in `currentSlotId`. Movable components may use any `allowedSlotIds`. Each component occupies one slot, slot IDs are exclusive, and centred component footprints may not overlap.

Complete feasible assignments are compared lexicographically by:

1. blocked interaction count;
2. frequency-weighted total overreach;
3. moved component count;
4. total centre-to-centre movement distance;
5. canonical `componentId=slotId` assignment string.

The planner searches components with the fewest candidates first, then by ID. Candidate slots are visited by ID. If every feasible assignment is evaluated, `searchComplete` and `optimal` are true. Hitting `maxSearchNodes` returns a search-limit result and never labels the best-so-far assignment optimal.

## 5. Public JavaScript API

```js
validateScenario(value) -> normalizedScenario
auditScenario(scenario, assignment?) -> AuditResult
planScenario(scenario, { maxSearchNodes? }) -> PlanResult
createPlanDocument(scenario, plan) -> object
renderInteractionsCsv(document) -> string
renderLayoutSvg(document) -> string
renderReportHtml(document) -> string
```

All core planning functions are synchronous and deterministic. They perform no network or filesystem access and run in Node.js or a browser.

## 6. CLI contract

```text
meeple-reach validate INPUT
meeple-reach audit INPUT [--format text|json] [--fail-on-barrier]
meeple-reach plan INPUT --out DIR [--max-search-nodes N] [--fail-on-barrier] [--force]
meeple-reach demo --out DIR [--force]
meeple-reach --version
```

Exit codes:

- `0`: command completed and any requested accessibility gate passed.
- `1`: unexpected internal/runtime failure; a stack is printed.
- `2`: usage, input, or output-boundary error.
- `3`: `--fail-on-barrier` found one or more blocked interactions.
- `4`: search node limit reached; optimality was not proved and plan artifacts are not written.
- `5`: no collision-free assignment exists.

`plan` writes `plan.json`, `interactions.csv`, `layout.svg`, and `report.html`. Existing output is rejected unless `--force` is explicit.

## 7. Out of scope

- Choosing or moving people and seats.
- Inferring reach from age, diagnosis, or body measurements.
- Rotation, arbitrary continuous placement, 3D obstruction, line-of-sight, or hand-path simulation.
- Multiplayer fairness beyond the stated objective.
- Cloud accounts, telemetry, remote APIs, or saved personal profiles.

## 8. Compatibility

- Runtime: Node.js 22 or 24.
- Package: ESM, zero runtime dependencies.
- Browser demo: current evergreen browsers with ES modules.
- Scenario and plan documents carry integer schema version `1`.

