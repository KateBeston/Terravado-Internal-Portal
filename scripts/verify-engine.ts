/* ===========================================================================
   TERRAVADO — assurance verification runner
   Runs the structured assurance suite (reference-data known-answer checks +
   engine-path invariants) and prints a source-annotated report. Exits non-zero
   on any failure so CI blocks a change that breaks a calculation.
   Run: npm run verify:engine
   =========================================================================== */
import { runChecks, summarise, type CheckResult } from "../src/lib/assurance/checks";
import { ENGINE_VERSION, TAX_DATA } from "../src/lib/engine/tax-data";

const results = runChecks();
const { total, passed, failed } = summarise(results);

console.log(`\nTERRAVADO — assurance verification`);
console.log(`engine ${ENGINE_VERSION} · tax data ${TAX_DATA.version} (effective ${TAX_DATA.effectiveFrom})\n`);

let currentCategory = "";
for (const r of results) {
  if (r.category !== currentCategory) {
    currentCategory = r.category;
    console.log(`${currentCategory}`);
  }
  const mark = r.status === "pass" ? "✓" : "✗";
  const actual = String(r.actual ?? "");
  const exp = String(r.expected ?? "");
  const detail = r.status === "pass" ? actual : `${actual}  (expected ${exp})`;
  console.log(`  ${mark} ${r.description.padEnd(46)} ${detail.padEnd(26)} [${r.source}]`);
}

const line = `${total} checks · ${passed} passed · ${failed} failed`;
console.log(`\n${line}`);
console.log(failed === 0 ? "ALL CHECKS PASSED\n" : "CHECKS FAILED\n");

// Machine-readable tail for CI log scraping.
if (failed > 0) {
  const names = results.filter((r: CheckResult) => r.status === "fail").map((r) => r.id).join(", ");
  console.log(`failed: ${names}\n`);
}

process.exit(failed === 0 ? 0 : 1);
