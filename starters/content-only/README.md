# InkIsle Site

This is a lightweight InkIsle content site.

## Shape

```text
content/             # Markdown posts and pages
public/              # optional static assets
inkisle.config.mjs   # optional site configuration
package.json         # scripts and InkIsle dependency
```

The Astro renderer, theme source, routes, and build integration live inside the `inkisle` package. This project intentionally does not expose `astro.config.mjs` or `src/` by default.

Main-language content is published without a URL prefix by default. Translated content uses a language prefix, for example `/en/posts/my-post/`.

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```
