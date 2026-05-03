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
const defaultLocale = siteConfig.defaultLocale || "zh";
const prefixDefaultLocale = siteConfig.prefixDefaultLocale ?? false;

export default defineConfig({
  root: rendererRoot,
  srcDir: path.join(rendererRoot, "src"),
  publicDir,
  outDir,
  cacheDir,
  site,
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
  const pathname = new URL(page).pathname;

  if (!prefixDefaultLocale) {
    return pathname !== `/${defaultLocale}/` && !pathname.startsWith(`/${defaultLocale}/`);
  }

  if (pathname === "/") {
    return false;
  }

  return !["/posts/", "/pages/", "/page/", "/search/", "/tags/", "/categories/"].some((pathPrefix) => {
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
      `${redirects.map((rule) => `${rule.from} ${rule.to} ${rule.status}`).join("\n")}\n`
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

  return rawRedirects.filter((rule) => {
    return (
      rule &&
      typeof rule.from === "string" &&
      rule.from.startsWith("/") &&
      typeof rule.to === "string" &&
      rule.to.startsWith("/") &&
      [301, 302, 307, 308].includes(Number(rule.status))
    );
  });
}
