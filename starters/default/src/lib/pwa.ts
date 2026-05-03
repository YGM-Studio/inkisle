import { getSiteDescription, siteConfig } from "../config";

export function getWebManifest() {
  return {
    name: siteConfig.pwa.name || siteConfig.title,
    short_name: siteConfig.pwa.shortName || siteConfig.brand.mark || siteConfig.title,
    description: getSiteDescription(),
    start_url: "/",
    scope: "/",
    display: siteConfig.pwa.display,
    background_color: siteConfig.pwa.backgroundColor,
    theme_color: siteConfig.pwa.themeColor,
    icons: siteConfig.pwa.icons
  };
}
