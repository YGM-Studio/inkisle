#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const versionSpec = process.argv[2] || "patch";
const root = process.cwd();
const allowedSpecs = new Set([
  "major",
  "minor",
  "patch",
  "premajor",
  "preminor",
  "prepatch",
  "prerelease"
]);

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

function main() {
  ensureGitRepository();
  ensureCleanWorkingTree();
  ensureKnownVersionSpec(versionSpec);

  const branch = git(["branch", "--show-current"]).trim();
  if (!branch) {
    throw new Error("Release must run from a named branch, not a detached HEAD.");
  }

  run("git", ["fetch", "--tags", "origin"]);
  run("npm", ["version", versionSpec, "--no-git-tag-version"]);

  const version = readJson("package.json").version;
  const tag = `v${version}`;
  ensureTagDoesNotExist(tag);
  updateStarterDependency(version);

  run("npm", ["run", "ci"]);
  run("npm", ["pack", "--dry-run", "--registry=https://registry.npmjs.org/"]);

  run("git", ["add", "package.json", "package-lock.json", "starters/content-only/package.json"]);
  run("git", ["commit", "-m", `chore: release ${tag}`]);
  run("git", ["tag", "-a", tag, "-m", tag]);
  run("git", ["push", "origin", branch]);
  run("git", ["push", "origin", tag]);

  console.log(`Released ${tag}. GitHub Actions will publish the npm package from the tag.`);
}

function ensureGitRepository() {
  git(["rev-parse", "--is-inside-work-tree"]);
}

function ensureCleanWorkingTree() {
  const status = git(["status", "--porcelain"]);

  if (status.trim()) {
    throw new Error("Working tree is not clean. Commit or stash changes before running release.");
  }
}

function ensureKnownVersionSpec(spec) {
  if (allowedSpecs.has(spec) || /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(spec)) {
    return;
  }

  throw new Error(`Unsupported version spec "${spec}". Use patch, minor, major, prerelease, or an exact version.`);
}

function ensureTagDoesNotExist(tag) {
  const localTag = spawnSync("git", ["rev-parse", "-q", "--verify", `refs/tags/${tag}`], {
    cwd: root,
    encoding: "utf8"
  });

  if (localTag.status === 0) {
    throw new Error(`Tag already exists locally: ${tag}`);
  }

  const remoteTag = git(["ls-remote", "--tags", "origin", tag]).trim();
  if (remoteTag) {
    throw new Error(`Tag already exists on origin: ${tag}`);
  }
}

function updateStarterDependency(version) {
  const starterPackagePath = path.join(root, "starters", "content-only", "package.json");
  const starterPackage = readJson(starterPackagePath);

  starterPackage.dependencies = starterPackage.dependencies || {};
  starterPackage.dependencies.inkisle = `^${version}`;
  writeJson(starterPackagePath, starterPackage);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(root, filePath), "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(path.resolve(root, filePath), `${JSON.stringify(value, null, 2)}\n`);
}

function git(args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `git ${args.join(" ")} failed`).trim());
  }

  return result.stdout;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with code ${result.status}`);
  }
}
