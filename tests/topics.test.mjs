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
  test(`${themeName} topic indexes connect navigation and related posts`, async () => {
    const siteRoot = await fs.mkdtemp(path.join(os.tmpdir(), `inkisle-topics-${themeName}-`));
    temporarySites.add(siteRoot);

    const config = {
      title: "Topic Test",
      site: "https://example.com",
      base: "/notes",
      theme: { name: themeName },
      topics: {
        enabled: true,
        label: { zh: "专题", en: "Topics" },
        items: [
          {
            id: "deployment",
            title: { zh: "部署指南", en: "Deployment Guide" },
            summary: { zh: "从选择方案到上线。", en: "From choosing a path to going live." },
            href: { zh: "/pages/deployment/", en: "/en/pages/deployment/" }
          }
        ]
      }
    };

    const files = {
      "content/pages/deployment.md": content("部署指南"),
      "content/en/pages/deployment.md": content("Deployment Guide"),
      "content/posts/first.md": content("第一篇", "deployment", "2026-06-06"),
      "content/posts/second.md": content("第二篇", "deployment", "2026-06-05"),
      "content/posts/third.md": content("第三篇", "deployment", "2026-06-04"),
      "content/posts/fourth.md": content("第四篇", "deployment", "2026-06-03"),
      "content/posts/fifth.md": content("第五篇", "deployment", "2026-06-02"),
      "content/posts/sixth.md": content("第六篇", "deployment", "2026-06-01"),
      "content/posts/unknown.md": content("未知主题", "missing-topic"),
      "content/en/posts/first.md": content("First", "deployment", "2026-06-06")
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
    const chineseTopics = await readPage(siteRoot, "topics/index.html");
    const englishTopics = await readPage(siteRoot, "en/topics/index.html");
    const relatedPost = await readPage(siteRoot, "posts/first/index.html");
    const unknownPost = await readPage(siteRoot, "posts/unknown/index.html");
    const sitemap = await readPage(siteRoot, "sitemap-0.xml");

    assert.match(chineseHome, /href="\/notes\/topics\/">专题<\/a>/);
    assert.doesNotMatch(chineseHome, /data-topic-id="deployment"/);
    assert.doesNotMatch(chineseHome, />部署指南</);
    assert.match(chineseHome, /href="\/notes\/rss\.xml"/);

    assert.match(englishHome, /href="\/notes\/en\/topics\/">Topics<\/a>/);
    assert.doesNotMatch(englishHome, /data-topic-id="deployment"/);
    assert.doesNotMatch(englishHome, />Deployment Guide</);

    assert.match(chineseTopics, /data-topic-id="deployment"/);
    assert.match(chineseTopics, />部署指南<\/a>/);
    assert.match(chineseTopics, /从选择方案到上线。/);
    assert.match(chineseTopics, />6 篇文章</);
    assert.match(chineseTopics, /href="\/notes\/posts\/first\/">第一篇<\/a>/);
    assert.match(chineseTopics, /href="\/notes\/pages\/deployment\/"/);
    assert.doesNotMatch(chineseTopics, />第六篇<\/a>/);

    assert.match(englishTopics, /data-topic-id="deployment"/);
    assert.match(englishTopics, />Deployment Guide<\/a>/);
    assert.match(englishTopics, />1 article</);
    assert.match(englishTopics, /href="\/notes\/en\/posts\/first\/">First<\/a>/);
    assert.match(englishTopics, /href="\/notes\/en\/pages\/deployment\/"/);

    assert.match(relatedPost, /data-topic-id="deployment"/);
    assert.match(relatedPost, />继续阅读这个主题</);
    assert.match(relatedPost, /href="\/notes\/pages\/deployment\/"/);
    assert.doesNotMatch(unknownPost, /class="topic-callout"/);

    assert.match(sitemap, /https:\/\/example\.com\/notes\/topics\//);
    assert.match(sitemap, /https:\/\/example\.com\/notes\/en\/topics\//);
  });
}

function content(title, topic, date) {
  const frontmatter = ["---", `title: "${title}"`, "published: true"];
  if (topic) {
    frontmatter.push(`topic: "${topic}"`);
  }
  if (date) {
    frontmatter.push(`date: "${date}"`);
  }

  return `${frontmatter.join("\n")}\n---\n\nTopic test content.\n`;
}

function readPage(siteRoot, relativePath) {
  return fs.readFile(path.join(siteRoot, "dist", relativePath), "utf8");
}
