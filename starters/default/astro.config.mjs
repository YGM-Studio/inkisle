import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rendererRoot = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = process.env.INKISLE_SITE_ROOT
  ? path.resolve(process.env.INKISLE_SITE_ROOT)
  : rendererRoot;
const userPublicDir = path.join(siteRoot, "public");
const publicDir = existsSync(userPublicDir) ? userPublicDir : path.join(rendererRoot, "public");
const outDir = process.env.INKISLE_RENDER_OUT_DIR
  ? path.resolve(process.env.INKISLE_RENDER_OUT_DIR)
  : path.join(siteRoot, "dist");
const cacheDir = process.env.INKISLE_RENDER_CACHE_DIR
  ? path.resolve(process.env.INKISLE_RENDER_CACHE_DIR)
  : path.join(siteRoot, ".astro");
const siteConfig = parseSiteConfig(process.env.INKISLE_SITE_CONFIG);
const site = process.env.SITE_URL || siteConfig.site || "https://inkisle.example";
const base = normalizeBase(siteConfig.base);
const defaultLocale = siteConfig.defaultLocale || "zh";
const prefixDefaultLocale = siteConfig.prefixDefaultLocale ?? false;

export default defineConfig({
  root: rendererRoot,
  srcDir: path.join(rendererRoot, "src"),
  publicDir,
  outDir,
  cacheDir,
  site,
  base,
  output: "static",
  trailingSlash: "always",
  integrations: [sitemap({ filter: shouldIncludeInSitemap }), deploymentFilesIntegration(siteConfig)],
  vite: {
    server: {
      fs: {
        allow: [rendererRoot, siteRoot]
      }
    }
  }
});

function shouldIncludeInSitemap(page) {
  const pathname = stripBasePath(new URL(page).pathname, base);

  if (!prefixDefaultLocale) {
    return pathname !== `/${defaultLocale}/` && !pathname.startsWith(`/${defaultLocale}/`);
  }

  if (pathname === "/") {
    return false;
  }

  return !["/posts/", "/pages/", "/page/", "/search/", "/topics/", "/tags/", "/categories/"].some((pathPrefix) => {
    return pathname === pathPrefix || pathname.startsWith(pathPrefix);
  });
}

function parseSiteConfig(rawConfig) {
  if (!rawConfig) {
    return {};
  }

  try {
    return JSON.parse(rawConfig);
  } catch {
    return {};
  }
}

function normalizeBase(value) {
  if (!value || typeof value !== "string") {
    return "/";
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

function stripBasePath(pathname, normalizedBase) {
  if (normalizedBase === "/") {
    return pathname;
  }

  if (pathname === normalizedBase) {
    return "/";
  }

  if (pathname.startsWith(`${normalizedBase}/`)) {
    return pathname.slice(normalizedBase.length) || "/";
  }

  return pathname;
}

function deploymentFilesIntegration(config) {
  return {
    name: "inkisle-deployment-files",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const distDir = fileURLToPath(dir);
        await writeDeploymentFiles(distDir, config);
      }
    }
  };
}

async function writeDeploymentFiles(distDir, config) {
  const redirects = normalizeRedirects(config.redirects);
  if (redirects.length > 0) {
    await fs.writeFile(
      path.join(distDir, "_redirects"),
      `${redirects.map(formatRedirectRule).join("\n")}\n`
    );
  }

  await fs.writeFile(
    path.join(distDir, "_headers"),
    [
      "/manifest.json",
      "  Content-Type: application/manifest+json; charset=utf-8",
      "",
      "/manifest.webmanifest",
      "  Content-Type: application/manifest+json; charset=utf-8",
      "",
      "/sw.js",
      "  Cache-Control: no-cache",
      "  Content-Type: application/javascript; charset=utf-8",
      "",
      "/404.html",
      "  X-Robots-Tag: noindex",
      ""
    ].join("\n")
  );
}

function normalizeRedirects(rawRedirects) {
  if (!Array.isArray(rawRedirects)) {
    return [];
  }

  const seen = new Set();
  const redirects = [];

  for (const rule of rawRedirects) {
    if (!rule || typeof rule.from !== "string" || typeof rule.to !== "string") {
      continue;
    }

    const from = normalizeRedirectPath(rule.from);
    const to = normalizeRedirectTarget(rule.to);
    const status = normalizeRedirectStatus(rule.status);

    if (!from || !to) {
      continue;
    }

    if (seen.has(from)) {
      continue;
    }

    seen.add(from);
    redirects.push({ from, to, status });
  }

  return redirects;
}

function formatRedirectRule(rule) {
  return `${encodeRedirectPath(rule.from)} ${encodeRedirectTarget(rule.to)} ${rule.status}`;
}

function normalizeRedirectPath(value) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || /[\r\n\t]/.test(trimmed)) {
    return undefined;
  }

  return trimmed;
}

function normalizeRedirectTarget(value) {
  const trimmed = value.trim();
  if (!trimmed || /[\r\n\t]/.test(trimmed)) {
    return undefined;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

function normalizeRedirectStatus(value) {
  const status = Number(value ?? 301);
  return [301, 302, 303, 307, 308].includes(status) ? status : 301;
}

function encodeRedirectPath(value) {
  return encodeURI(value).replace(/%25([0-9A-Fa-f]{2})/g, "%$1");
}

function encodeRedirectTarget(value) {
  if (value.startsWith("/")) {
    return encodeRedirectPath(value);
  }

  try {
    const url = new URL(value);
    url.pathname = encodeRedirectPath(url.pathname);
    return url.toString();
  } catch {
    return value;
  }
}
