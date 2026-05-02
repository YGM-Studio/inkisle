import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import {
  getLocaleBase,
  isKnownLocale,
  joinUrl,
  siteConfig
} from "../config";

const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
});

export type ContentKind = "post" | "page";

export type ContentEntry = {
  kind: ContentKind;
  locale: string;
  slug: string;
  title: string;
  date?: string;
  updated?: string;
  summary?: string;
  excerpt: string;
  tags: string[];
  category?: string;
  draft: boolean;
  body: string;
  html: string;
  text: string;
  url: string;
  sourcePath: string;
};

type ContentStore = {
  posts: ContentEntry[];
  pages: ContentEntry[];
  all: ContentEntry[];
};

type Frontmatter = {
  title?: unknown;
  date?: unknown;
  updated?: unknown;
  summary?: unknown;
  tags?: unknown;
  category?: unknown;
  categories?: unknown;
  draft?: unknown;
  slug?: unknown;
};

let contentCache: Promise<ContentStore> | undefined;

export async function getContentStore() {
  if (!contentCache) {
    contentCache = loadContent();
  }

  return contentCache;
}

export async function getPosts(locale?: string) {
  const store = await getContentStore();
  return locale ? store.posts.filter((post) => post.locale === locale) : store.posts;
}

export async function getPages(locale?: string) {
  const store = await getContentStore();
  return locale ? store.pages.filter((page) => page.locale === locale) : store.pages;
}

export async function getPostBySlug(locale: string, slug: string) {
  const posts = await getPosts(locale);
  return posts.find((post) => post.slug === slug);
}

export async function getPageBySlug(locale: string, slug: string) {
  const pages = await getPages(locale);
  return pages.find((page) => page.slug === slug);
}

export async function getTagIndex(locale: string) {
  const posts = await getPosts(locale);
  const tags = new Map<string, { name: string; posts: ContentEntry[] }>();

  for (const post of posts) {
    for (const tag of post.tags) {
      const slug = tagToSlug(tag);
      const current = tags.get(slug) ?? { name: tag, posts: [] };
      current.posts.push(post);
      tags.set(slug, current);
    }
  }

  return Array.from(tags.entries())
    .map(([slug, tag]) => ({
      name: tag.name,
      slug,
      posts: tag.posts
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCategoryIndex(locale: string) {
  const posts = await getPosts(locale);
  const categories = new Map<string, { name: string; posts: ContentEntry[] }>();

  for (const post of posts) {
    if (!post.category) {
      continue;
    }

    const slug = taxonomyToSlug(post.category);
    const current = categories.get(slug) ?? { name: post.category, posts: [] };
    current.posts.push(post);
    categories.set(slug, current);
  }

  return Array.from(categories.entries())
    .map(([slug, category]) => ({
      name: category.name,
      slug,
      posts: category.posts
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function postUrl(locale: string, slug: string) {
  return withTrailingSlash(joinUrl(getLocaleBase(locale), "posts", slug));
}

export function pageUrl(locale: string, slug: string) {
  return withTrailingSlash(joinUrl(getLocaleBase(locale), "pages", slug));
}

export function tagUrl(locale: string, tag: string) {
  return withTrailingSlash(joinUrl(getLocaleBase(locale), "tags", taxonomyToSlug(tag)));
}

export function categoryUrl(locale: string, category: string) {
  return withTrailingSlash(joinUrl(getLocaleBase(locale), "categories", taxonomyToSlug(category)));
}

export function tagToSlug(tag: string) {
  return taxonomyToSlug(tag);
}

function taxonomyToSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export function formatDate(date?: string, locale = siteConfig.defaultLocale) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(date));
}

function includeDrafts() {
  return import.meta.env.DEV || process.env.INKISLE_INCLUDE_DRAFTS === "true";
}

function withTrailingSlash(pathname: string) {
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

async function loadContent(): Promise<ContentStore> {
  const contentRoot = path.join(getSiteRoot(), "content");
  const files = await fg(["**/*.{md,markdown}"], {
    cwd: contentRoot,
    onlyFiles: true,
    dot: false
  }).catch(() => []);

  const entries = await Promise.all(
    files.map(async (relativePath) => {
      const parsedPath = parseContentPath(relativePath);
      if (!parsedPath) {
        return undefined;
      }

      const absolutePath = path.join(contentRoot, relativePath);
      const raw = await fs.readFile(absolutePath, "utf8");
      const parsed = matter(raw);
      return normalizeEntry(parsedPath, parsed.data as Frontmatter, parsed.content, absolutePath);
    })
  );

  const visibleEntries = entries
    .filter((entry): entry is ContentEntry => Boolean(entry))
    .filter((entry) => includeDrafts() || !entry.draft);

  const posts = visibleEntries
    .filter((entry) => entry.kind === "post")
    .sort((a, b) => sortByDateDesc(a, b));

  const pages = visibleEntries
    .filter((entry) => entry.kind === "page")
    .sort((a, b) => a.title.localeCompare(b.title));

  return {
    posts,
    pages,
    all: [...posts, ...pages]
  };
}

function getSiteRoot() {
  return process.env.INKISLE_SITE_ROOT || process.cwd();
}

function parseContentPath(relativePath: string) {
  const normalizedPath = relativePath.split(path.sep).join("/");
  const segments = normalizedPath.split("/");
  const first = segments[0];
  const second = segments[1];

  if (first === "posts" || first === "pages") {
    return {
      kind: first === "posts" ? "post" as const : "page" as const,
      locale: siteConfig.defaultLocale,
      pathSegments: segments.slice(1)
    };
  }

  if (isKnownLocale(first) && (second === "posts" || second === "pages")) {
    return {
      kind: second === "posts" ? "post" as const : "page" as const,
      locale: first,
      pathSegments: segments.slice(2)
    };
  }

  return undefined;
}

function normalizeEntry(
  parsedPath: { kind: ContentKind; locale: string; pathSegments: string[] },
  frontmatter: Frontmatter,
  body: string,
  sourcePath: string
): ContentEntry | undefined {
  const title = asString(frontmatter.title);
  if (!title) {
    return undefined;
  }

  const fileSlug = slugFromPath(parsedPath.pathSegments);
  const slug = asString(frontmatter.slug) || fileSlug;
  const summary = asString(frontmatter.summary);
  const bodyWithoutMoreMarker = removeMoreMarker(body);
  const excerpt = summary || summarize(excerptSource(body));
  const html = markdown.render(bodyWithoutMoreMarker);

  return {
    kind: parsedPath.kind,
    locale: parsedPath.locale,
    slug,
    title,
    date: asDateString(frontmatter.date),
    updated: asDateString(frontmatter.updated),
    summary,
    excerpt,
    tags: asStringArray(frontmatter.tags),
    category: asString(frontmatter.category) ?? asStringArray(frontmatter.categories)[0],
    draft: frontmatter.draft === true,
    body: bodyWithoutMoreMarker,
    html,
    text: toPlainText(html),
    url:
      parsedPath.kind === "post"
        ? postUrl(parsedPath.locale, slug)
        : pageUrl(parsedPath.locale, slug),
    sourcePath
  };
}

function slugFromPath(pathSegments: string[]) {
  const withoutExtension = pathSegments.join("/").replace(/\.(md|markdown)$/i, "");
  return withoutExtension.replace(/\/index$/i, "");
}

function sortByDateDesc(a: ContentEntry, b: ContentEntry) {
  const left = a.date ? new Date(a.date).getTime() : 0;
  const right = b.date ? new Date(b.date).getTime() : 0;
  return right - left || a.title.localeCompare(b.title);
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asStringArray(value: unknown) {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : undefined))
    .filter((item): item is string => Boolean(item));
}

function asDateString(value: unknown) {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
  }

  return undefined;
}

function summarize(markdownBody: string) {
  return markdownBody
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`[\]()!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function excerptSource(markdownBody: string) {
  const [beforeMore] = markdownBody.split(/<!--\s*more\s*-->/i);
  const excerpt = beforeMore?.trim();

  return excerpt || markdownBody;
}

function removeMoreMarker(markdownBody: string) {
  return markdownBody.replace(/<!--\s*more\s*-->/gi, "");
}

function toPlainText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
