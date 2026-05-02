#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const command = args[0];

const help = `
InkIsle CLI

Usage:
  inkisle init [dir]
  inkisle new post "Post title" [--lang en] [--slug custom-slug] [--published]
  inkisle new page "Page title" [--lang en] [--slug about]
  inkisle dev
  inkisle build
  inkisle preview
`;

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  if (!command || command === "-h" || command === "--help") {
    console.log(help.trim());
    return;
  }

  if (command === "init") {
    await initProject(args[1] || "inkisle-site");
    return;
  }

  if (command === "new") {
    await newContent(args.slice(1));
    return;
  }

  if (["dev", "build", "preview"].includes(command)) {
    await runAstro(command, args.slice(1));
    return;
  }

  throw new Error(`Unknown command: ${command}\n\n${help.trim()}`);
}

async function initProject(targetDir) {
  const target = path.resolve(process.cwd(), targetDir);

  if (existsSync(target)) {
    const existing = await fs.readdir(target);
    if (existing.length > 0) {
      throw new Error(`Target directory is not empty: ${target}`);
    }
  }

  await fs.mkdir(target, { recursive: true });

  const allowList = [
    "astro.config.mjs",
    "tsconfig.json",
    "README.md",
    "docs",
    "src",
    "content",
    "bin",
    ".gitignore"
  ];

  for (const item of allowList) {
    await copyPath(path.join(packageRoot, item), path.join(target, item));
  }

  const packageJson = JSON.parse(await fs.readFile(path.join(packageRoot, "package.json"), "utf8"));
  packageJson.name = path.basename(target);
  packageJson.private = true;
  await fs.writeFile(path.join(target, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);

  console.log(`Created InkIsle starter at ${target}`);
  console.log("Next: npm install && npm run dev");
}

async function newContent(input) {
  const type = input[0];
  if (!["post", "page"].includes(type)) {
    throw new Error("Use `inkisle new post` or `inkisle new page`.");
  }

  const { positional, options } = parseArgs(input.slice(1));
  const title = positional.join(" ").trim();
  if (!title) {
    throw new Error(`Missing ${type} title.`);
  }

  const defaultLocale = options.defaultLocale || "zh";
  const lang = options.lang || defaultLocale;
  const slug = options.slug || slugify(title);
  const today = new Date().toISOString().slice(0, 10);
  const contentDir =
    lang === defaultLocale
      ? path.join(process.cwd(), "content", `${type}s`)
      : path.join(process.cwd(), "content", lang, `${type}s`);
  const filePath = path.join(contentDir, `${slug}.md`);

  if (existsSync(filePath) && !options.force) {
    throw new Error(`File already exists: ${filePath}`);
  }

  await fs.mkdir(contentDir, { recursive: true });
  const draft = type === "post" && !options.published;
  const frontmatter =
    type === "post"
      ? [
          "---",
          `title: "${escapeYaml(title)}"`,
          `date: ${today}`,
          `updated: ${today}`,
          'summary: ""',
          "tags: []",
          "category:",
          `draft: ${draft ? "true" : "false"}`,
          "---",
          ""
        ]
      : ["---", `title: "${escapeYaml(title)}"`, 'summary: ""', "---", ""];

  await fs.writeFile(filePath, `${frontmatter.join("\n")}\n`);
  console.log(`Created ${filePath}`);
}

function runAstro(script, extraArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["astro", script, ...extraArgs], {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: process.platform === "win32"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`astro ${script} exited with code ${code}`));
      }
    });
  });
}

async function copyPath(source, target) {
  if (!existsSync(source)) {
    return;
  }

  const stat = await fs.stat(source);
  if (stat.isDirectory()) {
    await fs.mkdir(target, { recursive: true });
    const entries = await fs.readdir(source);
    for (const entry of entries) {
      if (shouldIgnore(entry)) {
        continue;
      }
      await copyPath(path.join(source, entry), path.join(target, entry));
    }
    return;
  }

  await fs.copyFile(source, target);
}

function shouldIgnore(name) {
  return [".git", "node_modules", "dist", ".astro", "package-lock.json"].includes(name);
}

function parseArgs(input) {
  const options = {};
  const positional = [];

  for (let index = 0; index < input.length; index += 1) {
    const value = input[index];

    if (value === "--published") {
      options.published = true;
      continue;
    }

    if (value === "--force") {
      options.force = true;
      continue;
    }

    if (value?.startsWith("--")) {
      const key = value.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      const next = input[index + 1];
      if (!next || next.startsWith("--")) {
        throw new Error(`Missing value for ${value}`);
      }
      options[key] = next;
      index += 1;
      continue;
    }

    positional.push(value);
  }

  return { positional, options };
}

function slugify(value) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[\\/]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fa5._-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || `post-${Date.now()}`;
}

function escapeYaml(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

