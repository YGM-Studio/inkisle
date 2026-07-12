# Changelog

All notable changes to InkIsle will be documented in this file.

This project follows semantic versioning after the public API stabilizes. During the 0.x alpha period, minor and patch releases may include breaking changes.

## 0.0.18 - 2026-07-12

- Added opt-in Waline and Giscus providers for article comments and reactions.
- Added stable `interactionId` keys, shared or separate locale scopes, and article-level interaction controls.
- Added provider validation, loading and failure states, dark-mode synchronization, and styles for both built-in themes.
- Enabled Giscus on the official GitHub Pages site and added interaction acceptance tests to CI.

## 0.0.13 - 2026-05-11

- Added built-in theme system improvements and release updates.
- Published the current alpha package to npm.

## 0.0.12 and earlier

- Added the initial Astro-based renderer.
- Added content-only and full starter modes.
- Added CLI commands for initialization, content creation, build, preview, and checks.
- Added RSS, sitemap, JSON feed, search index, `llms.txt`, multilingual routes, and internal link checking.
