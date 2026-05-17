---
title: "Deploy to GitHub Pages"
date: 2026-05-17
updated: 2026-05-17
summary: "InkIsle supports GitHub Pages project URLs through base path configuration."
tags:
  - Deployment
  - GitHub Pages
category: "Deploy"
published: true
---

GitHub Pages project sites usually live under a repository subpath, such as `https://ygm-studio.github.io/inkisle/`. Configure both `site` and `base` for that shape.

```js
export default {
  site: "https://ygm-studio.github.io",
  base: "/inkisle"
};
```

After build, asset links, search index requests, RSS, JSON Feed, `llms.txt`, and sitemap URLs include the `/inkisle/` prefix.

## Recommended workflow

The InkIsle website builds `site/dist` with GitHub Actions and deploys it to Pages. You can use the same pattern:

```bash
npm run build
npm run check:links
```

If you use a custom root domain, omit `base` or set it to `/`.
