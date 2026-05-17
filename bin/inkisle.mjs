#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const contentOnlyStarterRoot = path.join(packageRoot, "starters", "content-only");
const fullStarterRoot = path.join(packageRoot, "starters", "default");
const args = process.argv.slice(2);
const command = args[0];

const help = `
InkIsle CLI

Usage:
  inkisle init [dir] [--full]
  inkisle new post "Post title" [--lang en] [--slug custom-slug] [--published]
  inkisle new page "Page title" [--lang en] [--slug about]
  inkisle dev
  inkisle build
  inkisle check
  inkisle check links [--dist dist] [--base /base]
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
    await initProject(args.slice(1));
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

  if (command === "check") {
    await checkSite(args.slice(1));
    return;
  }

  throw new Error(`Unknown command: ${command}\n\n${help.trim()}`);
}

async function initProject(targetDir) {
  const { positional, options } = parseArgs(targetDir);
  const targetName = positional[0] || "inkisle-site";
  const target = path.resolve(process.cwd(), targetName);
  const starterRoot = options.full ? fullStarterRoot : contentOnlyStarterRoot;

  if (!existsSync(starterRoot)) {
    throw new Error(`Starter not found: ${starterRoot}`);
  }

  if (existsSync(target)) {
    const existing = await fs.readdir(target);
    if (existing.length > 0) {
      throw new Error(`Target directory is not empty: ${target}`);
    }
  }

  await fs.mkdir(target, { recursive: true });

  const starterEntries = await fs.readdir(starterRoot);
  for (const item of starterEntries) {
    if (shouldIgnore(item)) {
      continue;
    }

    const targetItem = item === "gitignore" ? ".gitignore" : item;
    await copyPath(path.join(starterRoot, item), path.join(target, targetItem));
  }

  const packageJsonPath = path.join(target, "package.json");
  if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
    packageJson.name = path.basename(target);
    packageJson.private = true;
    if (!options.full && packageJson.dependencies?.inkisle && !isInstalledPackage()) {
      packageJson.dependencies.inkisle = `file:${packageRoot}`;
    }
    await fs.writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  }

  console.log(`Created InkIsle ${options.full ? "full project" : "content site"} at ${target}`);
  console.log(`Next: cd ${targetName} && npm install && npm run dev`);
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
          `published: ${options.published ? "true" : "false"}`,
          "---",
          ""
        ]
      : ["---", `title: "${escapeYaml(title)}"`, 'summary: ""', "---", ""];

  await fs.writeFile(filePath, `${frontmatter.join("\n")}\n`);
  console.log(`Created ${filePath}`);
}

async function runAstro(script, extraArgs) {
  const siteRoot = process.cwd();
  const fullProject = isFullProjectRoot(siteRoot);
  const astroBin = getAstroBin();
  const userSiteConfig = await loadUserSiteConfig(siteRoot);
  const renderWorkDir = path.join(fullStarterRoot, ".inkisle-build", path.basename(siteRoot));
  const renderOutDir = !fullProject && script === "build" ? path.join(renderWorkDir, "dist") : undefined;
  const renderCacheDir = fullProject ? undefined : path.join(renderWorkDir, ".astro");

  if (renderOutDir) {
    await fs.rm(renderWorkDir, { recursive: true, force: true });
  }

  await new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      INKISLE_SITE_ROOT: siteRoot,
      INKISLE_SITE_CONFIG: JSON.stringify(userSiteConfig),
      ...(renderOutDir ? { INKISLE_RENDER_OUT_DIR: renderOutDir } : {}),
      ...(renderCacheDir ? { INKISLE_RENDER_CACHE_DIR: renderCacheDir } : {})
    };
    const astroArgs = [
      script,
      "--root",
      fullProject ? siteRoot : fullStarterRoot,
      ...(fullProject
        ? []
        : ["--config", "astro.config.mjs"]),
      ...extraArgs
    ];
    const child = spawn(astroBin, astroArgs, {
      cwd: fullProject ? siteRoot : fullStarterRoot,
      env,
      stdio: "inherit",
      shell: process.platform === "win32"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`inkisle ${script} exited with code ${code}`));
      }
    });
  });

  if (script === "build" && renderOutDir) {
    await copyBuildOutput(renderOutDir, path.join(siteRoot, "dist"));
    await fs.rm(renderWorkDir, { recursive: true, force: true });
    await removeEmptyDirectory(path.dirname(renderWorkDir));
  }
}

async function checkSite(input) {
  const subcommand = input[0];

  if (!subcommand) {
    await runAstro("build", []);
    const userSiteConfig = await loadUserSiteConfig(process.cwd());
    await checkInternalLinks({
      distDir: path.join(process.cwd(), "dist"),
      base: userSiteConfig.base
    });
    return;
  }

  if (subcommand === "links") {
    const { options } = parseArgs(input.slice(1));
    const userSiteConfig = await loadUserSiteConfig(process.cwd());
    await checkInternalLinks({
      distDir: path.resolve(process.cwd(), options.dist || "dist"),
      base: options.base ?? userSiteConfig.base
    });
    return;
  }

  throw new Error("Use `inkisle check` or `inkisle check links [--dist dist] [--base /base]`.");
}

async function checkInternalLinks({ distDir, base = "/" }) {
  const htmlFiles = await listFiles(distDir, (file) => file.endsWith(".html")).catch(() => {
    throw new Error(`Missing dist directory: ${distDir}. Run \`inkisle build\` before \`inkisle check links\`.`);
  });
  const normalizedBase = normalizeBasePath(base);
  const localOrigin = "https://inkisle.local";
  const maxReportedFailures = 80;
  const existsCache = new Map();
  const failures = [];
  let checkedLinks = 0;

  for (const sourceFile of htmlFiles) {
    const html = await fs.readFile(sourceFile, "utf8");
    const staticHtml = maskScriptAndStyleBlocks(html);

    for (const link of extractAnchorHrefs(staticHtml)) {
      const targetUrl = toInternalUrl(link.href, sourceFile, distDir, localOrigin);
      if (!targetUrl) {
        continue;
      }

      checkedLinks += 1;

      const resolvedTarget = await resolveDistTarget(targetUrl.pathname, distDir, existsCache, normalizedBase);
      if (!resolvedTarget) {
        failures.push({
          sourceFile,
          line: lineNumberAt(html, link.index),
          href: link.href,
          pathname: safeDecodeURIComponent(targetUrl.pathname)
        });
      }
    }
  }

  if (failures.length > 0) {
    console.error(`Found ${failures.length} broken internal link(s):`);

    for (const failure of failures.slice(0, maxReportedFailures)) {
      console.error(
        `- ${formatRelative(process.cwd(), failure.sourceFile)}:${failure.line} ${failure.href} -> ${failure.pathname}`
      );
    }

    if (failures.length > maxReportedFailures) {
      console.error(`...and ${failures.length - maxReportedFailures} more.`);
    }

    throw new Error("Internal link check failed.");
  }

  console.log(`Checked ${checkedLinks} internal link(s) across ${htmlFiles.length} HTML file(s). No broken links found.`);
}

async function listFiles(root, predicate) {
  const files = [];
  const entries = await fs.readdir(root, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(absolutePath, predicate));
      continue;
    }

    if (entry.isFile() && predicate(absolutePath)) {
      files.push(absolutePath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

function extractAnchorHrefs(html) {
  const links = [];
  const anchorPattern = /<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;

  for (const match of html.matchAll(anchorPattern)) {
    links.push({
      href: match[1] ?? match[2] ?? match[3] ?? "",
      index: match.index ?? 0
    });
  }

  return links;
}

function maskScriptAndStyleBlocks(html) {
  return html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, (block) => block.replace(/[^\n]/g, " "));
}

function toInternalUrl(rawHref, sourceFile, distDir, localOrigin) {
  const href = rawHref.trim();
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("?") ||
    href.startsWith("//") ||
    /^[a-z][a-z0-9+.-]*:/i.test(href)
  ) {
    return undefined;
  }

  try {
    const sourcePath = `/${formatRelative(distDir, sourceFile)}`;
    return new URL(href, new URL(sourcePath, localOrigin));
  } catch {
    return undefined;
  }
}

async function resolveDistTarget(pathname, distDir, existsCache, base = "/") {
  const decodedPathname = safeDecodeURIComponent(pathname);
  const routePathname = stripBasePath(decodedPathname, base);
  if (routePathname === undefined) {
    return undefined;
  }

  const trimmedPathname = routePathname.replace(/^\/+/, "");
  const relativeCandidates = trimmedPathname
    ? decodedPathname.endsWith("/")
      ? [path.join(trimmedPathname, "index.html")]
      : [trimmedPathname, path.join(trimmedPathname, "index.html")]
    : ["index.html"];

  for (const relativeCandidate of relativeCandidates) {
    const absoluteCandidate = path.resolve(distDir, relativeCandidate);
    if (!isInside(distDir, absoluteCandidate)) {
      continue;
    }

    if (await fileExists(absoluteCandidate, existsCache)) {
      return absoluteCandidate;
    }
  }

  return undefined;
}

function normalizeBasePath(value) {
  if (!value || typeof value !== "string") {
    return "/";
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

function stripBasePath(pathname, base) {
  if (base === "/") {
    return pathname;
  }

  if (pathname === base) {
    return "/";
  }

  if (pathname.startsWith(`${base}/`)) {
    return pathname.slice(base.length) || "/";
  }

  return undefined;
}

async function fileExists(file, existsCache) {
  if (!existsCache.has(file)) {
    existsCache.set(
      file,
      fs.stat(file).then(
        (stat) => stat.isFile(),
        () => false
      )
    );
  }

  return existsCache.get(file);
}

function lineNumberAt(text, index) {
  return text.slice(0, index).split("\n").length;
}

function formatRelative(root, file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isInside(parent, child) {
  const relativePath = path.relative(parent, child);
  return !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

function isFullProjectRoot(siteRoot) {
  return (
    existsSync(path.join(siteRoot, "astro.config.mjs")) &&
    existsSync(path.join(siteRoot, "src", "pages"))
  );
}

function getAstroBin() {
  const command = process.platform === "win32" ? "astro.cmd" : "astro";
  const localBin = path.join(packageRoot, "node_modules", ".bin", command);

  return existsSync(localBin) ? localBin : "astro";
}

function isInstalledPackage() {
  return path.basename(path.dirname(packageRoot)) === "node_modules";
}

function loadUserSiteConfig(siteRoot) {
  const configPath = findSiteConfig(siteRoot);

  if (!configPath) {
    return {};
  }

  return import(pathToFileURL(configPath).href).then((module) => module.default ?? {});
}

function findSiteConfig(siteRoot) {
  const configFiles = [
    "inkisle.config.mjs",
    "inkisle.config.js"
  ];

  return configFiles
    .map((file) => path.join(siteRoot, file))
    .find((file) => existsSync(file));
}

async function copyBuildOutput(source, target) {
  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.cp(source, target, { recursive: true, force: true });
}

async function removeEmptyDirectory(directory) {
  try {
    await fs.rmdir(directory);
  } catch (error) {
    if (error?.code !== "ENOENT" && error?.code !== "ENOTEMPTY") {
      throw error;
    }
  }
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
  return [".git", ".gitignore", "node_modules", "dist", ".astro", ".inkisle-build", "package-lock.json"].includes(name);
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

    if (value === "--full") {
      options.full = true;
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
