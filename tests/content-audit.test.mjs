import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  auditContent,
  formatAuditMarkdown,
  formatAuditText
} from "../bin/content-audit.mjs";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(repoRoot, "bin", "inkisle.mjs");
const temporarySites = new Set();
const now = new Date("2026-08-01T00:00:00.000Z");

test.after(async () => {
  await Promise.all([...temporarySites].map((siteRoot) => fs.rm(siteRoot, { recursive: true, force: true })));
});

test("content audit reports editorial, routing, and taxonomy problems", async () => {
  const siteRoot = await createAuditSite();
  const report = await auditContent({
    siteRoot,
    config: siteConfig,
    staleDays: 730,
    now
  });

  assert.equal(report.totals.publishedPosts, 6);
  assert.equal(report.totals.publishedPages, 1);
  assert.equal(report.totals.draftEntries, 1);
  assert.ok(report.totals.errors > 0);
  assert.ok(report.totals.warnings > 0);

  for (const code of [
    "duplicate-route",
    "broken-content-link",
    "missing-title",
    "missing-date",
    "missing-summary",
    "unknown-topic",
    "orphan-post",
    "singleton-tag",
    "singleton-category",
    "stale-post"
  ]) {
    assert.ok(report.findings.some((item) => item.code === code), `Missing ${code} finding`);
  }

  const brokenLink = report.findings.find((item) =>
    item.code === "broken-content-link" && item.file === "content/posts/source.md"
  );
  assert.ok(brokenLink);
  assert.ok(Number.isInteger(brokenLink.line) && brokenLink.line > 0);
  assert.ok(!report.findings.some((item) =>
    item.code === "orphan-post" && item.file === "content/posts/target.md"
  ));
  assert.ok(!report.findings.some((item) => item.file.startsWith("content/fr/")));

  const textOutput = formatAuditText(report);
  const markdownOutput = formatAuditMarkdown(report);
  assert.match(textOutput, /ERROR \[broken-content-link\]/);
  assert.match(markdownOutput, /^# Content audit/m);
  assert.match(markdownOutput, /## Warning/);
  assert.match(markdownOutput, /`unknown-topic`/);
});

test("content audit can check external links with an injected fetch implementation", async () => {
  const siteRoot = await createSite({
    "content/posts/external.md": post("External", {
      body: "A [working link](https://example.com/ok) and https://example.com/missing."
    })
  });
  const requests = [];
  const report = await auditContent({
    siteRoot,
    config: siteConfig,
    checkExternal: true,
    fetchImpl: async (url, options) => {
      requests.push({ url, method: options.method });
      return { ok: url.endsWith("/ok"), status: url.endsWith("/ok") ? 200 : 404 };
    },
    now
  });

  assert.equal(requests.length, 2);
  assert.ok(report.findings.some((item) =>
    item.code === "external-link-failed" && item.message.includes("https://example.com/missing")
  ));
  assert.ok(!report.findings.some((item) =>
    item.code === "external-link-failed" && item.message.includes("https://example.com/ok")
  ));
});

test("CLI supports JSON and Markdown output and only fails in strict mode", async () => {
  const siteRoot = await createAuditSite();
  const normal = await execFileAsync(process.execPath, [cliPath, "audit", "content", "--format", "json"], {
    cwd: siteRoot
  });
  const report = JSON.parse(normal.stdout);
  assert.ok(report.findings.some((item) => item.code === "duplicate-route"));

  const markdownResult = await execFileAsync(
    process.execPath,
    [cliPath, "audit", "content", "--format", "markdown"],
    { cwd: siteRoot }
  );
  assert.match(markdownResult.stdout, /^# Content audit/m);

  await assert.rejects(
    execFileAsync(process.execPath, [cliPath, "audit", "content", "--strict"], { cwd: siteRoot }),
    (error) => error.code === 1 && /duplicate-route/.test(error.stdout)
  );
});

const siteConfig = {
  defaultLocale: "zh",
  locales: [{ code: "zh" }, { code: "en" }],
  topics: { items: [{ id: "known-topic" }] }
};

async function createAuditSite() {
  return createSite({
    "content/posts/source.md": post("Source", {
      tags: ["shared", "one-off"],
      category: "Engineering",
      topic: "known-topic",
      body: [
        "[Target](/posts/target/)",
        "",
        "[Missing](/posts/does-not-exist/)"
      ].join("\n")
    }),
    "content/posts/target.md": post("Target", {
      tags: ["shared"],
      category: "Engineering"
    }),
    "content/posts/duplicate-a.md": post("Duplicate A", {
      slug: "duplicate",
      tags: ["shared"],
      category: "Engineering",
      body: "[Source](/posts/source/)"
    }),
    "content/posts/duplicate-b.md": post("Duplicate B", {
      slug: "duplicate",
      tags: ["shared"],
      category: "Engineering"
    }),
    "content/posts/incomplete.md": [
      "---",
      "published: true",
      "topic: missing-topic",
      "category: One-off category",
      "---",
      "",
      "Incomplete."
    ].join("\n"),
    "content/posts/stale.md": post("Stale", {
      date: "2020-01-01",
      tags: ["shared"],
      category: "Engineering"
    }),
    "content/pages/index.md": page("Index", "[Stale](/posts/stale/)"),
    "content/posts/draft.md": post("Draft", { published: false }),
    "content/fr/posts/ignored.md": post("Unsupported locale")
  });
}

async function createSite(files) {
  const siteRoot = await fs.mkdtemp(path.join(os.tmpdir(), "inkisle-audit-"));
  temporarySites.add(siteRoot);
  await fs.writeFile(
    path.join(siteRoot, "inkisle.config.mjs"),
    `export default ${JSON.stringify(siteConfig, null, 2)};\n`
  );

  for (const [relativePath, source] of Object.entries(files)) {
    const filePath = path.join(siteRoot, relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, source);
  }

  return siteRoot;
}

function post(title, fields = {}) {
  const frontmatter = [
    "---",
    `title: "${title}"`,
    `date: "${fields.date || "2026-07-01"}"`,
    `summary: "${title} summary"`,
    `tags: [${(fields.tags || []).map((tag) => `"${tag}"`).join(", ")}]`,
    ...(fields.category ? [`category: "${fields.category}"`] : []),
    ...(fields.topic ? [`topic: "${fields.topic}"`] : []),
    ...(fields.slug ? [`slug: "${fields.slug}"`] : []),
    `published: ${fields.published ?? true}`,
    "---",
    "",
    fields.body || `${title} body.`
  ];
  return frontmatter.join("\n");
}

function page(title, body) {
  return ["---", `title: "${title}"`, "published: true", "---", "", body].join("\n");
}
