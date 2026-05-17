import { getSiteDescription, siteConfig, sitePath } from "../config";

export function getWebManifest() {
  return {
    name: siteConfig.pwa.name || siteConfig.title,
    short_name: siteConfig.pwa.shortName || siteConfig.brand.mark || siteConfig.title,
    description: getSiteDescription(),
    start_url: sitePath("/"),
    scope: sitePath("/"),
    display: siteConfig.pwa.display,
    background_color: siteConfig.pwa.backgroundColor,
    theme_color: siteConfig.pwa.themeColor,
    icons: siteConfig.pwa.icons.map((icon) => ({
      ...icon,
      src: sitePath(icon.src)
    }))
  };
}
