# 墨屿 / InkIsle

[Website](https://ygm-studio.github.io/inkisle/) · [Giscus Canary](https://ygm-studio.github.io/inkisle-canary/) · [Waline Canary](https://ygm-studio.github.io/inkisle-waline-canary/) · [npm](https://www.npmjs.com/package/inkisle) · [GitHub](https://github.com/YGM-Studio/inkisle)

InkIsle is an AI-native Markdown publishing system.

It is designed as a static-first blog and content publishing product layer on top of Astro and Vite. The goal is not to rebuild a full web framework, but to provide a clean content model, CLI workflow, theme boundary, and AI-friendly outputs for personal blogs, business content sites, documentation sites, and future publishing scenarios.

## Status

InkIsle is an early alpha project. The current release has a minimal Astro-based renderer, starter projects, CLI workflow, and static outputs, but public APIs and theme boundaries may still change before a stable release.

The product direction is content-first: default user projects should be lightweight Node projects with Markdown content, npm scripts, and optional configuration, while the Astro source implementation remains internal unless the user asks for the full project.

The renderer reads Markdown from a site's `content/` directory, pre-renders localized static pages, publishes the default language without a URL prefix by default, supports built-in `personal` and `business-blog` themes, and generates RSS, sitemap, static search index, JSON Feed, full-site posts JSON, and `llms.txt`.

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

Requires Node.js 22.12 or newer.

Useful CLI commands:

```bash
npm exec inkisle -- init my-site
cd my-site && npm install && npm run dev
npm exec inkisle -- init my-full-site --full
npm exec inkisle -- new post "Post title"
npm exec inkisle -- new page "About"
npm exec inkisle -- build
npm exec inkisle -- check
npm exec inkisle -- check links
npm exec inkisle -- audit content
npm exec inkisle -- audit content --format markdown
```

## Quality Checks

```bash
npm run check
npm run build
npm run check:links
npm run test:audit
npm run site:build
npm run site:check:links
npm audit --audit-level=high
```

`npm run ci` runs the same checks used by GitHub Actions.

`inkisle audit content` reports content health issues without failing the
command by default. It checks frontmatter, duplicate routes, broken content
links, orphan posts, unknown topics, stale posts, and one-off taxonomy values.
Use `--strict` when errors and warnings should fail CI, `--stale-days` to
change the two-year default, and `--check-external` to make live network
requests for external links. Text, Markdown, and JSON output formats are
available.

Chinese ICP filing text can be shown in the footer by setting `filing.icp.number` in `inkisle.config.mjs`. It is hidden by default and only renders when a filing number is configured.

GitHub Pages project sites can use `base` for repository subpaths:

```js
export default {
  site: "https://ygm-studio.github.io",
  base: "/inkisle"
};
```

InkIsle uses `base` for browser-facing links, static assets, feeds, sitemap URLs, search indexes, and `llms.txt` while keeping the generated file layout rooted at `dist/`.

## Release

Publishing is tag-driven. Configure npm Trusted Publishing for `YGM-Studio/inkisle` with workflow filename `publish.yml`, then run:

```bash
npm run release
```

The release script defaults to a patch bump. It also accepts npm version specs:

```bash
npm run release -- minor
npm run release -- 0.0.2
```

The script updates `package.json`, `package-lock.json`, and the content-only starter dependency, creates a `vX.Y.Z` tag, commits, and pushes the branch and tag. GitHub Actions publishes the package to `https://registry.npmjs.org/` when the tag is pushed.

## Documents

- [Documentation Index](docs/README.md)
- [Product Brief](docs/product-brief.md)
- [Technical Plan](docs/technical-plan.md)
- [Interactions Plan](docs/interactions.md)
- [Canary Sites](docs/canary-sites.md)

## Contributing

Issues and pull requests are welcome while the project is in alpha. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing changes.

## License

InkIsle is released under the [MIT License](LICENSE).
