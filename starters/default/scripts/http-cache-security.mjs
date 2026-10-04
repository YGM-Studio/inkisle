import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const advisory = "https://github.com/advisories/GHSA-ch52-4w7c-c8xp";
export const vulnerableHash = "01b7d66c854b2fe53ac05c98feb6e0d64722ab8898a778e2d2426a8b468d178f";
export const patchedHash = "7e9f2231d0a955704a70a434c6e8bdfbc6e5a9b5cc68238aba0c1546b51e191f";
const replacement = new URL("./http-cache-semantics-4.2.0.cjs", import.meta.url);
const require = createRequire(import.meta.url);

export function resolveAstroEntrypoint() {
  const metadataPath = require.resolve("astro/package.json");
  const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
  const executable = typeof metadata.bin === "string" ? metadata.bin : metadata.bin?.astro;
  if (!executable) throw new Error("Astro does not declare a CLI entrypoint.");
  return path.resolve(path.dirname(metadataPath), executable);
}

export function resolveCachePackage() {
  const astroRequire = createRequire(require.resolve("astro/package.json"));
  return path.dirname(astroRequire.resolve("http-cache-semantics"));
}

function hash(source) {
  return createHash("sha256").update(source).digest("hex");
}

async function inspectCache(packageDir) {
  const metadata = JSON.parse(await fs.readFile(path.join(packageDir, "package.json"), "utf8"));
  if (metadata.name !== "http-cache-semantics" || metadata.version !== "4.2.0") {
    throw new Error("The HTTP cache dependency changed. Review the upstream fix and remove or update the InkIsle backport before building.");
  }
  const entryPoint = path.join(packageDir, "index.js");
  const digest = hash(await fs.readFile(entryPoint));
  return { packageDir, entryPoint, digest, version: metadata.version };
}

export async function verifyPatchedCache(packageDir = resolveCachePackage()) {
  const cache = await inspectCache(packageDir);
  if (cache.digest !== patchedHash) {
    throw new Error(`The HTTP cache security backport is missing or changed: ${packageDir}. Run npm install, then retry.`);
  }
  return cache;
}

export async function applyCachePatch(packageDir = resolveCachePackage()) {
  const cache = await inspectCache(packageDir);
  if (cache.digest === patchedHash) return { ...cache, applied: false };
  if (cache.digest !== vulnerableHash) {
    throw new Error(`Unrecognized HTTP cache source: ${packageDir}. Review it before applying the InkIsle backport.`);
  }
  const source = await fs.readFile(replacement);
  if (hash(source) !== patchedHash) throw new Error("The bundled HTTP cache backport was modified.");

  // Replace the directory entry, preserving the original mode and leaving any
  // package-manager store hardlinks unchanged. Concurrent installs are safe.
  const { mode } = await fs.stat(cache.entryPoint);
  const temporary = `${cache.entryPoint}.inkisle-${randomUUID()}`;
  try {
    await fs.writeFile(temporary, source, { mode });
    await fs.rename(temporary, cache.entryPoint);
  } finally {
    await fs.rm(temporary, { force: true });
  }
  return { ...(await verifyPatchedCache(packageDir)), applied: true };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const cache = process.argv.includes("--check") ? await verifyPatchedCache() : await applyCachePatch();
    if (cache.applied) console.log("Applied the InkIsle HTTP cache security backport (GHSA-ch52-4w7c-c8xp).");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
