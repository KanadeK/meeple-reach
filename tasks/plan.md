# MeepleReach v0.1 implementation plan

## Phase 1 — Contract and repository

- [x] Record novelty boundary and rejected alternatives.
- [x] Freeze input, API, CLI, objective, exit codes, and non-goals.
- [x] Initialize an isolated Git repository with package metadata and license.

Gate: the specification describes a real end-to-end result and distinct failures.

## Phase 2 — Core, test first

- [x] Add failing model/audit/planner tests.
- [x] Implement strict scenario validation and normalization.
- [x] Implement deterministic audit metrics.
- [x] Implement exact discrete search, collisions, objective, and node limit.

Gate: unit tests cover accessible, blocked, improved, impossible, invalid, tie-break, and search-limit cases.

## Phase 3 — Product surfaces

- [x] Add failing CLI and artifact tests.
- [x] Implement CLI and documented exit codes.
- [x] Generate JSON, CSV, SVG, and self-contained HTML.
- [x] Build a browser demo from the same core modules.

Gate: the sample runs from both an installed package and a real browser.

## Phase 4 — Delivery

- [x] Add sample and invalid/impossible fixtures.
- [x] Write English/Chinese usage, format, algorithm, test, security, and troubleshooting docs.
- [x] Add cross-platform Node CI, Pages deployment, packaging, and release gates.
- [x] Run review, simplification, full local acceptance, and package-install smoke test.

Gate: every documented acceptance command passes from a clean checkout.

## Phase 5 — Public release

- [x] Create and push the public repository.
- [x] Verify remote CI and Pages deployment.
- [x] Create annotated `v0.1.0`, GitHub Release, package and demo assets.
- [x] Verify repository, assets, release notes, and contributor identity.
- [x] Send completion email through Gmail.

Gate: links and commands in the notification have been verified remotely.
