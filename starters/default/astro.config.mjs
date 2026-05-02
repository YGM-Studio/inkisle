import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const site = process.env.SITE_URL || "https://inkisle.example";

export default defineConfig({
  site,
  output: "static",
  trailingSlash: "always",
  integrations: [sitemap()]
});

