export type LocaleConfig = {
  code: string;
  label: string;
};

export type ThemeMode = "system" | "light" | "dark";
export type LocalizedText = string | Record<string, string>;
export type LocalizedTextList = Array<LocalizedText> | Record<string, string[]>;

export type StaticFileConfig = {
  path: string;
  content: string;
  contentType?: string;
};

export type RedirectRuleConfig = {
  from: string;
  to: string;
  status?: 301 | 302 | 303 | 307 | 308;
};

export type WebManifestIconConfig = {
  src: string;
  sizes: string;
  type?: string;
  purpose?: string;
};

export type PwaConfig = {
  enabled: boolean;
  registerServiceWorker: boolean;
  manifestPath: string;
  serviceWorkerPath: string;
  name?: string;
  shortName?: string;
  display: "standalone" | "fullscreen" | "minimal-ui" | "browser";
  backgroundColor: string;
  themeColor: string;
  icons: WebManifestIconConfig[];
};

export type AnalyticsConfig = {
  baidu?: {
    id: string;
  };
};

type DeepPartial<T> = {
  [Property in keyof T]?: T[Property] extends Array<unknown>
    ? T[Property]
    : T[Property] extends Record<string, unknown>
      ? DeepPartial<T[Property]>
      : T[Property];
};

export type InkIsleConfig = {
  title: string;
  description: LocalizedText;
  home: {
    mottos: LocalizedTextList;
    typewriter: {
      enabled: boolean;
      typeSpeed: number;
      deleteSpeed: number;
      pauseDelay: number;
      nextDelay: number;
    };
  };
  site: string;
  base?: string;
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
  filing: {
    icp?: {
      number: string;
      url?: string;
    };
  };
  features: {
    rawMarkdown: boolean;
    perPostJson: boolean;
    pageContentUsesTheme: boolean;
  };
  analytics: AnalyticsConfig;
  verificationFiles: StaticFileConfig[];
  redirects: RedirectRuleConfig[];
  pwa: PwaConfig;
  pagination: {
    postsPerPage: number;
  };
  theme: {
    name: string;
    defaultMode: ThemeMode;
    allowUserToggle: boolean;
    storageKey: string;
  };
};

const defaultSiteConfig: InkIsleConfig = {
  title: "墨屿 / InkIsle",
  description: {
    zh: "为静态博客和内容站打造的 AI 友好 Markdown 发布系统。",
    en: "AI-native Markdown publishing system for static-first blogs and content sites."
  },
  home: {
    mottos: [],
    typewriter: {
      enabled: false,
      typeSpeed: 44,
      deleteSpeed: 24,
      pauseDelay: 1800,
      nextDelay: 320
    }
  },
  site: process.env.SITE_URL || "https://inkisle.example",
  base: "/",
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
  prefixDefaultLocale: false,
  author: {
    name: "InkIsle"
  },
  filing: {},
  features: {
    rawMarkdown: false,
    perPostJson: false,
    pageContentUsesTheme: true
  },
  analytics: {},
  verificationFiles: [],
  redirects: [],
  pwa: {
    enabled: false,
    registerServiceWorker: false,
    manifestPath: "/manifest.json",
    serviceWorkerPath: "/sw.js",
    display: "standalone",
    backgroundColor: "#f3efe2",
    themeColor: "#16251f",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  },
  pagination: {
    postsPerPage: 10
  },
  theme: {
    name: "personal",
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

export function getSiteDescription(locale = siteConfig.defaultLocale) {
  return resolveLocalizedText(siteConfig.description, locale);
}

export function getHomeMottos(locale = siteConfig.defaultLocale) {
  const mottos = resolveLocalizedTextList(siteConfig.home.mottos, locale);
  const description = getSiteDescription(locale);
  const normalized = [description, ...mottos]
    .map((motto) => motto.trim())
    .filter(Boolean);

  return Array.from(new Set(normalized));
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

export function shouldRedirectDefaultLocalePrefix(locale: string) {
  return !siteConfig.prefixDefaultLocale && locale === siteConfig.defaultLocale;
}

export function joinUrl(...parts: Array<string | undefined>) {
  const cleaned = parts
    .filter((part): part is string => Boolean(part))
    .map((part) => part.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);

  return `/${cleaned.join("/")}`;
}

export function sitePath(pathname = "/") {
  const trimmedPathname = pathname.trim();
  if (isExternalOrSpecialUrl(trimmedPathname)) {
    return trimmedPathname;
  }

  const base = normalizeBasePath(siteConfig.base);
  const path = normalizePathname(trimmedPathname);

  if (base === "/") {
    return path;
  }

  if (path === "/") {
    return `${base}/`;
  }

  return `${base}${path}`;
}

export function absoluteUrl(pathname: string) {
  return new URL(sitePath(pathname), siteConfig.site).toString();
}

function resolveLocalizedText(value: LocalizedText, locale: string) {
  if (typeof value === "string") {
    return value;
  }

  return value[locale] ?? value[siteConfig.defaultLocale] ?? Object.values(value).find(Boolean) ?? "";
}

function resolveLocalizedTextList(value: LocalizedTextList, locale: string) {
  if (Array.isArray(value)) {
    return value.map((item) => resolveLocalizedText(item, locale));
  }

  return value[locale] ?? value[siteConfig.defaultLocale] ?? Object.values(value).find((items) => items.length > 0) ?? [];
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

    if (!["description", "mottos"].includes(String(key)) && isRecord(base[key]) && isRecord(value) && !Array.isArray(value)) {
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

function normalizeBasePath(value: string | undefined) {
  if (!value) {
    return "/";
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

function normalizePathname(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "/";
  }

  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return path.replace(/\/{2,}/g, "/");
}

function isExternalOrSpecialUrl(value: string) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value);
}
