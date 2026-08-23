import {
  ScenarioError,
  auditScenario,
  createPlanDocument,
  planScenario,
  renderLayoutSvg,
  validateScenario
} from "./lib/index.js";

const input = document.querySelector("#scenario-input");
const status = document.querySelector("#status");
const badge = document.querySelector("#proof-badge");
const layout = document.querySelector("#layout");
const values = {
  blocked: document.querySelector("#blocked-value"),
  overreach: document.querySelector("#overreach-value"),
  moves: document.querySelector("#moves-value"),
  nodes: document.querySelector("#nodes-value")
};

async function loadSample() {
  const response = await fetch("./sample.json");
  if (!response.ok) {
    throw new Error(`Sample request failed with ${response.status}`);
  }
  const sample = await response.json();
  input.value = JSON.stringify(sample, null, 2);
  status.textContent = "Example restored. Audit the current layout or run the exact planner.";
  badge.textContent = "Ready";
  badge.className = "proof-badge";
}

function readInput() {
  return validateScenario(JSON.parse(input.value));
}

function updateMetrics({ blocked, overreach, moves, nodes }) {
  values.blocked.textContent = blocked;
  values.overreach.textContent = overreach;
  values.moves.textContent = moves;
  values.nodes.textContent = nodes;
}

function showInputError(error) {
  if (!(error instanceof SyntaxError) && !(error instanceof ScenarioError)) {
    throw error;
  }
  status.textContent = error instanceof SyntaxError ? `Invalid JSON: ${error.message}` : error.message;
  badge.textContent = "Input needs repair";
  badge.className = "proof-badge warning";
}

document.querySelector("#sample-button").addEventListener("click", () => loadSample());

document.querySelector("#audit-button").addEventListener("click", () => {
  try {
    const scenario = readInput();
    const audit = auditScenario(scenario);
    updateMetrics({
      blocked: audit.blockedInteractionCount,
      overreach: audit.weightedOverreachCm,
      moves: 0,
      nodes: "—"
    });
    status.textContent = audit.accessible
      ? "Every declared interaction is within the measured comfortable reach."
      : `${audit.blockedInteractionCount} interaction pairs exceed measured reach in the current layout.`;
    badge.textContent = audit.accessible ? "Current layout passes" : "Barriers found";
    badge.className = audit.accessible ? "proof-badge proved" : "proof-badge warning";
    layout.innerHTML = "<p>Current layout audited. Run the planner to render its exact component assignment.</p>";
  } catch (error) {
    showInputError(error);
  }
});

document.querySelector("#plan-button").addEventListener("click", () => {
  try {
    const scenario = readInput();
    const plan = planScenario(scenario);
    if (plan.status === "search-limit") {
      status.textContent = `Search stopped at ${plan.nodesVisited} nodes. Raise the limit in the CLI or reduce candidate slots.`;
      badge.textContent = "Not proved optimal";
      badge.className = "proof-badge warning";
      return;
    }
    if (plan.status === "impossible") {
      status.textContent = "No collision-free assignment exists for the declared candidate slots.";
      badge.textContent = "No feasible layout";
      badge.className = "proof-badge warning";
      return;
    }
    const document = createPlanDocument(scenario, plan);
    updateMetrics({
      blocked: document.summary.blockedInteractionCount,
      overreach: document.summary.weightedOverreachCm,
      moves: document.summary.movedComponentCount,
      nodes: document.search.nodesVisited
    });
    status.textContent = document.summary.accessible
      ? `Exact search proved a zero-barrier assignment after ${document.search.nodesVisited} nodes.`
      : `Exact search proved the best declared assignment; ${document.summary.blockedInteractionCount} barriers remain.`;
    badge.textContent = document.summary.accessible ? "Optimal · zero barriers" : "Optimal · barriers remain";
    badge.className = document.summary.accessible ? "proof-badge proved" : "proof-badge warning";
    layout.innerHTML = renderLayoutSvg(document);
  } catch (error) {
    showInputError(error);
  }
});

await loadSample();
