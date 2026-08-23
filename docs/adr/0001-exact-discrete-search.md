# ADR 0001: Exact discrete placement search

Status: accepted  
Date: 2026-08-23

## Context

Continuous geometry or a generic solver would add dependencies and make a result harder for a tabletop designer to reproduce. The useful v0.1 input already consists of a small number of known candidate positions.

## Decision

Represent positions as named slots and exhaustively enumerate collision-free assignments with a hard node budget. Rank full assignments using the objective in the specification. Report whether the search completed; never present a budget-limited result as optimal.

## Consequences

- Small prototype layouts get an exact, deterministic answer with no native dependency.
- Users must define useful candidate slots.
- Large combinations can hit the budget. The repair is to remove implausible slots, fix components that cannot move, or raise the explicit node limit.

