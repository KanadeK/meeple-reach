import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { auditScenario } from "./audit.js";
import { validateScenario } from "./model.js";
import { planScenario } from "./planner.js";
import {
  createPlanDocument,
  renderInteractionsCsv,
  renderLayoutSvg,
  renderReportHtml
} from "./reports.js";
import { VERSION } from "./version.js";

const HELP = `MeepleReach ${VERSION}

Usage:
  meeple-reach validate INPUT
  meeple-reach audit INPUT [--format text|json] [--fail-on-barrier]
  meeple-reach plan INPUT --out DIR [--max-search-nodes N] [--fail-on-barrier] [--force]
  meeple-reach demo --out DIR [--force]
  meeple-reach --version
`;

export class CliError extends Error {
  constructor(message, exitCode = 2) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

function optionValue(args, index, name) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new CliError(`${name} requires a value`);
  }
  return value;
}

function parseAuditOptions(args) {
  const options = { format: "text", failOnBarrier: false };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--format") {
      options.format = optionValue(args, index, argument);
      index += 1;
    } else if (argument === "--fail-on-barrier") {
      options.failOnBarrier = true;
    } else {
      throw new CliError(`Unknown audit option: ${argument}`);
    }
  }
  if (!["text", "json"].includes(options.format)) {
    throw new CliError("--format must be text or json");
  }
  return options;
}

function parsePlanOptions(args, { allowSearchLimit = true } = {}) {
  const options = { out: null, maxSearchNodes: undefined, failOnBarrier: false, force: false };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--out") {
      options.out = optionValue(args, index, argument);
      index += 1;
    } else if (argument === "--max-search-nodes" && allowSearchLimit) {
      const value = optionValue(args, index, argument);
      options.maxSearchNodes = Number(value);
      index += 1;
    } else if (argument === "--fail-on-barrier" && allowSearchLimit) {
      options.failOnBarrier = true;
    } else if (argument === "--force") {
      options.force = true;
    } else {
      throw new CliError(`Unknown option: ${argument}`);
    }
  }
  if (!options.out) {
    throw new CliError("--out DIR is required");
  }
  if (
    options.maxSearchNodes !== undefined &&
    (!Number.isSafeInteger(options.maxSearchNodes) || options.maxSearchNodes <= 0)
  ) {
    throw new CliError("--max-search-nodes must be a positive safe integer");
  }
  return options;
}

async function readScenario(inputPath) {
  let source;
  try {
    source = await readFile(path.resolve(inputPath), "utf8");
  } catch (error) {
    if (["ENOENT", "EACCES", "EISDIR"].includes(error.code)) {
      throw new CliError(`Cannot read input ${inputPath}: ${error.message}`);
    }
    throw error;
  }
  let value;
  try {
    value = JSON.parse(source);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new CliError(`Invalid JSON in ${inputPath}: ${error.message}`);
    }
    throw error;
  }
  return validateScenario(value);
}

async function outputDirectory(outputPath, force) {
  const resolved = path.resolve(outputPath);
  let exists = false;
  try {
    await stat(resolved);
    exists = true;
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
  if (exists && !force) {
    throw new CliError(`Output already exists: ${resolved}. Use --force to overwrite artifacts.`);
  }
  await mkdir(resolved, { recursive: true });
  return resolved;
}

async function writeArtifacts(scenario, plan, options) {
  const document = createPlanDocument(scenario, plan);
  const directory = await outputDirectory(options.out, options.force);
  const files = new Map([
    ["plan.json", `${JSON.stringify(document, null, 2)}\n`],
    ["interactions.csv", renderInteractionsCsv(document)],
    ["layout.svg", renderLayoutSvg(document)],
    ["report.html", renderReportHtml(document)]
  ]);
  for (const [name, contents] of files) {
    await writeFile(path.join(directory, name), contents, "utf8");
  }
  return { directory, document };
}

function textAudit(scenario, audit) {
  return [
    `Scenario: ${scenario.name}`,
    `Accessible: ${audit.accessible ? "yes" : "no"}`,
    `Blocked interactions: ${audit.blockedInteractionCount} / ${audit.interactionCount}`,
    `Weighted overreach: ${audit.weightedOverreachCm} cm`,
    `Maximum overreach: ${audit.maxOverreachCm} cm`
  ].join("\n");
}

async function executePlan(scenario, options) {
  const plan = planScenario(scenario, { maxSearchNodes: options.maxSearchNodes });
  if (plan.status === "search-limit") {
    throw new CliError(
      `Search limit reached after ${plan.nodesVisited} nodes; no artifacts written because optimality was not proved.`,
      4
    );
  }
  if (plan.status === "impossible") {
    throw new CliError("No collision-free assignment exists for the declared slots.", 5);
  }
  const { directory, document } = await writeArtifacts(scenario, plan, options);
  process.stdout.write(
    `Optimal plan: ${document.summary.movedComponentCount} moves, ${document.summary.blockedInteractionCount} blocked interactions\nSearch nodes: ${document.search.nodesVisited}\nArtifacts: ${directory}\n`
  );
  if (options.failOnBarrier && !document.summary.accessible) {
    throw new CliError(
      `Accessibility gate failed: ${document.summary.blockedInteractionCount} blocked interactions remain.`,
      3
    );
  }
}

export async function main(args) {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    process.stdout.write(HELP);
    return;
  }
  if (args[0] === "--version" || args[0] === "-v") {
    process.stdout.write(`meeple-reach ${VERSION}\n`);
    return;
  }

  const [command, input, ...rest] = args;
  if (command === "demo") {
    if (input?.startsWith("--")) {
      const options = parsePlanOptions([input, ...rest], { allowSearchLimit: false });
      const samplePath = fileURLToPath(new URL("../samples/cooperative-table.json", import.meta.url));
      await executePlan(await readScenario(samplePath), options);
      return;
    }
    throw new CliError("demo requires --out DIR");
  }
  if (!input || input.startsWith("--")) {
    throw new CliError(`${command} requires an INPUT JSON path`);
  }

  if (command === "validate") {
    if (rest.length > 0) {
      throw new CliError(`Unknown validate option: ${rest[0]}`);
    }
    const scenario = await readScenario(input);
    process.stdout.write(
      `Valid: ${scenario.name} (${scenario.players.length} players, ${scenario.components.length} components, ${scenario.slots.length} slots)\n`
    );
    return;
  }
  if (command === "audit") {
    const options = parseAuditOptions(rest);
    const scenario = await readScenario(input);
    const audit = auditScenario(scenario);
    process.stdout.write(
      options.format === "json" ? `${JSON.stringify(audit, null, 2)}\n` : `${textAudit(scenario, audit)}\n`
    );
    if (options.failOnBarrier && !audit.accessible) {
      throw new CliError(
        `Accessibility gate failed: ${audit.blockedInteractionCount} blocked interactions found.`,
        3
      );
    }
    return;
  }
  if (command === "plan") {
    const options = parsePlanOptions(rest);
    await executePlan(await readScenario(input), options);
    return;
  }
  throw new CliError(`Unknown command: ${command}`);
}
