import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteRoot = path.join(repositoryRoot, "dist", "site");

test("builds a self-contained Pages demo from the shared core", async () => {
  const result = spawnSync(process.execPath, [path.join(repositoryRoot, "scripts", "build-site.js")], {
    cwd: repositoryRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr);

  const html = await readFile(path.join(siteRoot, "index.html"), "utf8");
  assert.match(html, /<textarea[^>]+id="scenario-input"/);
  assert.match(html, /id="plan-button"/);
  assert.doesNotMatch(html, /https?:\/\//);

  const sample = JSON.parse(await readFile(path.join(siteRoot, "sample.json"), "utf8"));
  const core = await import(pathToFileURL(path.join(siteRoot, "lib", "index.js")));
  const scenario = core.validateScenario(sample);
  const plan = core.planScenario(scenario);
  assert.equal(plan.optimal, true);
  assert.equal(plan.audit.accessible, true);
});
