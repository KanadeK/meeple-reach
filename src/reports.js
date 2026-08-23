import { componentFootprint, slotCenter } from "./model.js";
import { VERSION } from "./version.js";

function round(value) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function escapeMarkup(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function createPlanDocument(scenario, plan) {
  if (plan.status !== "ok" || !plan.assignment || !plan.audit) {
    throw new TypeError("createPlanDocument requires a completed plan");
  }
  const slotsById = new Map(scenario.slots.map((slot) => [slot.id, slot]));
  const placements = [...scenario.components]
    .sort((first, second) => first.id.localeCompare(second.id))
    .map((component) => {
      const assignedSlotId = plan.assignment[component.id];
      const currentCenter = slotCenter(slotsById.get(component.currentSlotId));
      const assignedSlot = slotsById.get(assignedSlotId);
      const assignedCenter = slotCenter(assignedSlot);
      return {
        componentId: component.id,
        componentLabel: component.label,
        currentSlotId: component.currentSlotId,
        assignedSlotId,
        moved: component.currentSlotId !== assignedSlotId,
        movementCm: round(
          Math.hypot(assignedCenter.xCm - currentCenter.xCm, assignedCenter.yCm - currentCenter.yCm)
        ),
        footprint: componentFootprint(component, assignedSlot)
      };
    });

  return {
    schemaVersion: 1,
    tool: { name: "MeepleReach", version: VERSION },
    scenario,
    search: {
      status: plan.status,
      nodesVisited: plan.nodesVisited,
      searchComplete: plan.searchComplete,
      optimal: plan.optimal
    },
    summary: {
      accessible: plan.audit.accessible,
      interactionCount: plan.audit.interactionCount,
      blockedInteractionCount: plan.audit.blockedInteractionCount,
      weightedOverreachCm: plan.audit.weightedOverreachCm,
      maxOverreachCm: plan.audit.maxOverreachCm,
      movedComponentCount: plan.movedComponentCount,
      totalMovementCm: plan.totalMovementCm
    },
    assignment: plan.assignment,
    placements,
    interactions: plan.audit.interactions
  };
}

export function renderInteractionsCsv(document) {
  const header = [
    "player_id",
    "component_id",
    "slot_id",
    "uses_per_round",
    "distance_cm",
    "reach_cm",
    "overreach_cm",
    "blocked"
  ].join(",");
  const rows = document.interactions.map((interaction) =>
    [
      interaction.playerId,
      interaction.componentId,
      interaction.slotId,
      interaction.usesPerRound,
      interaction.distanceCm,
      interaction.comfortableReachCm,
      interaction.overreachCm,
      interaction.blocked
    ].join(",")
  );
  return `${[header, ...rows].join("\n")}\n`;
}

export function renderLayoutSvg(document) {
  const { scenario } = document;
  const margin = 10;
  const blockedComponents = new Set(
    document.interactions
      .filter((interaction) => interaction.blocked)
      .map((interaction) => interaction.componentId)
  );
  const slots = scenario.slots
    .map(
      (slot) => `    <rect class="slot" x="${slot.rect.xCm}" y="${slot.rect.yCm}" width="${slot.rect.widthCm}" height="${slot.rect.heightCm}"><title>${escapeMarkup(slot.label)}</title></rect>`
    )
    .join("\n");
  const reaches = scenario.players
    .map(
      (player) => `    <circle class="reach" cx="${player.anchor.xCm}" cy="${player.anchor.yCm}" r="${player.comfortableReachCm}" />`
    )
    .join("\n");
  const players = scenario.players
    .map(
      (player) => `    <g class="player"><circle cx="${player.anchor.xCm}" cy="${player.anchor.yCm}" r="2.4" /><text x="${player.anchor.xCm}" y="${player.anchor.yCm - 4}" text-anchor="middle">${escapeMarkup(player.label)}</text></g>`
    )
    .join("\n");
  const components = document.placements
    .map((placement) => {
      const rect = placement.footprint;
      const className = blockedComponents.has(placement.componentId)
        ? "component blocked"
        : "component";
      return `    <g class="${className}"><rect x="${rect.xCm}" y="${rect.yCm}" width="${rect.widthCm}" height="${rect.heightCm}" rx="1.5"><title>${escapeMarkup(placement.componentLabel)} at ${escapeMarkup(placement.assignedSlotId)}</title></rect><text x="${rect.xCm + rect.widthCm / 2}" y="${rect.yCm + rect.heightCm / 2 + 1}" text-anchor="middle">${escapeMarkup(placement.componentLabel)}</text></g>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-margin} ${-margin} ${scenario.table.widthCm + margin * 2} ${scenario.table.heightCm + margin * 2}" role="img" aria-labelledby="layout-title layout-description">
  <title id="layout-title">${escapeMarkup(scenario.name)} planned layout</title>
  <desc id="layout-description">${document.summary.blockedInteractionCount} blocked interactions after planning. Reach circles use participant-provided comfortable reach measurements.</desc>
  <style>
    .table { fill: #f8f2e7; stroke: #27241f; stroke-width: 1; }
    .slot { fill: none; stroke: #978b78; stroke-dasharray: 2 2; stroke-width: .45; }
    .reach { fill: #3b82f61c; stroke: #2563eb; stroke-dasharray: 2 2; stroke-width: .35; }
    .component rect { fill: #d9f99d; stroke: #3f6212; stroke-width: .6; }
    .component.blocked rect { fill: #fecaca; stroke: #991b1b; }
    .player circle { fill: #172554; stroke: #fff; stroke-width: .6; }
    text { fill: #1c1917; font: 3px system-ui, sans-serif; }
    .component text { font-size: 2.7px; pointer-events: none; }
    .player text { font-weight: 700; paint-order: stroke; stroke: #fff; stroke-width: .8px; }
  </style>
  <defs><clipPath id="table-clip"><rect x="0" y="0" width="${scenario.table.widthCm}" height="${scenario.table.heightCm}" rx="3" /></clipPath></defs>
  <rect class="table" x="0" y="0" width="${scenario.table.widthCm}" height="${scenario.table.heightCm}" rx="3" />
  <g clip-path="url(#table-clip)">
${reaches}
${slots}
${components}
  </g>
${players}
</svg>\n`;
}

export function renderReportHtml(document) {
  const svg = renderLayoutSvg(document);
  const status = document.summary.accessible ? "No measured reach barriers" : "Reach barriers remain";
  const placementRows = document.placements
    .map(
      (placement) => `<tr><td><code>${escapeMarkup(placement.componentId)}</code></td><td><code>${escapeMarkup(placement.currentSlotId)}</code></td><td><code>${escapeMarkup(placement.assignedSlotId)}</code></td><td>${placement.movementCm}</td></tr>`
    )
    .join("");
  const interactionRows = document.interactions
    .map(
      (interaction) => `<tr><td><code>${escapeMarkup(interaction.playerId)}</code></td><td><code>${escapeMarkup(interaction.componentId)}</code></td><td>${interaction.distanceCm}</td><td>${interaction.comfortableReachCm}</td><td>${interaction.overreachCm}</td><td>${interaction.blocked ? "Blocked" : "Within reach"}</td></tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeMarkup(document.scenario.name)} · MeepleReach report</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #20201d; background: #ece9e1; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    main { width: min(1120px, calc(100% - 32px)); margin: 32px auto 64px; }
    header { display: grid; gap: 10px; padding: 28px; color: #f9f7f2; background: #172554; border-radius: 20px 20px 6px 6px; }
    h1, h2, p { margin: 0; }
    h1 { font: 700 clamp(2rem, 5vw, 4rem)/.95 Georgia, serif; letter-spacing: -.04em; }
    h2 { margin-bottom: 14px; font-size: 1.15rem; }
    .eyebrow { color: #bef264; font-size: .78rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; margin: 1px 0; background: #c9c4b8; }
    .metric { padding: 18px; background: #fff; }
    .metric strong { display: block; font-size: 1.65rem; }
    .metric span { color: #625f58; font-size: .82rem; }
    section { margin-top: 1px; padding: 24px; background: #fff; }
    .layout { overflow: hidden; }
    .layout svg { display: block; width: 100%; max-height: 680px; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: .9rem; }
    th, td { padding: 10px 8px; text-align: left; border-bottom: 1px solid #e5e1d8; white-space: nowrap; }
    th { color: #625f58; font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; }
    code { color: #3730a3; }
    footer { padding: 16px 24px; color: #625f58; font-size: .78rem; }
    @media (max-width: 700px) { .grid { grid-template-columns: repeat(2, 1fr); } main { width: min(100% - 16px, 1120px); margin-top: 8px; } }
  </style>
</head>
<body>
  <main>
    <header>
      <p class="eyebrow">MeepleReach exact plan</p>
      <h1>${escapeMarkup(document.scenario.name)}</h1>
      <p>${status}. This report uses participant-provided measurements and is not medical or legal certification.</p>
    </header>
    <div class="grid" aria-label="Plan summary">
      <div class="metric"><strong>${document.summary.blockedInteractionCount}</strong><span>blocked interactions</span></div>
      <div class="metric"><strong>${document.summary.weightedOverreachCm}</strong><span>weighted overreach cm</span></div>
      <div class="metric"><strong>${document.summary.movedComponentCount}</strong><span>components moved</span></div>
      <div class="metric"><strong>${document.search.nodesVisited}</strong><span>search nodes</span></div>
    </div>
    <section class="layout"><h2>Planned table</h2>${svg}</section>
    <section><h2>Placements</h2><div class="table-wrap"><table><thead><tr><th>Component</th><th>Current slot</th><th>Assigned slot</th><th>Movement cm</th></tr></thead><tbody>${placementRows}</tbody></table></div></section>
    <section><h2>Interaction audit</h2><div class="table-wrap"><table><thead><tr><th>Player</th><th>Component</th><th>Distance cm</th><th>Reach cm</th><th>Overreach cm</th><th>Status</th></tr></thead><tbody>${interactionRows}</tbody></table></div></section>
    <footer>Generated by MeepleReach ${VERSION}. Exact within the declared candidate slots; no network service used.</footer>
  </main>
</body>
</html>\n`;
}
