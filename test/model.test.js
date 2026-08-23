import assert from "node:assert/strict";
import test from "node:test";

import { ScenarioError, validateScenario } from "../src/index.js";
import { improvementScenario } from "./helpers.js";

test("validates and normalizes a complete scenario", () => {
  const scenario = validateScenario(improvementScenario());

  assert.equal(scenario.name, "Shared supplies swap");
  assert.deepEqual(scenario.components[0].allowedSlotIds, ["left", "middle", "right"]);
});

test("rejects unknown keys at the input boundary", () => {
  const input = improvementScenario();
  input.players[0].mystery = true;

  assert.throws(
    () => validateScenario(input),
    (error) => error instanceof ScenarioError && /players\[0\]\.mystery/.test(error.message)
  );
});

test("rejects unresolved references and components that do not fit", () => {
  const missingReference = improvementScenario();
  missingReference.interactions[0].playerId = "nobody";
  assert.throws(() => validateScenario(missingReference), /unknown playerId/);

  const tooLarge = improvementScenario();
  tooLarge.components[0].widthCm = 20;
  assert.throws(() => validateScenario(tooLarge), /does not fit slot/);
});

test("rejects duplicate identifiers and current slot use", () => {
  const duplicateId = improvementScenario();
  duplicateId.slots[1].id = "left";
  assert.throws(() => validateScenario(duplicateId), /duplicate slot id/);

  const duplicateCurrentSlot = improvementScenario();
  duplicateCurrentSlot.components[1].currentSlotId = "right";
  assert.throws(() => validateScenario(duplicateCurrentSlot), /current slot right is used/);
});
