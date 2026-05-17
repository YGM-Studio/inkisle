---
title: "部署到 GitHub Pages"
date: 2026-05-17
updated: 2026-05-17
summary: "InkIsle 支持项目页子路径部署，适合托管在 GitHub Pages。"
tags:
  - Deployment
  - GitHub Pages
category: "Deploy"
published: true
---

GitHub Pages 项目页通常部署在仓库名子路径下，例如 `https://ygm-studio.github.io/inkisle/`。这种场景需要同时配置 `site` 和 `base`。

```js
export default {
  site: "https://ygm-studio.github.io",
  base: "/inkisle"
};
```

构建后，页面里的资源、搜索索引、RSS、JSON Feed、`llms.txt` 和 sitemap 都会带上 `/inkisle/` 前缀。

## 推荐 workflow

InkIsle 官网使用 GitHub Actions 构建 `site/dist` 并部署到 Pages。你也可以在自己的仓库里使用同样方式：

```bash
npm run build
npm run check:links
```

如果使用自定义根域名，可以省略 `base` 或设置为 `/`。
