---
title: "快速开始"
date: 2026-05-17
updated: 2026-05-17
summary: "用几条命令创建一个只需要维护 Markdown 的 InkIsle 内容站。"
tags:
  - Quick Start
  - CLI
category: "Guide"
published: true
interactionId: "quick-start"
---

InkIsle 的默认项目是 content-only 形态。你维护 `content/`、可选的 `public/` 和 `inkisle.config.mjs`，渲染器和 Astro 细节留在 InkIsle 包里。

## 创建站点

```bash
npm exec inkisle -- init my-site
cd my-site
npm install
npm run dev
```

## 写内容

```bash
npm exec inkisle -- new post "第一篇文章"
npm exec inkisle -- new page "关于"
```

主语言内容放在 `content/posts/` 和 `content/pages/`。英文翻译可以放在 `content/en/posts/` 和 `content/en/pages/`。

## 发布前检查

```bash
npm run build
npm run check
npm run check:links
```

这些命令会生成静态站点、运行 Astro 检查，并确认构建产物里的内部链接没有断掉。
