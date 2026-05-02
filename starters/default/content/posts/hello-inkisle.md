---
title: "墨屿开始"
date: 2026-05-02
updated: 2026-05-02
summary: "第一篇公开文章，用来验证 Markdown、标签、静态页面和 AI 友好输出。"
tags:
  - InkIsle
  - Markdown
category: "Product"
draft: false
---

墨屿是一个静态优先的 Markdown 发布系统。这个原型先解决最小闭环：内容保存在 Markdown 里，构建时预渲染为 HTML，同时产出 RSS、JSON Feed、搜索索引和 `llms.txt`。

## 内容约定

主语言内容直接写在根目录的 `content/posts/` 和 `content/pages/` 里。翻译内容使用语言前缀目录，例如 `content/en/posts/`。

## 下一步

接下来可以把真实 Hexo 文章迁移进来，用站点构建结果验证路由、样式和机器可读输出是否符合预期。

