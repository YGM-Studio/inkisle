---
title: "配置站点"
date: 2026-05-17
updated: 2026-05-17
summary: "通过 inkisle.config.mjs 设置站点身份、主题、多语言、base path 和输出能力。"
tags:
  - Configuration
  - Theme
category: "Guide"
published: true
---

InkIsle 的默认配置已经可以直接运行。需要定制时，在项目根目录添加 `inkisle.config.mjs`。

```js
export default {
  title: "My Site",
  description: {
    zh: "我的内容站",
    en: "My content site"
  },
  site: "https://example.com",
  theme: {
    name: "business-blog",
    defaultMode: "system",
    allowUserToggle: true
  }
};
```

## 常用字段

- `title` 和 `description` 控制页面标题、首页文案、feed 和 `llms.txt`。
- `locales` 和 `defaultLocale` 控制多语言内容目录。
- `theme.name` 可以选择 `personal` 或 `business-blog`。
- `base` 用于 GitHub Pages 这类子路径部署，例如 `/inkisle`。
- `pwa`、`analytics`、`verificationFiles` 和 `redirects` 处理浏览器集成、统计、搜索验证文件和迁移跳转。

`base` 只影响浏览器可访问 URL，不改变 Markdown 内容路径，也不改变构建目录里的文件结构。
