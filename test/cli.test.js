import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(repositoryRoot, "bin", "meeple-reach.js");
const samplePath = path.join(repositoryRoot, "samples", "cooperative-table.json");
const impossiblePath = path.join(repositoryRoot, "samples", "impossible-overlap.json");

function run(...args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repositoryRoot,
    encoding: "utf8"
  });
}

test("validates and audits a scenario with stable exit behavior", () => {
  const valid = run("validate", samplePath);
  assert.equal(valid.status, 0, valid.stderr);
  assert.match(valid.stdout, /Valid: Four-player cooperative table/);

  const gatedAudit = run("audit", samplePath, "--fail-on-barrier");
  assert.equal(gatedAudit.status, 3);
  assert.match(gatedAudit.stdout, /Blocked interactions: 4/);
  assert.match(gatedAudit.stderr, /Accessibility gate failed/);
});

test("writes all inspectable plan artifacts", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "meeple-reach-cli-"));
  const outputPath = path.join(temporaryRoot, "plan");
  const result = run("plan", samplePath, "--out", outputPath, "--fail-on-barrier");

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Optimal plan:/);
  for (const name of ["plan.json", "interactions.csv", "layout.svg", "report.html"]) {
    assert.ok((await readFile(path.join(outputPath, name))).length > 0, name);
  }
  const document = JSON.parse(await readFile(path.join(outputPath, "plan.json"), "utf8"));
  assert.equal(document.summary.accessible, true);
});

test("distinguishes search-limit and impossible failures", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "meeple-reach-failures-"));
  const limitedOutput = path.join(temporaryRoot, "limited");
  const limited = run(
    "plan",
    samplePath,
    "--out",
    limitedOutput,
    "--max-search-nodes",
    "1"
  );
  assert.equal(limited.status, 4);
  assert.match(limited.stderr, /Search limit reached/);

  const impossible = run("plan", impossiblePath, "--out", path.join(temporaryRoot, "impossible"));
  assert.equal(impossible.status, 5);
  assert.match(impossible.stderr, /No collision-free assignment exists/);
});

test("treats a forced non-directory output as a boundary error", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "meeple-reach-output-"));
  const outputFile = path.join(temporaryRoot, "not-a-directory");
  await writeFile(outputFile, "occupied", "utf8");

  const result = run("plan", samplePath, "--out", outputFile, "--force");

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Output path is not a directory/);
});

test("prints version and concise usage", () => {
  assert.match(run("--version").stdout, /^meeple-reach 0\.1\.0/);
  const help = run("--help");
  assert.equal(help.status, 0);
  assert.match(help.stdout, /meeple-reach plan INPUT --out DIR/);
});
