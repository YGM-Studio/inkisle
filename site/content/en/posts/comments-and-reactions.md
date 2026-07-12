---
title: "Comments and reactions are now available in InkIsle"
date: 2026-07-12
updated: 2026-07-12
summary: "Add comments and reactions to static articles with Giscus or Waline while keeping the build fully static."
tags:
  - Interactions
  - Giscus
  - Waline
category: "Release"
published: true
interactionId: "comments-and-reactions-launch"
---

InkIsle can now add comments and reactions to articles through Giscus or Waline. Interactions remain opt-in: when no provider is configured, the generated site loads no third-party interaction resources.

## Two providers

- Giscus stores interaction data in GitHub Discussions and requires almost no additional operations, making it a good fit for developer and open-source sites.
- Waline serves a broader readership through a separately deployed backend and can present its reactions as a single like button.

Both providers are integrated at the InkIsle renderer boundary, so the built-in `personal` and `business-blog` themes expose the same behavior.

## Stable discussion identity

An article can declare a permanent interaction identifier:

```yaml
interactionId: permanent-article-id
comments: true
reactions: true
```

Providers use `interactionId`, rather than the public URL, to find the article discussion. Existing comments therefore survive title, slug, locale-prefix, deployment-base, and domain changes as long as the identifier remains stable.

Translated articles can share one discussion or keep separate discussions per language. An article can also set `comments: false` to remove the complete interaction section or `reactions: false` to keep comments without reactions.

## Validated on the official site

The InkIsle site runs on GitHub Pages and uses Giscus to store article interactions in the `InkIsle Blog` Discussions category of `YGM-Studio/inkisle`. Chinese and English translations share a discussion, and the Giscus interface follows the site's light and dark themes.

We also maintain an [independent npm canary](https://ygm-studio.github.io/inkisle-canary/). It installs a pinned release from npm instead of referencing the source workspace, then validates the package with a different theme and deployment repository.

This article is also a long-running public acceptance page. Leave feedback below to help us keep validating loading, sign-in, replies, and reactions in a real deployment.
