import assert from "node:assert/strict";
import test from "node:test";

import { planScenario, validateScenario } from "../src/index.js";
import { improvementScenario, tieScenario } from "./helpers.js";

test("finds and proves the best accessible placement", () => {
  const scenario = validateScenario(improvementScenario());
  const plan = planScenario(scenario);

  assert.equal(plan.status, "ok");
  assert.equal(plan.searchComplete, true);
  assert.equal(plan.optimal, true);
  assert.deepEqual(plan.assignment, { deck: "left", tokens: "right" });
  assert.equal(plan.audit.blockedInteractionCount, 0);
  assert.equal(plan.movedComponentCount, 2);
  assert.equal(plan.totalMovementCm, 96);
  assert.ok(plan.nodesVisited > 0);
});

test("uses canonical assignment order to resolve an objective tie", () => {
  const plan = planScenario(validateScenario(tieScenario()));

  assert.equal(plan.status, "ok");
  assert.deepEqual(plan.assignment, { cards: "alpha" });
});

test("reports a node limit without claiming optimality", () => {
  const plan = planScenario(validateScenario(improvementScenario()), { maxSearchNodes: 1 });

  assert.equal(plan.status, "search-limit");
  assert.equal(plan.searchComplete, false);
  assert.equal(plan.optimal, false);
});

test("reports when fixed placements have no collision-free assignment", () => {
  const input = improvementScenario();
  input.components[0] = {
    ...input.components[0],
    movable: false,
    allowedSlotIds: ["right"]
  };
  input.components[1] = {
    ...input.components[1],
    movable: false,
    currentSlotId: "middle",
    allowedSlotIds: ["middle"]
  };
  input.slots[1].rect.xCm = 69;

  const plan = planScenario(validateScenario(input));

  assert.equal(plan.status, "impossible");
  assert.equal(plan.searchComplete, true);
  assert.equal(plan.assignment, null);
});
