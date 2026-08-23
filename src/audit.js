import {
  ScenarioError,
  componentFootprint,
  rectanglesOverlap,
  slotCenter
} from "./model.js";

function round(value) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function currentAssignment(scenario) {
  return Object.fromEntries(
    [...scenario.components]
      .sort((first, second) => first.id.localeCompare(second.id))
      .map((component) => [component.id, component.currentSlotId])
  );
}

function validateAssignment(scenario, value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ScenarioError("assignment: must be an object");
  }

  const componentsById = new Map(scenario.components.map((component) => [component.id, component]));
  const slotsById = new Map(scenario.slots.map((slot) => [slot.id, slot]));
  for (const componentId of Object.keys(value)) {
    if (!componentsById.has(componentId)) {
      throw new ScenarioError(`assignment: unknown component ${componentId}`);
    }
  }

  const usedSlots = new Map();
  const placements = [];
  const result = {};
  for (const component of [...scenario.components].sort((first, second) =>
    first.id.localeCompare(second.id)
  )) {
    if (!Object.hasOwn(value, component.id)) {
      throw new ScenarioError(`assignment: missing component ${component.id}`);
    }
    const slotId = value[component.id];
    const slot = slotsById.get(slotId);
    if (!slot) {
      throw new ScenarioError(`assignment: unknown slot ${slotId}`);
    }
    if (!component.allowedSlotIds.includes(slotId)) {
      throw new ScenarioError(`assignment: slot ${slotId} is not allowed for ${component.id}`);
    }
    if (!component.movable && slotId !== component.currentSlotId) {
      throw new ScenarioError(`assignment: fixed component ${component.id} cannot move`);
    }
    if (usedSlots.has(slotId)) {
      throw new ScenarioError(
        `assignment: slot ${slotId} is used by ${usedSlots.get(slotId)} and ${component.id}`
      );
    }

    const footprint = componentFootprint(component, slot);
    for (const placement of placements) {
      if (rectanglesOverlap(footprint, placement.footprint)) {
        throw new ScenarioError(
          `assignment: ${component.id} overlaps ${placement.componentId}`
        );
      }
    }
    usedSlots.set(slotId, component.id);
    placements.push({ componentId: component.id, footprint });
    result[component.id] = slotId;
  }
  return result;
}

export function auditScenario(scenario, assignment = currentAssignment(scenario)) {
  const normalizedAssignment = validateAssignment(scenario, assignment);
  const playersById = new Map(scenario.players.map((player) => [player.id, player]));
  const componentsById = new Map(scenario.components.map((component) => [component.id, component]));
  const slotsById = new Map(scenario.slots.map((slot) => [slot.id, slot]));

  let weightedOverreachCm = 0;
  let maxOverreachCm = 0;
  let blockedInteractionCount = 0;
  const interactions = scenario.interactions.map((interaction) => {
    const player = playersById.get(interaction.playerId);
    const component = componentsById.get(interaction.componentId);
    const slotId = normalizedAssignment[component.id];
    const center = slotCenter(slotsById.get(slotId));
    const distanceCm = Math.hypot(
      center.xCm - player.anchor.xCm,
      center.yCm - player.anchor.yCm
    );
    const overreachCm = Math.max(0, distanceCm - player.comfortableReachCm);
    const blocked = overreachCm > 1e-9;
    if (blocked) {
      blockedInteractionCount += 1;
    }
    weightedOverreachCm += overreachCm * interaction.usesPerRound;
    maxOverreachCm = Math.max(maxOverreachCm, overreachCm);
    return {
      playerId: player.id,
      playerLabel: player.label,
      componentId: component.id,
      componentLabel: component.label,
      slotId,
      usesPerRound: interaction.usesPerRound,
      comfortableReachCm: round(player.comfortableReachCm),
      distanceCm: round(distanceCm),
      overreachCm: round(overreachCm),
      blocked
    };
  });

  return {
    assignment: normalizedAssignment,
    accessible: blockedInteractionCount === 0,
    interactionCount: interactions.length,
    blockedInteractionCount,
    weightedOverreachCm: round(weightedOverreachCm),
    maxOverreachCm: round(maxOverreachCm),
    interactions
  };
}
