#!/usr/bin/env node

import { CliError, main } from "../src/cli.js";
import { ScenarioError } from "../src/model.js";

try {
  await main(process.argv.slice(2));
} catch (error) {
  if (error instanceof CliError) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = error.exitCode;
  } else if (error instanceof ScenarioError) {
    process.stderr.write(`Input error: ${error.message}\n`);
    process.exitCode = 2;
  } else {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
  }
}
