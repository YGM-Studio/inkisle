export default {
  title: "墨屿 / InkIsle",
  description: {
    zh: "AI 原生的 Markdown 发布系统，用 Astro 生成快速、可搜索、对机器友好的静态内容站。",
    en: "AI-native Markdown publishing powered by Astro for fast, searchable, machine-friendly static sites."
  },
  site: "https://ygm-studio.github.io",
  base: "/inkisle",
  brand: {
    mark: "Ink",
    subtitle: "Markdown publishing system",
    favicon: "/favicon.svg"
  },
  defaultLocale: "zh",
  locales: [
    { code: "zh", label: "中文" },
    { code: "en", label: "English" }
  ],
  author: {
    name: "YGM Studio",
    url: "https://github.com/YGM-Studio"
  },
  interactions: {
    provider: "giscus",
    localeScope: "shared",
    giscus: {
      repo: "YGM-Studio/inkisle",
      repoId: "R_kgDOSSLLLg",
      category: "InkIsle Blog",
      categoryId: "DIC_kwDOSSLLLs4DBBG_"
    }
  },
  theme: {
    name: "business-blog",
    defaultMode: "system",
    allowUserToggle: true,
    storageKey: "inkisle-docs-theme"
  },
  pagination: {
    postsPerPage: 6
  },
  pwa: {
    name: "InkIsle",
    shortName: "InkIsle",
    themeColor: "#163b36",
    backgroundColor: "#f5f0e4"
  }
};
