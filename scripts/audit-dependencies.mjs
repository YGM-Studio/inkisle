import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { advisory, verifyPatchedCache } from "../starters/default/scripts/http-cache-security.mjs";

export async function reviewAudit(report, root, verify = verifyPatchedCache) {
  const totals = report.metadata?.vulnerabilities;
  if (report.auditReportVersion !== 2 || !report.vulnerabilities || !totals || report.error) {
    throw new Error("npm did not return a valid dependency audit report.");
  }
  const entries = Object.values(report.vulnerabilities);
  const severities = ["info", "low", "moderate", "high", "critical"];
  if (entries.some((entry) => !entry.name || !severities.includes(entry.severity)) ||
      severities.some((severity) => totals[severity] !== entries.filter((entry) => entry.severity === severity).length) ||
      totals.total !== entries.length) {
    throw new Error("npm returned an incomplete dependency audit report.");
  }
  const cache = report.vulnerabilities["http-cache-semantics"];
  let backportVerified = false;
  if (cache?.via?.length && cache.nodes?.length && cache.via.every((item) =>
    item && typeof item === "object" && item.name === "http-cache-semantics" &&
    item.url === advisory && item.source === 1240991 && item.range === "<=4.2.0"
  )) {
    for (const node of cache.nodes) {
      const directory = path.resolve(root, node);
      const relative = path.relative(root, directory);
      if (!relative.startsWith(`node_modules${path.sep}`) || relative.split(path.sep).includes("..")) {
        throw new Error("Unexpected dependency path in the npm audit report.");
      }
      await verify(directory);
    }
    backportVerified = true;
  }
  const mitigated = [];
  const blocking = [];
  for (const entry of entries) {
    const covered = backportVerified && (
      entry.name === "http-cache-semantics" ||
      (entry.name === "astro" && entry.via?.length && entry.via.every((item) => item === "http-cache-semantics"))
    );
    if (covered) mitigated.push(entry.name);
    else if (["high", "critical"].includes(entry.severity)) blocking.push(entry);
  }
  return { mitigated, blocking, vulnerabilities: report.metadata?.vulnerabilities };
}

async function main() {
  // npm_execpath avoids invoking a Windows .cmd file through a shell.
  const command = process.env.npm_execpath ? process.execPath : "npm";
  const args = [...(process.env.npm_execpath ? [process.env.npm_execpath] : []), "audit", "--json", "--audit-level=high"];
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  if (result.error || ![0, 1].includes(result.status)) throw new Error("npm audit could not complete.");
  const review = await reviewAudit(JSON.parse(result.stdout), process.cwd());
  console.log(`Registry audit findings: ${JSON.stringify(review.vulnerabilities)}`);
  if (review.mitigated.length) {
    console.log(`Verified code backport for ${advisory}: ${review.mitigated.join(", ")}. Package version remains 4.2.0; the registry report still includes these patched entries.`);
  }
  for (const entry of review.blocking) console.error(`${entry.severity}: ${entry.name} ${JSON.stringify(entry.via)}`);
  if (review.blocking.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
