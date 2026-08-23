import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmCli = process.env.npm_execpath;
if (!npmCli) {
  throw new Error("Run this gate through npm run check so npm_execpath is available");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repositoryRoot,
    encoding: "utf8",
    env: options.env ?? process.env,
    stdio: "inherit"
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited with ${result.status}`);
  }
}

const packageJson = JSON.parse(await readFile(path.join(repositoryRoot, "package.json"), "utf8"));
const temporaryRoot = await mkdtemp(path.join(tmpdir(), "meeple-reach-check-"));
const npmEnvironment = {
  ...process.env,
  npm_config_cache: path.join(temporaryRoot, "npm-cache")
};

try {
  run(process.execPath, ["--test"]);
  run(process.execPath, ["scripts/build-site.js"]);
  run(process.execPath, ["bin/meeple-reach.js", "validate", "samples/cooperative-table.json"]);
  run(process.execPath, [
    "bin/meeple-reach.js",
    "plan",
    "samples/cooperative-table.json",
    "--out",
    path.join(temporaryRoot, "source-demo"),
    "--fail-on-barrier"
  ]);

  const packageRoot = path.join(temporaryRoot, "package");
  const consumerRoot = path.join(temporaryRoot, "consumer");
  await mkdir(packageRoot);
  await mkdir(consumerRoot);
  run(process.execPath, [npmCli, "pack", "--pack-destination", packageRoot], {
    env: npmEnvironment
  });
  const tarball = path.join(packageRoot, `${packageJson.name}-${packageJson.version}.tgz`);
  run(
    process.execPath,
    [
      npmCli,
      "install",
      "--prefix",
      consumerRoot,
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      tarball
    ],
    { env: npmEnvironment }
  );
  run(process.execPath, [
    path.join(consumerRoot, "node_modules", packageJson.name, "bin", "meeple-reach.js"),
    "demo",
    "--out",
    path.join(temporaryRoot, "installed-demo")
  ]);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

process.stdout.write("MEEPLE_REACH_CHECK=PASS\n");
