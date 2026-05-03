import type { BuiltInThemeName, InkIsleTheme } from "./types";

const builtInThemeNames = new Set<string>(["personal", "business-blog"]);

const themeLoaders: Record<BuiltInThemeName, () => Promise<InkIsleTheme>> = {
  personal: async () => (await import("./personal/theme")).personalTheme,
  "business-blog": async () => (await import("./business-blog/theme")).businessBlogTheme
};

export async function getActiveTheme(name?: string): Promise<InkIsleTheme> {
  if (!isBuiltInThemeName(name)) {
    return themeLoaders.personal();
  }

  return themeLoaders[name]();
}

export function isBuiltInThemeName(name: unknown): name is BuiltInThemeName {
  return typeof name === "string" && builtInThemeNames.has(name);
}
