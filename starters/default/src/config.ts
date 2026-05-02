export type LocaleConfig = {
  code: string;
  label: string;
};

export type ThemeMode = "system" | "light" | "dark";

type DeepPartial<T> = {
  [Property in keyof T]?: T[Property] extends Array<unknown>
    ? T[Property]
    : T[Property] extends Record<string, unknown>
      ? DeepPartial<T[Property]>
      : T[Property];
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
  theme: {
    defaultMode: ThemeMode;
    allowUserToggle: boolean;
    storageKey: string;
  };
};

const defaultSiteConfig: InkIsleConfig = {
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
  },
  theme: {
    defaultMode: "system",
    allowUserToggle: true,
    storageKey: "inkisle-theme"
  }
};

export const siteConfig: InkIsleConfig = mergeConfig(defaultSiteConfig, loadSiteConfigFromEnv());

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

function loadSiteConfigFromEnv(): DeepPartial<InkIsleConfig> {
  const rawConfig = process.env.INKISLE_SITE_CONFIG;

  if (!rawConfig) {
    return {};
  }

  try {
    return JSON.parse(rawConfig) as DeepPartial<InkIsleConfig>;
  } catch {
    return {};
  }
}

function mergeConfig<T extends Record<string, unknown>>(base: T, override: DeepPartial<T>): T {
  const next = { ...base };

  for (const key of Object.keys(override) as Array<keyof T>) {
    const value = override[key];

    if (value === undefined) {
      continue;
    }

    if (isRecord(base[key]) && isRecord(value) && !Array.isArray(value)) {
      next[key] = mergeConfig(base[key], value as DeepPartial<Record<string, unknown>>) as T[keyof T];
      continue;
    }

    next[key] = value as T[keyof T];
  }

  return next;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
