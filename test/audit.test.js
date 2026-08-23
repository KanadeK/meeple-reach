import assert from "node:assert/strict";
import test from "node:test";

import { auditScenario, validateScenario } from "../src/index.js";
import { improvementScenario } from "./helpers.js";

test("audits the current placement with explainable reach metrics", () => {
  const scenario = validateScenario(improvementScenario());
  const audit = auditScenario(scenario);

  assert.equal(audit.accessible, false);
  assert.equal(audit.blockedInteractionCount, 2);
  assert.equal(audit.weightedOverreachCm, 432);
  assert.equal(audit.maxOverreachCm, 36);
  assert.deepEqual(
    audit.interactions.map(({ playerId, componentId, distanceCm, overreachCm }) => ({
      playerId,
      componentId,
      distanceCm,
      overreachCm
    })),
    [
      { playerId: "alex", componentId: "deck", distanceCm: 74, overreachCm: 36 },
      { playerId: "blair", componentId: "tokens", distanceCm: 74, overreachCm: 36 }
    ]
  );
});

test("audits an explicit improved assignment", () => {
  const scenario = validateScenario(improvementScenario());
  const audit = auditScenario(scenario, { deck: "left", tokens: "right" });

  assert.equal(audit.accessible, true);
  assert.equal(audit.blockedInteractionCount, 0);
  assert.equal(audit.weightedOverreachCm, 0);
});

test("rejects incomplete or unknown assignments", () => {
  const scenario = validateScenario(improvementScenario());

  assert.throws(() => auditScenario(scenario, { deck: "left" }), /missing component tokens/);
  assert.throws(
    () => auditScenario(scenario, { deck: "left", tokens: "nowhere" }),
    /unknown slot nowhere/
  );
});
