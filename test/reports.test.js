import assert from "node:assert/strict";
import test from "node:test";

import {
  createPlanDocument,
  planScenario,
  renderInteractionsCsv,
  renderLayoutSvg,
  renderReportHtml,
  validateScenario
} from "../src/index.js";
import { improvementScenario } from "./helpers.js";

test("creates a deterministic plan document and machine-readable CSV", () => {
  const scenario = validateScenario(improvementScenario());
  const document = createPlanDocument(scenario, planScenario(scenario));
  const csv = renderInteractionsCsv(document);

  assert.equal(document.schemaVersion, 1);
  assert.equal(document.summary.accessible, true);
  assert.deepEqual(
    document.placements.map(({ componentId, assignedSlotId }) => ({ componentId, assignedSlotId })),
    [
      { componentId: "deck", assignedSlotId: "left" },
      { componentId: "tokens", assignedSlotId: "right" }
    ]
  );
  assert.match(csv, /^player_id,component_id,slot_id,uses_per_round,distance_cm,reach_cm,overreach_cm,blocked\n/);
  assert.match(csv, /alex,deck,left,6,26,38,0,false/);
});

test("escapes user-controlled labels in SVG and HTML", () => {
  const input = improvementScenario();
  input.name = "Layout <unsafe> & friends";
  input.components[0].label = "Deck <unsafe>";
  const scenario = validateScenario(input);
  const document = createPlanDocument(scenario, planScenario(scenario));
  const svg = renderLayoutSvg(document);
  const html = renderReportHtml(document);

  assert.match(svg, /Layout &lt;unsafe&gt; &amp; friends/);
  assert.doesNotMatch(svg, /<unsafe>/);
  assert.match(html, /Layout &lt;unsafe&gt; &amp; friends/);
  assert.doesNotMatch(html, /<unsafe>/);
  assert.match(html, /<svg/);
});
