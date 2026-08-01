import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";

const severityOrder = { error: 0, warning: 1, info: 2 };
const markdown = new MarkdownIt({ html: true, linkify: true });

export async function auditContent({
  siteRoot,
  config = {},
  staleDays = 730,
  checkExternal = false,
  externalTimeout = 8000,
  fetchImpl = globalThis.fetch,
  now = new Date()
}) {
  const contentRoot = path.join(siteRoot, "content");
  const files = await listMarkdownFiles(contentRoot).catch(() => []);
  const findings = [];
  const entries = [];
  const defaultLocale = config.defaultLocale || "zh";
  const configuredLocales = (config.locales || [])
    .map((locale) => typeof locale === "string" ? locale : locale?.code)
    .map((locale) => String(locale || "").trim())
    .filter(Boolean);
  const knownLocales = new Set(configuredLocales.length > 0
    ? [defaultLocale, ...configuredLocales]
    : [defaultLocale, "en"]);

  for (const file of files) {
    const relativeContentPath = toPosix(path.relative(contentRoot, file));
    const parsedPath = parseContentPath(relativeContentPath, defaultLocale, knownLocales);
    if (!parsedPath) continue;

    const sourcePath = toPosix(path.relative(siteRoot, file));
    const raw = await fs.readFile(file, "utf8");

    try {
      const parsed = matter(raw);
      entries.push(normalizeEntry(parsedPath, parsed.data, parsed.content, raw, sourcePath, config));
    } catch (error) {
      findings.push(finding(
        "error",
        "invalid-frontmatter",
        `Frontmatter could not be parsed: ${error instanceof Error ? error.message : error}`,
        sourcePath
      ));
    }
  }

  const publishedEntries = entries.filter((entry) => entry.published);
  const publishedPosts = publishedEntries.filter((entry) => entry.kind === "post");
  const publishedPages = publishedEntries.filter((entry) => entry.kind === "page");
  const routeEntries = new Map();
  const incomingLinks = new Map(publishedPosts.map((post) => [post.url, new Set()]));
  const validRedirects = new Set((config.redirects || []).map((redirect) => normalizePath(redirect?.from)));
  const topicIds = new Set((config.topics?.items || []).map((topic) => String(topic?.id || "").trim()).filter(Boolean));
  const tagCounts = new Map();
  const categoryCounts = new Map();
  const externalLinks = new Map();
  const cutoff = now.getTime() - Math.max(0, staleDays) * 24 * 60 * 60 * 1000;

  for (const entry of publishedEntries) {
    const existing = routeEntries.get(entry.url) || [];
    existing.push(entry);
    routeEntries.set(entry.url, existing);
  }

  for (const [url, matchingEntries] of routeEntries) {
    if (matchingEntries.length < 2) continue;
    for (const entry of matchingEntries) {
      findings.push(finding("error", "duplicate-route", `Multiple published files resolve to ${url}.`, entry.sourcePath));
    }
  }

  for (const post of publishedPosts) {
    if (!post.title) {
      findings.push(finding("error", "missing-title", "Published post has no title.", post.sourcePath));
    }
    if (!post.date) {
      findings.push(finding("warning", "missing-date", "Published post has no valid date.", post.sourcePath));
    }
    if (!post.summary) {
      findings.push(finding("warning", "missing-summary", "Published post has no summary.", post.sourcePath));
    }
    if (post.tags.length === 0) {
      findings.push(finding("info", "missing-tags", "Post has no tags.", post.sourcePath));
    }
    if (!post.category) {
      findings.push(finding("info", "missing-category", "Post has no category.", post.sourcePath));
    }
    if (post.topic && !topicIds.has(post.topic)) {
      findings.push(finding("warning", "unknown-topic", `Topic "${post.topic}" is not configured.`, post.sourcePath));
    }

    const lastReviewed = dateTimestamp(post.updated || post.date);
    if (lastReviewed && lastReviewed < cutoff) {
      findings.push(finding(
        "info",
        "stale-post",
        `Post has not been dated or updated in ${staleDays} days.`,
        post.sourcePath
      ));
    }

    for (const tag of post.tags) incrementTaxonomy(tagCounts, post.locale, tag, post.sourcePath);
    if (post.category) incrementTaxonomy(categoryCounts, post.locale, post.category, post.sourcePath);
  }

  for (const entry of publishedEntries) {
    for (const link of extractLinks(entry.body)) {
      const line = entry.bodyStartLine + link.line - 1;
      const externalUrl = toExternalUrl(link.href);
      if (externalUrl) {
        if (!externalLinks.has(externalUrl)) {
          externalLinks.set(externalUrl, { url: externalUrl, file: entry.sourcePath, line });
        }
        continue;
      }

      const targetPath = resolveInternalPath(link.href, entry.url, config.base);
      if (!targetPath) continue;

      const targets = routeEntries.get(targetPath);
      if (targets?.length) {
        for (const target of targets) {
          if (target.kind === "post" && target.url !== entry.url) {
            incomingLinks.get(target.url)?.add(entry.url);
          }
        }
        continue;
      }

      if (isContentRoute(targetPath) && !validRedirects.has(targetPath)) {
        findings.push(finding(
          "error",
          "broken-content-link",
          `Content link does not resolve: ${link.href}`,
          entry.sourcePath,
          line
        ));
      }
    }
  }

  for (const post of publishedPosts) {
    if ((incomingLinks.get(post.url)?.size || 0) === 0 && publishedPosts.length > 1) {
      findings.push(finding("warning", "orphan-post", "No other published post or page links to this post.", post.sourcePath));
    }
  }

  addSingletonFindings(findings, tagCounts, "singleton-tag", "Tag");
  addSingletonFindings(findings, categoryCounts, "singleton-category", "Category");

  if (checkExternal) {
    findings.push(...await checkExternalLinks([...externalLinks.values()], fetchImpl, externalTimeout));
  }

  findings.sort(compareFindings);
  const counts = countSeverities(findings);

  return {
    generatedAt: now.toISOString(),
    options: { staleDays, checkExternal },
    totals: {
      files: files.length,
      publishedPosts: publishedPosts.length,
      publishedPages: publishedPages.length,
      draftEntries: entries.length - publishedEntries.length,
      externalLinks: externalLinks.size,
      findings: findings.length,
      ...counts
    },
    findings
  };
}

export function formatAuditText(report) {
  const lines = [
    `Content audit: ${report.totals.publishedPosts} post(s), ${report.totals.publishedPages} page(s), ${report.totals.findings} finding(s).`,
    `Errors: ${report.totals.errors} | Warnings: ${report.totals.warnings} | Info: ${report.totals.info}`
  ];

  for (const item of report.findings) {
    const location = item.line ? `${item.file}:${item.line}` : item.file;
    lines.push(`${item.severity.toUpperCase()} [${item.code}] ${location} - ${item.message}`);
  }

  return lines.join("\n");
}

export function formatAuditMarkdown(report) {
  const lines = [
    "# Content audit",
    "",
    `Generated ${report.generatedAt}.`,
    "",
    "| Published posts | Published pages | Drafts | Errors | Warnings | Info |",
    "| ---: | ---: | ---: | ---: | ---: | ---: |",
    `| ${report.totals.publishedPosts} | ${report.totals.publishedPages} | ${report.totals.draftEntries} | ${report.totals.errors} | ${report.totals.warnings} | ${report.totals.info} |`
  ];

  for (const severity of ["error", "warning", "info"]) {
    const items = report.findings.filter((item) => item.severity === severity);
    if (items.length === 0) continue;
    lines.push("", `## ${capitalize(severity)} (${items.length})`, "");
    for (const item of items) {
      const location = item.line ? `${item.file}:${item.line}` : item.file;
      lines.push(`- \`${item.code}\` \`${location}\`: ${escapeMarkdown(item.message)}`);
    }
  }

  return lines.join("\n");
}

async function listMarkdownFiles(root) {
  const files = [];
  const entries = await fs.readdir(root, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listMarkdownFiles(absolutePath));
    } else if (entry.isFile() && /\.(md|markdown)$/i.test(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function parseContentPath(relativePath, defaultLocale, knownLocales) {
  const segments = relativePath.split("/");
  if (segments[0] === "posts" || segments[0] === "pages") {
    return { kind: segments[0] === "posts" ? "post" : "page", locale: defaultLocale, pathSegments: segments.slice(1) };
  }
  if (knownLocales.has(segments[0]) && (segments[1] === "posts" || segments[1] === "pages")) {
    return { kind: segments[1] === "posts" ? "post" : "page", locale: segments[0], pathSegments: segments.slice(2) };
  }
  return undefined;
}

function normalizeEntry(parsedPath, data, body, raw, sourcePath, config) {
  const fileSlug = parsedPath.pathSegments.join("/").replace(/\.(md|markdown)$/i, "").replace(/\/index$/i, "");
  const slug = cleanString(data.slug) || fileSlug;
  const localeBase = !config.prefixDefaultLocale && parsedPath.locale === (config.defaultLocale || "zh")
    ? ""
    : `/${parsedPath.locale}`;
  const route = normalizePath(`${localeBase}/${parsedPath.kind}s/${slug}`);

  return {
    kind: parsedPath.kind,
    locale: parsedPath.locale,
    title: cleanString(data.title),
    date: normalizeDate(data.date),
    updated: normalizeDate(data.updated),
    summary: cleanString(data.summary),
    tags: stringList(data.tags),
    category: cleanString(data.category) || stringList(data.categories)[0],
    topic: cleanString(data.topic),
    published: data.published !== false && data.draft !== true,
    url: route,
    sourcePath,
    body,
    bodyStartLine: lineNumberAt(raw, Math.max(0, raw.indexOf(body)))
  };
}

function extractLinks(markdownBody) {
  const links = [];
  const htmlPattern = /<a\b[^>]*?\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
  const tokens = markdown.parse(markdownBody, {});

  for (const token of tokens) {
    const startLine = (token.map?.[0] || 0) + 1;

    for (const child of token.children || []) {
      if (child.type === "link_open") {
        const href = child.attrGet("href");
        if (href) links.push({ href, line: startLine });
      }
      if (child.type === "html_inline") {
        extractHtmlLinks(child.content, startLine, htmlPattern, links);
      }
    }

    if (token.type === "html_block") {
      extractHtmlLinks(token.content, startLine, htmlPattern, links);
    }
  }

  return links;
}

function extractHtmlLinks(html, startLine, pattern, links) {
  pattern.lastIndex = 0;
  for (const match of html.matchAll(pattern)) {
    links.push({
      href: match[1] || match[2] || match[3] || "",
      line: startLine + lineNumberAt(html, match.index || 0) - 1
    });
  }
}

function resolveInternalPath(rawHref, sourcePath, base) {
  const href = String(rawHref || "").trim();
  if (!href || href.startsWith("#") || href.startsWith("?") || href.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(href)) {
    return undefined;
  }

  try {
    const resolved = new URL(href, new URL(sourcePath, "https://inkisle.local"));
    return stripBase(normalizePath(safeDecode(resolved.pathname)), base);
  } catch {
    return undefined;
  }
}

function toExternalUrl(rawHref) {
  const href = String(rawHref || "").trim();
  if (!/^https?:\/\//i.test(href)) return undefined;
  try {
    const url = new URL(href);
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

async function checkExternalLinks(links, fetchImpl, timeout) {
  if (typeof fetchImpl !== "function") return [];
  const findings = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(6, links.length) }, async () => {
    while (cursor < links.length) {
      const link = links[cursor++];
      const result = await checkExternalLink(link.url, fetchImpl, timeout);
      if (!result) continue;
      findings.push(finding(result.severity, result.code, result.message, link.file, link.line));
    }
  });
  await Promise.all(workers);
  return findings;
}

async function checkExternalLink(url, fetchImpl, timeout) {
  try {
    let response = await fetchImpl(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(timeout),
      headers: { "user-agent": "InkIsle content audit" }
    });
    if ([403, 405].includes(response.status)) {
      response = await fetchImpl(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(timeout),
        headers: { "user-agent": "InkIsle content audit", range: "bytes=0-0" }
      });
    }
    if (response.ok || (response.status >= 300 && response.status < 400)) return undefined;
    if ([401, 403].includes(response.status)) {
      return { severity: "info", code: "external-link-restricted", message: `External link blocks automated checks (${response.status}): ${url}` };
    }
    return { severity: "warning", code: "external-link-failed", message: `External link returned ${response.status}: ${url}` };
  } catch (error) {
    return {
      severity: "info",
      code: "external-link-unreachable",
      message: `External link could not be checked: ${url} (${error instanceof Error ? error.message : error})`
    };
  }
}

function incrementTaxonomy(counts, locale, value, sourcePath) {
  const normalized = String(value).trim().toLocaleLowerCase();
  const key = `${locale}:${normalized}`;
  const current = counts.get(key) || { locale, value: String(value).trim(), files: [] };
  current.files.push(sourcePath);
  counts.set(key, current);
}

function addSingletonFindings(findings, counts, code, label) {
  for (const item of counts.values()) {
    if (item.files.length !== 1) continue;
    findings.push(finding("info", code, `${label} "${item.value}" is used by only one ${item.locale} post.`, item.files[0]));
  }
}

function finding(severity, code, message, file, line) {
  return { severity, code, message, file, ...(line ? { line } : {}) };
}

function compareFindings(left, right) {
  return severityOrder[left.severity] - severityOrder[right.severity]
    || left.code.localeCompare(right.code)
    || left.file.localeCompare(right.file)
    || (left.line || 0) - (right.line || 0);
}

function countSeverities(findings) {
  return {
    errors: findings.filter((item) => item.severity === "error").length,
    warnings: findings.filter((item) => item.severity === "warning").length,
    info: findings.filter((item) => item.severity === "info").length
  };
}

function stringList(value) {
  if (Array.isArray(value)) return value.map(cleanString).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function cleanString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeDate(value) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

function dateTimestamp(value) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function normalizePath(value) {
  const pathname = String(value || "").trim().replace(/\/{2,}/g, "/");
  if (!pathname) return "/";
  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return withLeadingSlash === "/" || withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function stripBase(pathname, base) {
  const normalizedBase = normalizePath(base || "/").replace(/\/$/, "") || "/";
  if (normalizedBase === "/") return pathname;
  if (pathname === `${normalizedBase}/`) return "/";
  if (pathname.startsWith(`${normalizedBase}/`)) return normalizePath(pathname.slice(normalizedBase.length));
  return pathname;
}

function isContentRoute(pathname) {
  return /\/(?:[^/]+\/)?(?:posts|pages)\//.test(pathname);
}

function lineNumberAt(text, index) {
  return text.slice(0, index).split("\n").length;
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function escapeMarkdown(value) {
  return String(value).replace(/([\\`*_{}[\]()#+.!|>-])/g, "\\$1");
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}
