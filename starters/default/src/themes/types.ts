import type { AstroComponentFactory } from "astro/runtime/server/index.js";

export type BuiltInThemeName = "personal" | "business-blog";

export type InkIsleTheme = {
  name: BuiltInThemeName;
  label: string;
  components: {
    HomePage: AstroComponentFactory;
    PostArchivePage: AstroComponentFactory;
    PostLayout: AstroComponentFactory;
    MarkdownPage: AstroComponentFactory;
    TaxonomyPage: AstroComponentFactory;
    SearchPage: AstroComponentFactory;
    NotFoundPage: AstroComponentFactory;
  };
};
