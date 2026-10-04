import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { advisory, applyCachePatch, resolveCachePackage, verifyPatchedCache } from "../starters/default/scripts/http-cache-security.mjs";
import { reviewAudit } from "../scripts/audit-dependencies.mjs";

const require = createRequire(import.meta.url);
const installedCache = resolveCachePackage();
const CachePolicy = require(process.env.INKISLE_CACHE_TEST_MODULE || path.join(installedCache, "index.js"));
const request = { url: "https://example.test/image", method: "GET", headers: { host: "example.test", accept: "image/png" } };
const ordinary = "max-age=60, stale-if-error=600, stale-while-revalidate=600";

function policy(headers = {}, options, restored = false, age = "120") {
  let result = new CachePolicy(request, { status: 200, headers: { "cache-control": ordinary, age, ...headers } }, options);
  if (restored) result = CachePolicy.fromObject(JSON.parse(JSON.stringify(result.toObject())));
  const created = result.toObject().t;
  result.now = () => created;
  return result;
}

const restricted = [
  ["shared cookie", { "set-cookie": "session=synthetic-value" }],
  ...["no-cache", "no-store", "private", "proxy-revalidate"].map((directive) => [directive, { "cache-control": `${ordinary}, ${directive}` }]),
  ["Vary wildcard", { vary: " * " }],
  ["Vary list wildcard", { vary: "accept, *" }]
];

for (const restored of [false, true]) {
  for (const [name, headers] of restricted) {
    test(`restricted ${name}${restored ? " restored" : ""} cannot be revived by stale allowances`, () => {
      const cached = policy(headers, undefined, restored);
      for (const directive of ["max-stale", "max-stale=999999"]) {
        const next = { ...request, headers: { ...request.headers, "cache-control": directive } };
        assert.equal(cached.evaluateRequest(next).response, undefined);
        assert.equal(cached.satisfiesWithoutRevalidation(next), false);
      }
      assert.equal(cached.useStaleWhileRevalidate(), false);
      assert.equal(cached.timeToLive(), 0);
      for (const status of [500, 502, 503, 504]) {
        assert.equal(cached.revalidatedPolicy(request, { status, headers: {} }).modified, true);
      }
      for (const response of [undefined, null]) {
        assert.throws(() => cached.revalidatedPolicy(request, response), /Response headers missing/);
      }
    });
  }
}

for (const [name, headers, options] of [
  ["ordinary expiration", {}, undefined],
  ["private cache cookie", { "set-cookie": "session=synthetic-value" }, { shared: false }],
  ["explicit public cookie", { "set-cookie": "session=synthetic-value", "cache-control": `${ordinary}, public` }, undefined],
  ["explicit immutable cookie", { "set-cookie": "session=synthetic-value", "cache-control": `${ordinary}, immutable` }, undefined]
]) {
  test(`${name} preserves legitimate stale reuse`, () => {
    const cached = policy(headers, options);
    assert.ok(cached.evaluateRequest({ ...request, headers: { ...request.headers, "cache-control": "max-stale" } }).response);
    assert.equal(cached.useStaleWhileRevalidate(), true);
    assert.equal(cached.timeToLive(), 540000);
    assert.equal(cached.revalidatedPolicy(request, { status: 503, headers: {} }).modified, false);
  });
}

for (const directive of ["must-revalidate", "s-maxage=60"]) {
  test(`${directive} preserves fresh reuse and prohibits stale fallback`, () => {
    const headers = { "cache-control": `${ordinary}, ${directive}` };
    const fresh = policy(headers, undefined, false, "0");
    assert.ok(fresh.evaluateRequest(request).response);
    assert.equal(fresh.timeToLive(), 60000);
    const stale = policy(headers);
    assert.equal(stale.evaluateRequest({ ...request, headers: { ...request.headers, "cache-control": "max-stale" } }).response, undefined);
    assert.equal(stale.revalidatedPolicy(request, { status: 503, headers: {} }).modified, true);
    assert.equal(stale.timeToLive(), 0);
  });
}

for (const [name, changed] of [
  ["URL", { url: "https://example.test/other" }],
  ["method", { method: "POST" }],
  ["Host", { headers: { ...request.headers, host: "other.example.test" } }],
  ["Vary", { headers: { ...request.headers, accept: "image/webp" } }],
  ["request no-cache", { headers: { ...request.headers, "cache-control": "no-cache" } }],
  ["legacy request Pragma", { headers: { ...request.headers, pragma: "NO-CACHE" } }]
]) {
  test(`${name} mismatch cannot select another response during an error`, () => {
    const cached = policy({ vary: "accept" });
    const next = { ...request, ...changed };
    assert.equal(cached.revalidatedPolicy(next, { status: 503, headers: {} }).modified, true);
    assert.throws(() => cached.revalidatedPolicy(next, undefined), /Response headers missing/);
  });
}

test("a successful matching 304 validation preserves the cached response", () => {
  const cached = policy({ etag: '"synthetic-etag"' });
  const result = cached.revalidatedPolicy(request, { status: 304, headers: { etag: '"synthetic-etag"', "cache-control": "max-age=120" } });
  assert.equal(result.modified, false);
  assert.equal(result.matches, true);
  assert.equal(result.policy.maxAge(), 120);
});

test("Astro's real image loader gives restricted responses no retention window", async () => {
  const astroRoot = path.dirname(require.resolve("astro/package.json"));
  const { loadRemoteImage } = await import(pathToFileURL(path.join(astroRoot, "dist/assets/build/remote.js")));
  const imageConfig = { domains: ["example.test"], remotePatterns: [] };
  for (const [, headers] of restricted) {
    const loaded = await loadRemoteImage(request.url, async () => new Response("synthetic-image", {
      status: 200, headers: { "cache-control": ordinary, age: "120", ...headers }
    }), imageConfig);
    assert.ok(loaded.expires <= Date.now());
  }
  const before = Date.now();
  const ordinaryImage = await loadRemoteImage(request.url, async () => new Response("synthetic-image", {
    status: 200, headers: { "cache-control": ordinary, age: "120" }
  }), imageConfig);
  assert.ok(ordinaryImage.expires >= before + 539000);
});

test("install verification is idempotent and rejects altered code", async (t) => {
  await verifyPatchedCache(installedCache);
  assert.equal((await applyCachePatch(installedCache)).applied, false);
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "inkisle-cache-test-"));
  t.after(() => fs.rm(temporary, { recursive: true, force: true }));
  await fs.writeFile(path.join(temporary, "package.json"), JSON.stringify({ name: "http-cache-semantics", version: "4.2.0" }));
  const altered = `${await fs.readFile(path.join(installedCache, "index.js"), "utf8")}\n// unexpected change\n`;
  await fs.writeFile(path.join(temporary, "index.js"), altered);
  await assert.rejects(verifyPatchedCache(temporary), /missing or changed/);
  await assert.rejects(applyCachePatch(temporary), /Unrecognized/);
  assert.equal(await fs.readFile(path.join(temporary, "index.js"), "utf8"), altered);
});

function auditReport() {
  return { auditReportVersion: 2, metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 2, critical: 0, total: 2 } }, vulnerabilities: {
    "http-cache-semantics": { name: "http-cache-semantics", severity: "high", nodes: [path.relative(process.cwd(), installedCache)], via: [{ name: "http-cache-semantics", url: advisory, source: 1240991, range: "<=4.2.0" }] },
    astro: { name: "astro", severity: "high", via: ["http-cache-semantics"] }
  } };
}

test("the audit accepts only the code-verified backport and its Astro propagation", async () => {
  const review = await reviewAudit(auditReport(), process.cwd());
  assert.deepEqual(review.mitigated, ["http-cache-semantics", "astro"]);
  assert.equal(review.blocking.length, 0);
});

test("a missing backport cannot waive the advisory", async () => {
  await assert.rejects(reviewAudit(auditReport(), process.cwd(), async () => { throw new Error("missing patch"); }), /missing patch/);
});

test("another cache advisory or another Astro advisory still fails the audit", async () => {
  const anotherCache = auditReport();
  anotherCache.vulnerabilities["http-cache-semantics"].via.push({ name: "http-cache-semantics", url: "https://example.test/new-advisory" });
  assert.equal((await reviewAudit(anotherCache, process.cwd())).blocking.length, 2);
  const anotherAstro = auditReport();
  anotherAstro.vulnerabilities.astro.via.push({ name: "astro", url: "https://example.test/new-advisory" });
  assert.equal((await reviewAudit(anotherAstro, process.cwd())).blocking[0].name, "astro");
});

test("unrelated high and critical advisories remain blocking", async () => {
  const report = auditReport();
  for (const severity of ["high", "critical"]) report.vulnerabilities[severity] = { name: severity, severity, via: [{ url: "https://example.test/new-advisory" }] };
  report.metadata.vulnerabilities.high++;
  report.metadata.vulnerabilities.critical++;
  report.metadata.vulnerabilities.total += 2;
  assert.deepEqual((await reviewAudit(report, process.cwd())).blocking.map((entry) => entry.name), ["high", "critical"]);
});

test("incomplete npm reports cannot pass", async () => {
  await assert.rejects(reviewAudit({ error: { code: "EAI_AGAIN" } }, process.cwd()), /valid dependency audit/);
});
