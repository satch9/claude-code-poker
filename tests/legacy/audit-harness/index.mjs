// tests/legacy/audit-harness/index.mjs
// Entry point. Usage: node tests/legacy/audit-harness/index.mjs [s1|s2|s3|all]

import { makeClient, log } from "./lib.mjs";
import { runS1 } from "./scenarios/s1-action-ordering.mjs";
import { runS2 } from "./scenarios/s2-side-pots.mjs";
import { runS3 } from "./scenarios/s3-elimination.mjs";

const target = (process.argv[2] || "all").toLowerCase();
const client = makeClient();

const scenarios = {
  s1: runS1,
  s2: runS2,
  s3: runS3,
};

async function main() {
  log("harness", `Target: ${target}`);
  const toRun = target === "all" ? Object.keys(scenarios) : [target];

  for (const key of toRun) {
    const fn = scenarios[key];
    if (!fn) {
      console.error(`Unknown scenario: ${key}`);
      process.exit(1);
    }
    log("harness", `=== Running ${key.toUpperCase()} ===`);
    try {
      await fn(client);
      log("harness", `=== ${key.toUpperCase()} done ===\n`);
    } catch (err) {
      console.error(`[${key}] CRASHED:`, err.message);
      console.error(err.stack);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
