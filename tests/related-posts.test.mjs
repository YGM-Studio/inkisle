import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(repoRoot, "bin", "inkisle.mjs");
const renderBuildRoot = path.join(repoRoot, "starters", "default", ".inkisle-build");
const temporarySites = new Set();

test.after(async () => {
  await Promise.all(
    [...temporarySites].flatMap((siteRoot) => [
      fs.rm(siteRoot, { recursive: true, force: true }),
      fs.rm(path.join(renderBuildRoot, path.basename(siteRoot)), { recursive: true, force: true })
    ])
  );
});

for (const themeName of ["personal", "business-blog"]) {
  test(`${themeName} ranks related posts by topic, tags, category, and date`, async () => {
    const siteRoot = await createSite(themeName, true);
    const html = await readPage(siteRoot, "posts/current/index.html");

    assert.match(html, /class="related-reading"/);
    assert.match(html, />相关阅读</);
    assertOrder(html, ["/posts/topic-match/", "/posts/two-tags/", "/posts/tag-and-category/"]);
    assert.doesNotMatch(html, /data-related-post-url="\/posts\/tag-only-newer\/"/);
    assert.doesNotMatch(html, /data-related-post-url="\/posts\/category-only\/"/);
    assert.doesNotMatch(html, /data-related-post-url="\/posts\/no-signal\/"/);
    assert.doesNotMatch(html, /data-related-post-url="\/en\/posts\/english\/"/);
  });
}

test("related posts can be disabled", async () => {
  const siteRoot = await createSite("personal", false);
  const html = await readPage(siteRoot, "posts/current/index.html");

  assert.doesNotMatch(html, /class="related-reading"/);
});

async function createSite(themeName, enabled) {
  const siteRoot = await fs.mkdtemp(path.join(os.tmpdir(), `inkisle-related-${themeName}-`));
  temporarySites.add(siteRoot);

  const config = {
    title: "Related Test",
    site: "https://example.com",
    base: "/notes",
    theme: { name: themeName },
    relatedPosts: { enabled, limit: 3 }
  };
  const files = {
    "content/posts/current.md": content("Current", {
      topic: "topic-a",
      tags: ["alpha", "beta"],
      category: "Engineering",
      date: "2026-06-10"
    }),
    "content/posts/topic-match.md": content("Topic match", {
      topic: "topic-a",
      tags: [],
      category: "Other",
      date: "2024-01-01"
    }),
    "content/posts/two-tags.md": content("Two tags", {
      tags: ["alpha", "beta"],
      category: "Other",
      date: "2025-01-01"
    }),
    "content/posts/tag-and-category.md": content("Tag and category", {
      tags: ["alpha"],
      category: "Engineering",
      date: "2025-01-01"
    }),
    "content/posts/tag-only-newer.md": content("Tag only newer", {
      tags: ["alpha"],
      category: "Other",
      date: "2026-06-11"
    }),
    "content/posts/category-only.md": content("Category only", {
      category: "Engineering",
      date: "2026-06-12"
    }),
    "content/posts/no-signal.md": content("No signal", {
      tags: ["gamma"],
      category: "Notes",
      date: "2026-06-13"
    }),
    "content/en/posts/english.md": content("English", {
      topic: "topic-a",
      tags: ["alpha", "beta"],
      category: "Engineering",
      date: "2026-06-14"
    })
  };

  await fs.writeFile(
    path.join(siteRoot, "inkisle.config.mjs"),
    `export default ${JSON.stringify(config, null, 2)};\n`
  );

  for (const [relativePath, source] of Object.entries(files)) {
    const filePath = path.join(siteRoot, relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, source);
  }

  await execFileAsync(process.execPath, [cliPath, "build"], {
    cwd: siteRoot,
    env: { ...process.env, NO_COLOR: "1" },
    maxBuffer: 10 * 1024 * 1024
  });

  return siteRoot;
}

function content(title, fields) {
  const frontmatter = ["---", `title: "${title}"`, "published: true"];
  if (fields.topic) frontmatter.push(`topic: "${fields.topic}"`);
  if (fields.tags) frontmatter.push(`tags: [${fields.tags.map((tag) => `"${tag}"`).join(", ")}]`);
  if (fields.category) frontmatter.push(`category: "${fields.category}"`);
  if (fields.date) frontmatter.push(`date: "${fields.date}"`);

  return `${frontmatter.join("\n")}\n---\n\nRelated post test content.\n`;
}

function assertOrder(html, urls) {
  const indexes = urls.map((url) => html.indexOf(`data-related-post-url="${url}"`));
  assert.ok(indexes.every((index) => index >= 0), `Missing related URL in ${indexes.join(", ")}`);
  assert.deepEqual(indexes, [...indexes].sort((left, right) => left - right));
}

function readPage(siteRoot, relativePath) {
  return fs.readFile(path.join(siteRoot, "dist", relativePath), "utf8");
}
