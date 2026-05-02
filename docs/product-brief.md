# Product Brief

## Background

The existing personal blog is powered by Hexo, but it no longer fits the desired publishing workflow:

- Build and rendering performance feel weaker than expected.
- Themes are hard to customize.
- Output formats are not flexible enough.
- AI-friendly publishing support is missing, including raw Markdown, structured JSON, `llms.txt`, and multilingual content.
- The same publishing system should eventually work for personal blogs, company sites, business content sites, and related personal products.

InkIsle should not rebuild a full SSG or SSR framework from scratch. It should use a mature rendering/build foundation and focus on the product layer: conventions, CLI, content model, default theme, and AI-friendly outputs.

## Product Positioning

InkIsle is an AI-native Markdown publishing system.

It is not just an Astro starter, and it is not a full CMS. It should be a small, opinionated publishing product layer with:

- A CLI for common workflows.
- A clear Markdown content structure.
- A default personal blog theme.
- A stable boundary between content, features, and themes.
- Static-first HTML output.
- AI-friendly public artifacts.
- Deployment templates that do not lock users into one cloud provider.

## Naming

The selected name is:

```text
Chinese: 墨屿
English: InkIsle
CLI/package candidate: inkisle
```

Meaning:

- `墨` points to writing, Markdown, text, and knowledge accumulation.
- `屿` continues the tone of “知屿 / Know Isle”.
- `InkIsle` is short, readable, and suitable for a publishing system.

The name still needs availability checks for npm, GitHub, domains, and possible trademark conflicts.

## Value Hypothesis

InkIsle is worth building if it creates value in these areas:

- Makes Markdown publishing simpler and cleaner than the current Hexo workflow.
- Keeps Markdown as the source of truth.
- Ships static HTML by default.
- Makes published content easier for AI agents and search engines to consume.
- Allows one content model to support personal blogs and business content sites.
- Wraps Astro/Vite into a product-like experience for users who do not want to understand every framework detail.

InkIsle is not worth continuing if:

- Existing Astro-native tools or starters already cover the core needs well enough.
- Maintaining CLI, themes, plugins, and compatibility costs more than the benefit.
- Migrating the personal blog does not create a meaningful experience improvement.
- AI-friendly outputs fail to create a real difference.

## MVP Scope

The first version should:

- Replace the current Hexo personal blog.
- Pre-render Markdown posts into HTML.
- Provide a usable default personal blog theme.
- Support static-first deployment.
- Provide a CLI for project initialization and content creation.
- Generate RSS, sitemap, static search index, JSON feed, and `llms.txt`.

The initial target is a single-site system. Multi-site and multi-tenant publishing are out of scope for the first phase.

## Default Features

V0 should support:

- Post list.
- Tag pages.
- Optional category pages.
- Markdown custom pages.
- Astro/HTML custom pages, with higher priority than Markdown pages.
- RSS.
- Sitemap.
- Static search.
- Full-site JSON feed.
- Simple `llms.txt` index.
- i18n routing.
- Comment mount slot.
- Default personal blog theme.

Configurable but not default:

- Raw Markdown output.
- Per-post JSON output.
- Whether page-like content participates in the theme system.

Later:

- `llms-full.txt`.
- AI translation command.
- Server-side search.
- SSR pages.
- Login state.
- Built-in comment providers.
- Theme component override.
- Theme marketplace.

## First Route

1. Build a minimal Astro-based prototype.
2. Use the current Hexo personal blog migration as the real validation case.
3. Create the default personal blog theme.
4. Add RSS, sitemap, search, JSON feed, and `llms.txt`.
5. Add CLI initialization and content creation commands.
6. Revisit theme API, plugin API, and component override after the first migration.

