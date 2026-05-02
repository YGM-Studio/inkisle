# 墨屿 / InkIsle

InkIsle is an AI-native Markdown publishing system.

It is designed as a static-first blog and content publishing product layer on top of Astro and Vite. The goal is not to rebuild a full web framework, but to provide a clean content model, CLI workflow, theme boundary, and AI-friendly outputs for personal blogs, business content sites, documentation sites, and future publishing scenarios.

## Status

InkIsle now has a minimal Astro-based prototype. It reads Markdown from the root `content/` directory, pre-renders localized static pages, and generates RSS, sitemap, static search index, JSON Feed, full-site posts JSON, and `llms.txt`.

The first validation milestone is still to replace the existing Hexo personal blog with this implementation.

## Quick Start

```bash
npm install
npm run dev
```

Useful CLI commands:

```bash
npm exec inkisle -- new post "Post title"
npm exec inkisle -- new page "About"
npm exec inkisle -- build
```

## Documents

- [Documentation Index](docs/README.md)
- [Product Brief](docs/product-brief.md)
- [Technical Plan](docs/technical-plan.md)
