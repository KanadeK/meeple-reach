import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(repositoryRoot, "dist", "site");
const libraryRoot = path.join(outputRoot, "lib");

await rm(outputRoot, { recursive: true, force: true });
await mkdir(libraryRoot, { recursive: true });

for (const name of ["index.html", "app.js", "style.css"]) {
  await copyFile(path.join(repositoryRoot, "web", name), path.join(outputRoot, name));
}
for (const name of ["index.js", "model.js", "audit.js", "planner.js", "reports.js", "version.js"]) {
  await copyFile(path.join(repositoryRoot, "src", name), path.join(libraryRoot, name));
}
await copyFile(
  path.join(repositoryRoot, "samples", "cooperative-table.json"),
  path.join(outputRoot, "sample.json")
);

process.stdout.write(`Built ${outputRoot}\n`);
