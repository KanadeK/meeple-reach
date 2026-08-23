const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class ScenarioError extends Error {
  constructor(message) {
    super(message);
    this.name = "ScenarioError";
  }
}

function fail(path, message) {
  throw new ScenarioError(`${path}: ${message}`);
}

function record(value, path) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(path, "must be an object");
  }
  return value;
}

function exactKeys(value, required, path) {
  const input = record(value, path);
  const allowed = new Set(required);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      fail(`${path}.${key}`, "is not allowed");
    }
  }
  for (const key of required) {
    if (!Object.hasOwn(input, key)) {
      fail(`${path}.${key}`, "is required");
    }
  }
  return input;
}

function string(value, path) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(path, "must be a non-empty string");
  }
  return value.trim();
}

function id(value, path) {
  const result = string(value, path);
  if (!ID_PATTERN.test(result)) {
    fail(path, "must be a lowercase ASCII slug");
  }
  return result;
}

function number(value, path, { positive = false } = {}) {
  if (!Number.isFinite(value)) {
    fail(path, "must be a finite number");
  }
  if (positive ? value <= 0 : value < 0) {
    fail(path, positive ? "must be greater than zero" : "must be zero or greater");
  }
  return value;
}

function boolean(value, path) {
  if (typeof value !== "boolean") {
    fail(path, "must be a boolean");
  }
  return value;
}

function array(value, path) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(path, "must be a non-empty array");
  }
  return value;
}

function uniqueIds(items, kind) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.id)) {
      fail(kind, `duplicate ${kind.slice(0, -1)} id ${item.id}`);
    }
    seen.add(item.id);
  }
}

function parseTable(value) {
  const input = exactKeys(value, ["widthCm", "heightCm"], "table");
  return {
    widthCm: number(input.widthCm, "table.widthCm", { positive: true }),
    heightCm: number(input.heightCm, "table.heightCm", { positive: true })
  };
}

function parsePlayer(value, index, table) {
  const path = `players[${index}]`;
  const input = exactKeys(
    value,
    ["id", "label", "anchor", "comfortableReachCm"],
    path
  );
  const anchor = exactKeys(input.anchor, ["xCm", "yCm"], `${path}.anchor`);
  const xCm = number(anchor.xCm, `${path}.anchor.xCm`);
  const yCm = number(anchor.yCm, `${path}.anchor.yCm`);
  if (xCm > table.widthCm || yCm > table.heightCm) {
    fail(`${path}.anchor`, "must be inside the table");
  }
  return {
    id: id(input.id, `${path}.id`),
    label: string(input.label, `${path}.label`),
    anchor: { xCm, yCm },
    comfortableReachCm: number(input.comfortableReachCm, `${path}.comfortableReachCm`, {
      positive: true
    })
  };
}

function parseSlot(value, index, table) {
  const path = `slots[${index}]`;
  const input = exactKeys(value, ["id", "label", "rect"], path);
  const rect = exactKeys(input.rect, ["xCm", "yCm", "widthCm", "heightCm"], `${path}.rect`);
  const parsedRect = {
    xCm: number(rect.xCm, `${path}.rect.xCm`),
    yCm: number(rect.yCm, `${path}.rect.yCm`),
    widthCm: number(rect.widthCm, `${path}.rect.widthCm`, { positive: true }),
    heightCm: number(rect.heightCm, `${path}.rect.heightCm`, { positive: true })
  };
  if (
    parsedRect.xCm + parsedRect.widthCm > table.widthCm ||
    parsedRect.yCm + parsedRect.heightCm > table.heightCm
  ) {
    fail(`${path}.rect`, "must remain inside the table");
  }
  return {
    id: id(input.id, `${path}.id`),
    label: string(input.label, `${path}.label`),
    rect: parsedRect
  };
}

function parseComponent(value, index) {
  const path = `components[${index}]`;
  const input = exactKeys(
    value,
    [
      "id",
      "label",
      "widthCm",
      "heightCm",
      "currentSlotId",
      "allowedSlotIds",
      "movable"
    ],
    path
  );
  const allowedSlotIds = array(input.allowedSlotIds, `${path}.allowedSlotIds`).map((value, slotIndex) =>
    id(value, `${path}.allowedSlotIds[${slotIndex}]`)
  );
  if (new Set(allowedSlotIds).size !== allowedSlotIds.length) {
    fail(`${path}.allowedSlotIds`, "must not contain duplicates");
  }
  return {
    id: id(input.id, `${path}.id`),
    label: string(input.label, `${path}.label`),
    widthCm: number(input.widthCm, `${path}.widthCm`, { positive: true }),
    heightCm: number(input.heightCm, `${path}.heightCm`, { positive: true }),
    currentSlotId: id(input.currentSlotId, `${path}.currentSlotId`),
    allowedSlotIds,
    movable: boolean(input.movable, `${path}.movable`)
  };
}

function parseInteraction(value, index) {
  const path = `interactions[${index}]`;
  const input = exactKeys(value, ["playerId", "componentId", "usesPerRound"], path);
  return {
    playerId: id(input.playerId, `${path}.playerId`),
    componentId: id(input.componentId, `${path}.componentId`),
    usesPerRound: number(input.usesPerRound, `${path}.usesPerRound`, { positive: true })
  };
}

export function validateScenario(value) {
  const input = exactKeys(
    value,
    ["schemaVersion", "name", "table", "players", "slots", "components", "interactions"],
    "scenario"
  );
  if (input.schemaVersion !== 1) {
    fail("scenario.schemaVersion", "must equal 1");
  }

  const table = parseTable(input.table);
  const players = array(input.players, "players").map((player, index) =>
    parsePlayer(player, index, table)
  );
  const slots = array(input.slots, "slots").map((slot, index) => parseSlot(slot, index, table));
  const components = array(input.components, "components").map(parseComponent);
  const interactions = array(input.interactions, "interactions").map(parseInteraction);

  uniqueIds(players, "players");
  uniqueIds(slots, "slots");
  uniqueIds(components, "components");

  const playersById = new Map(players.map((player) => [player.id, player]));
  const slotsById = new Map(slots.map((slot) => [slot.id, slot]));
  const componentsById = new Map(components.map((component) => [component.id, component]));
  const currentSlots = new Map();

  for (const component of components) {
    if (!component.allowedSlotIds.includes(component.currentSlotId)) {
      fail(
        `components.${component.id}.currentSlotId`,
        "must also appear in allowedSlotIds"
      );
    }
    for (const slotId of component.allowedSlotIds) {
      const slot = slotsById.get(slotId);
      if (!slot) {
        fail(`components.${component.id}.allowedSlotIds`, `references unknown slot ${slotId}`);
      }
      if (component.widthCm > slot.rect.widthCm || component.heightCm > slot.rect.heightCm) {
        fail(`components.${component.id}`, `does not fit slot ${slotId}`);
      }
    }
    if (currentSlots.has(component.currentSlotId)) {
      fail(
        `components.${component.id}.currentSlotId`,
        `current slot ${component.currentSlotId} is used by ${currentSlots.get(component.currentSlotId)}`
      );
    }
    currentSlots.set(component.currentSlotId, component.id);
  }

  const interactionPairs = new Set();
  for (const interaction of interactions) {
    if (!playersById.has(interaction.playerId)) {
      fail("interactions", `references unknown playerId ${interaction.playerId}`);
    }
    if (!componentsById.has(interaction.componentId)) {
      fail("interactions", `references unknown componentId ${interaction.componentId}`);
    }
    const pair = `${interaction.playerId}\u0000${interaction.componentId}`;
    if (interactionPairs.has(pair)) {
      fail(
        "interactions",
        `duplicate player/component pair ${interaction.playerId}/${interaction.componentId}`
      );
    }
    interactionPairs.add(pair);
  }

  return {
    schemaVersion: 1,
    name: string(input.name, "scenario.name"),
    table,
    players,
    slots,
    components,
    interactions
  };
}

export function slotCenter(slot) {
  return {
    xCm: slot.rect.xCm + slot.rect.widthCm / 2,
    yCm: slot.rect.yCm + slot.rect.heightCm / 2
  };
}

export function componentFootprint(component, slot) {
  const center = slotCenter(slot);
  return {
    xCm: center.xCm - component.widthCm / 2,
    yCm: center.yCm - component.heightCm / 2,
    widthCm: component.widthCm,
    heightCm: component.heightCm
  };
}

export function rectanglesOverlap(first, second) {
  return (
    first.xCm < second.xCm + second.widthCm &&
    first.xCm + first.widthCm > second.xCm &&
    first.yCm < second.yCm + second.heightCm &&
    first.yCm + first.heightCm > second.yCm
  );
}
