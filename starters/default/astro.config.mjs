import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { existsSync } from "node:fs";
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
  integrations: [sitemap({ filter: shouldIncludeInSitemap })],
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
