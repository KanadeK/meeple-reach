# Exact planning algorithm

## Audit

For each interaction, MeepleReach centres the component in its assigned slot and computes:

```text
distance = hypot(componentCenter.x - playerAnchor.x,
                 componentCenter.y - playerAnchor.y)
overreach = max(0, distance - comfortableReach)
weightedOverreach = overreach * usesPerRound
```

An interaction is blocked when `overreach > 0` beyond floating-point tolerance.

## Feasible assignments

Fixed components have one candidate: their current slot. Movable components use their declared allowed slots. Search rejects a partial assignment when a slot ID is already used or centred component footprints overlap.

Components are searched by ascending candidate count and then ID. Slot candidates are searched by ID. This order improves early feasibility while keeping output deterministic.

## Objective

Every complete assignment is compared lexicographically:

1. blocked interaction count;
2. total `overreach * usesPerRound`;
3. moved component count;
4. total current-centre to assigned-centre movement;
5. sorted `component=slot` string.

The first unequal value decides. The string is only a deterministic final tie-break.

## Exactness and budget

The default maximum is 250,000 search nodes. If enumeration completes, the chosen assignment is optimal for the declared discrete slots and objective. If the budget is reached, status is `search-limit`, `optimal` is false, CLI exit code is `4`, and artifacts are not written.

For `c` movable components each with `s` candidates, the loose upper bound is exponential (`s^c`), before slot and collision rejection. To repair a budget failure, remove implausible allowed slots, mark genuinely fixed components fixed, or raise `--max-search-nodes` deliberately.
