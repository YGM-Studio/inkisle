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

test("interaction providers render their public contracts", async (t) => {
  await t.test("disabled interactions emit no provider resources", async () => {
    const site = await buildSite(
      siteConfig({ theme: { name: "personal" } }),
      posts({ "content/posts/disabled.md": post("disabled-thread") })
    );
    const html = await readPage(site, "posts/disabled/index.html");

    assert.doesNotMatch(html, /data-inkisle-comments/);
    assert.doesNotMatch(html, /giscus\.app|@waline\/client/);
  });

  await t.test("Giscus shares keys and honors article-level switches", async () => {
    const config = siteConfig({
      base: "/interaction-lab",
      theme: { name: "business-blog" },
      interactions: {
        provider: "giscus",
        localeScope: "shared",
        giscus: {
          repo: "YGM-Studio/inkisle",
          repoId: "R_test",
          category: "InkIsle Blog",
          categoryId: "DIC_test"
        }
      }
    });
    const site = await buildSite(
      config,
      posts({
        "content/posts/shared.md": post("shared-thread"),
        "content/en/posts/shared.md": post("shared-thread", { title: "Shared thread" }),
        "content/posts/comments-off.md": post("comments-off", { comments: false }),
        "content/posts/reactions-off.md": post("reactions-off", { reactions: false })
      })
    );
    const chinese = await readPage(site, "posts/shared/index.html");
    const english = await readPage(site, "en/posts/shared/index.html");
    const commentsOff = await readPage(site, "posts/comments-off/index.html");
    const reactionsOff = await readPage(site, "posts/reactions-off/index.html");

    assert.match(chinese, /data-interaction-provider="giscus"/);
    assert.match(chinese, /data-interaction-key="shared-thread"/);
    assert.match(english, /data-interaction-key="shared-thread"/);
    assert.match(chinese, /const repoId = "R_test"/);
    assert.match(chinese, /const categoryId = "DIC_test"/);
    assert.match(chinese, /const reactionsEnabled = "1"/);
    assert.match(chinese, /href="\/interaction-lab\/posts\/shared\/"/);
    assert.doesNotMatch(commentsOff, /data-inkisle-comments/);
    assert.match(reactionsOff, /const reactionsEnabled = "0"/);
  });

  await t.test("Giscus separates translated discussions in the personal theme", async () => {
    const config = siteConfig({
      theme: { name: "personal" },
      interactions: {
        provider: "giscus",
        localeScope: "separate",
        giscus: {
          repo: "YGM-Studio/inkisle",
          repoId: "R_test",
          category: "InkIsle Blog",
          categoryId: "DIC_test"
        }
      }
    });
    const site = await buildSite(
      config,
      posts({
        "content/posts/separate.md": post("separate-thread"),
        "content/en/posts/separate.md": post("separate-thread", { title: "Separate thread" })
      })
    );

    assert.match(
      await readPage(site, "posts/separate/index.html"),
      /data-interaction-key="separate-thread:zh"/
    );
    assert.match(
      await readPage(site, "en/posts/separate/index.html"),
      /data-interaction-key="separate-thread:en"/
    );
  });

  await t.test("Waline receives stable keys and per-article reaction settings", async () => {
    const config = siteConfig({
      theme: { name: "personal" },
      interactions: {
        provider: "waline",
        localeScope: "shared",
        waline: {
          serverURL: "https://comments.example.com",
          reaction: true
        }
      }
    });
    const site = await buildSite(
      config,
      posts({
        "content/posts/reactions-on.md": post("waline-on"),
        "content/posts/reactions-off.md": post("waline-off", { reactions: false })
      })
    );
    const reactionsOn = await readPage(site, "posts/reactions-on/index.html");
    const reactionsOff = await readPage(site, "posts/reactions-off/index.html");

    assert.match(reactionsOn, /data-interaction-provider="waline"/);
    assert.match(reactionsOn, /data-interaction-key="waline-on"/);
    assert.match(reactionsOn, /const serverURL = "https:\/\/comments\.example\.com"/);
    assert.match(reactionsOn, /const reaction = true/);
    assert.match(reactionsOff, /const reaction = false/);
    assert.doesNotMatch(reactionsOn, /data-inkisle-giscus/);
  });

  await t.test("invalid provider configuration fails with an actionable error", async () => {
    const config = siteConfig({
      interactions: {
        provider: "giscus",
        giscus: {
          repo: "YGM-Studio/inkisle",
          category: "InkIsle Blog",
          categoryId: "DIC_test"
        }
      }
    });
    const site = await createSite(config, posts({ "content/posts/invalid.md": post("invalid") }));

    await assert.rejects(runBuild(site), (error) => {
      const output = `${error.stdout || ""}\n${error.stderr || ""}`;
      assert.match(output, /Missing interactions\.giscus\.repoId/);
      return true;
    });
  });
});

async function buildSite(config, files) {
  const siteRoot = await createSite(config, files);
  await runBuild(siteRoot);
  return siteRoot;
}

async function createSite(config, files) {
  const siteRoot = await fs.mkdtemp(path.join(os.tmpdir(), "inkisle-interactions-"));
  temporarySites.add(siteRoot);

  await fs.writeFile(
    path.join(siteRoot, "inkisle.config.mjs"),
    `export default ${JSON.stringify(config, null, 2)};\n`
  );

  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(siteRoot, relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
  }

  return siteRoot;
}

function runBuild(siteRoot) {
  return execFileAsync(process.execPath, [cliPath, "build"], {
    cwd: siteRoot,
    env: { ...process.env, NO_COLOR: "1" },
    maxBuffer: 10 * 1024 * 1024
  });
}

function readPage(siteRoot, relativePath) {
  return fs.readFile(path.join(siteRoot, "dist", relativePath), "utf8");
}

function siteConfig(overrides = {}) {
  return {
    title: "Interaction Test",
    site: "https://example.com",
    ...overrides
  };
}

function posts(files) {
  return files;
}

function post(interactionId, options = {}) {
  const title = options.title || interactionId;
  const frontmatter = [
    "---",
    `title: "${title}"`,
    `interactionId: "${interactionId}"`,
    "published: true"
  ];

  if (options.comments === false) {
    frontmatter.push("comments: false");
  }
  if (options.reactions === false) {
    frontmatter.push("reactions: false");
  }

  return `${frontmatter.join("\n")}\n---\n\nInteraction test content.\n`;
}
