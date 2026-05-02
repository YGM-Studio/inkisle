# 墨屿 / InkIsle

InkIsle is an AI-native Markdown publishing system.

It is designed as a static-first blog and content publishing product layer on top of Astro and Vite. The goal is not to rebuild a full web framework, but to provide a clean content model, CLI workflow, theme boundary, and AI-friendly outputs for personal blogs, business content sites, documentation sites, and future publishing scenarios.

## Status

InkIsle now has a minimal Astro-based renderer and starter. The product direction is content-first: default user projects should be lightweight Node projects with Markdown content, npm scripts, and optional configuration, while the Astro source implementation remains internal unless the user asks for the full project.

The renderer reads Markdown from a site's `content/` directory, pre-renders localized static pages, and generates RSS, sitemap, static search index, JSON Feed, full-site posts JSON, and `llms.txt`.

The first validation milestone is still to replace the existing Hexo personal blog with this implementation.

## Repository Layout

```text
bin/inkisle.mjs       # product CLI
starters/content-only/ # default user-facing starter
starters/default/     # full Astro publishing project and renderer source
docs/                 # product and technical planning docs
```

## Quick Start

```bash
npm install
npm run dev
```

The root scripts run against `starters/default` through npm workspaces.

Useful CLI commands:

```bash
npm exec inkisle -- init my-site
cd my-site && npm install && npm run dev
npm exec inkisle -- init my-full-site --full
npm exec inkisle -- new post "Post title"
npm exec inkisle -- new page "About"
npm exec inkisle -- build
```

## Documents

- [Documentation Index](docs/README.md)
- [Product Brief](docs/product-brief.md)
- [Technical Plan](docs/technical-plan.md)
