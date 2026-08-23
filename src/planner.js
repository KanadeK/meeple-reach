import { auditScenario } from "./audit.js";
import { ScenarioError, componentFootprint, rectanglesOverlap, slotCenter } from "./model.js";

const DEFAULT_MAX_SEARCH_NODES = 250_000;

function round(value) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function compareObjective(first, second) {
  for (let index = 0; index < first.length - 1; index += 1) {
    if (first[index] !== second[index]) {
      return first[index] - second[index];
    }
  }
  return first.at(-1).localeCompare(second.at(-1));
}

function measurePlan(scenario, assignment) {
  const slotsById = new Map(scenario.slots.map((slot) => [slot.id, slot]));
  let movedComponentCount = 0;
  let totalMovementCm = 0;
  for (const component of scenario.components) {
    const assignedSlotId = assignment[component.id];
    if (assignedSlotId !== component.currentSlotId) {
      movedComponentCount += 1;
      const current = slotCenter(slotsById.get(component.currentSlotId));
      const assigned = slotCenter(slotsById.get(assignedSlotId));
      totalMovementCm += Math.hypot(assigned.xCm - current.xCm, assigned.yCm - current.yCm);
    }
  }
  const canonicalAssignment = Object.entries(assignment)
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([componentId, slotId]) => `${componentId}=${slotId}`)
    .join(";");
  return { movedComponentCount, totalMovementCm, canonicalAssignment };
}

function resultFromBest(best, status, nodesVisited, searchComplete) {
  if (!best) {
    return {
      status,
      searchComplete,
      optimal: false,
      nodesVisited,
      assignment: null,
      audit: null,
      movedComponentCount: null,
      totalMovementCm: null
    };
  }
  return {
    status,
    searchComplete,
    optimal: searchComplete && status === "ok",
    nodesVisited,
    assignment: best.assignment,
    audit: best.audit,
    movedComponentCount: best.movedComponentCount,
    totalMovementCm: round(best.totalMovementCm)
  };
}

export function planScenario(scenario, options = {}) {
  const unknownOption = Object.keys(options).find((key) => key !== "maxSearchNodes");
  if (unknownOption) {
    throw new ScenarioError(`planner options: unknown option ${unknownOption}`);
  }
  const maxSearchNodes = options.maxSearchNodes ?? DEFAULT_MAX_SEARCH_NODES;
  if (!Number.isSafeInteger(maxSearchNodes) || maxSearchNodes <= 0) {
    throw new ScenarioError("planner options.maxSearchNodes: must be a positive safe integer");
  }

  const slotsById = new Map(scenario.slots.map((slot) => [slot.id, slot]));
  const components = scenario.components
    .map((component) => ({
      component,
      candidateSlotIds: (component.movable
        ? component.allowedSlotIds
        : [component.currentSlotId]
      ).toSorted()
    }))
    .toSorted(
      (first, second) =>
        first.candidateSlotIds.length - second.candidateSlotIds.length ||
        first.component.id.localeCompare(second.component.id)
    );

  let nodesVisited = 0;
  let limitReached = false;
  let best = null;
  const assignment = {};
  const usedSlots = new Set();
  const placements = [];

  function search(index) {
    if (nodesVisited >= maxSearchNodes) {
      limitReached = true;
      return;
    }
    nodesVisited += 1;

    if (index === components.length) {
      const orderedAssignment = Object.fromEntries(
        Object.entries(assignment).sort(([first], [second]) => first.localeCompare(second))
      );
      const audit = auditScenario(scenario, orderedAssignment);
      const measured = measurePlan(scenario, orderedAssignment);
      const objective = [
        audit.blockedInteractionCount,
        audit.weightedOverreachCm,
        measured.movedComponentCount,
        measured.totalMovementCm,
        measured.canonicalAssignment
      ];
      if (!best || compareObjective(objective, best.objective) < 0) {
        best = { assignment: orderedAssignment, audit, objective, ...measured };
      }
      return;
    }

    const { component, candidateSlotIds } = components[index];
    for (const slotId of candidateSlotIds) {
      if (limitReached) {
        return;
      }
      if (usedSlots.has(slotId)) {
        continue;
      }
      const footprint = componentFootprint(component, slotsById.get(slotId));
      if (placements.some((placement) => rectanglesOverlap(footprint, placement.footprint))) {
        continue;
      }

      assignment[component.id] = slotId;
      usedSlots.add(slotId);
      placements.push({ componentId: component.id, footprint });
      search(index + 1);
      placements.pop();
      usedSlots.delete(slotId);
      delete assignment[component.id];
    }
  }

  search(0);

  if (limitReached) {
    return resultFromBest(best, "search-limit", nodesVisited, false);
  }
  if (!best) {
    return resultFromBest(null, "impossible", nodesVisited, true);
  }
  return resultFromBest(best, "ok", nodesVisited, true);
}
