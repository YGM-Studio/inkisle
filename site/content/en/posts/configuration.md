---
title: "Configuration"
date: 2026-05-17
updated: 2026-05-17
summary: "Use inkisle.config.mjs to configure identity, themes, locales, base paths, and outputs."
tags:
  - Configuration
  - Theme
category: "Guide"
published: true
interactionId: "configuration"
---

InkIsle runs with defaults, but real sites usually add `inkisle.config.mjs` at the project root.

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

## Common fields

- `title` and `description` drive page metadata, homepage copy, feeds, and `llms.txt`.
- `locales` and `defaultLocale` control multilingual content directories.
- `theme.name` selects `personal` or `business-blog`.
- `base` supports subpath deployments such as `/inkisle`.
- `interactions` can opt into Waline or Giscus; no third-party comment script loads by default.
- `pwa`, `analytics`, `verificationFiles`, and `redirects` handle browser integration, analytics, verification files, and migration redirects.

`base` changes browser-facing URLs. It does not change Markdown paths or the generated file layout.
