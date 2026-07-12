---
title: "Quick Start"
date: 2026-05-17
updated: 2026-05-17
summary: "Create a Markdown-first InkIsle content site with a few commands."
tags:
  - Quick Start
  - CLI
category: "Guide"
published: true
interactionId: "quick-start"
---

The default InkIsle project is content-only. You maintain `content/`, optional `public/`, and optional `inkisle.config.mjs`; the renderer and Astro internals stay inside the InkIsle package.

## Create a site

```bash
npm exec inkisle -- init my-site
cd my-site
npm install
npm run dev
```

## Write content

```bash
npm exec inkisle -- new post "First post"
npm exec inkisle -- new page "About"
```

Default-language content lives in `content/posts/` and `content/pages/`. English translations can live in `content/en/posts/` and `content/en/pages/`.

## Check before publishing

```bash
npm run build
npm run check
npm run check:links
```

These commands build the static site, run Astro diagnostics, and check generated internal links.
