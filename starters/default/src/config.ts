export type LocaleConfig = {
  code: string;
  label: string;
};

export type InkIsleConfig = {
  title: string;
  description: string;
  site: string;
  brand: {
    mark: string;
    subtitle?: string;
    favicon: string;
  };
  defaultLocale: string;
  locales: LocaleConfig[];
  prefixDefaultLocale: boolean;
  author: {
    name: string;
    url?: string;
  };
  features: {
    rawMarkdown: boolean;
    perPostJson: boolean;
    pageContentUsesTheme: boolean;
  };
  pagination: {
    postsPerPage: number;
  };
};

export const siteConfig: InkIsleConfig = {
  title: "墨屿 / InkIsle",
  description: "AI-native Markdown publishing system for static-first blogs and content sites.",
  site: process.env.SITE_URL || "https://inkisle.example",
  brand: {
    mark: "Ink",
    subtitle: "InkIsle Starter",
    favicon: "/favicon.svg"
  },
  defaultLocale: "zh",
  locales: [
    { code: "zh", label: "中文" },
    { code: "en", label: "English" }
  ],
  prefixDefaultLocale: true,
  author: {
    name: "InkIsle"
  },
  features: {
    rawMarkdown: false,
    perPostJson: false,
    pageContentUsesTheme: true
  },
  pagination: {
    postsPerPage: 10
  }
};

export function getLocaleCodes() {
  return siteConfig.locales.map((locale) => locale.code);
}

export function getLocaleLabel(code: string) {
  return siteConfig.locales.find((locale) => locale.code === code)?.label ?? code;
}

export function isKnownLocale(code: string) {
  return getLocaleCodes().includes(code);
}

export function getLocaleBase(locale: string) {
  if (!siteConfig.prefixDefaultLocale && locale === siteConfig.defaultLocale) {
    return "";
  }

  return `/${locale}`;
}

export function joinUrl(...parts: Array<string | undefined>) {
  const cleaned = parts
    .filter((part): part is string => Boolean(part))
    .map((part) => part.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);

  return `/${cleaned.join("/")}`;
}

export function absoluteUrl(pathname: string) {
  return new URL(pathname, siteConfig.site).toString();
}
