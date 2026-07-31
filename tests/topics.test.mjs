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

test("topic centers connect homepages and related posts", async () => {
  const siteRoot = await fs.mkdtemp(path.join(os.tmpdir(), "inkisle-topics-"));
  temporarySites.add(siteRoot);

  const config = {
    title: "Topic Test",
    site: "https://example.com",
    base: "/notes",
    theme: { name: "personal" },
    home: {
      topics: {
        enabled: true,
        heading: { zh: "主题索引", en: "Topic Guides" },
        items: [
          {
            id: "deployment",
            title: { zh: "部署指南", en: "Deployment Guide" },
            summary: { zh: "从选择方案到上线。", en: "From choosing a path to going live." },
            href: { zh: "/pages/deployment/", en: "/en/pages/deployment/" }
          }
        ]
      }
    }
  };

  const files = {
    "content/pages/deployment.md": content("部署指南"),
    "content/en/pages/deployment.md": content("Deployment Guide"),
    "content/posts/first.md": content("第一篇", "deployment"),
    "content/posts/second.md": content("第二篇", "deployment"),
    "content/posts/unknown.md": content("未知主题", "missing-topic"),
    "content/en/posts/first.md": content("First", "deployment")
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

  const chineseHome = await readPage(siteRoot, "index.html");
  const englishHome = await readPage(siteRoot, "en/index.html");
  const relatedPost = await readPage(siteRoot, "posts/first/index.html");
  const unknownPost = await readPage(siteRoot, "posts/unknown/index.html");

  assert.match(chineseHome, />主题索引</);
  assert.match(chineseHome, />部署指南</);
  assert.match(chineseHome, />2 篇文章</);
  assert.match(chineseHome, /href="\/notes\/pages\/deployment\/"/);
  assert.match(chineseHome, /href="\/notes\/rss\.xml"/);

  assert.match(englishHome, />Topic Guides</);
  assert.match(englishHome, />Deployment Guide</);
  assert.match(englishHome, />1 article</);
  assert.match(englishHome, /href="\/notes\/en\/pages\/deployment\/"/);

  assert.match(relatedPost, /data-topic-id="deployment"/);
  assert.match(relatedPost, />继续阅读这个主题</);
  assert.match(relatedPost, /href="\/notes\/pages\/deployment\/"/);
  assert.doesNotMatch(unknownPost, /class="topic-callout"/);
});

function content(title, topic) {
  const frontmatter = ["---", `title: "${title}"`, "published: true"];
  if (topic) {
    frontmatter.push(`topic: "${topic}"`);
  }

  return `${frontmatter.join("\n")}\n---\n\nTopic test content.\n`;
}

function readPage(siteRoot, relativePath) {
  return fs.readFile(path.join(siteRoot, "dist", relativePath), "utf8");
}
