---
title: "InkIsle 现已支持点赞与留言"
date: 2026-07-12
updated: 2026-07-12
summary: "通过 Giscus 或 Waline 为静态文章加入点赞和留言，同时保持构建过程完全静态。"
tags:
  - Interactions
  - Giscus
  - Waline
category: "Release"
published: true
interactionId: "comments-and-reactions-launch"
---

InkIsle 现在可以通过 Giscus 或 Waline 为文章提供点赞与留言。互动功能仍然是可选的：没有配置 Provider 时，构建结果不会加载任何第三方互动资源。

## 两种 Provider

- Giscus 使用 GitHub Discussions 保存互动数据，几乎不需要额外运维，适合开发者和开源项目。
- Waline 面向更广泛的读者，支持独立部署服务端，也可以把 reaction 配置成单一的点赞按钮。

两个 Provider 都由 InkIsle 的 renderer 统一接入，内置的 `personal` 和 `business-blog` 主题会保持相同的行为。

## 稳定的讨论标识

文章可以显式设置永久互动标识：

```yaml
interactionId: permanent-article-id
comments: true
reactions: true
```

Provider 使用 `interactionId`，而不是公开 URL，来查找文章对应的讨论。修改标题、slug、语言前缀、部署子路径或域名时，只要保留这个标识，原有留言就不会丢失。

翻译文章可以共用一个讨论，也可以按语言分开。文章还可以通过 `comments: false` 关闭完整互动区域，或者通过 `reactions: false` 只保留留言。

## 官方站验证

InkIsle 官方站运行在 GitHub Pages 上，使用 Giscus 把文章互动保存到 `YGM-Studio/inkisle` 的 `InkIsle Blog` Discussions 分类。中英文翻译共用讨论，明暗主题切换也会同步到 Giscus。

我们还维护了两个独立 npm canary。它们都不引用源码工作区，而是从 npm 安装固定版本，再通过各自的仓库和 GitHub Pages 工作流验证发布包：

- [Giscus canary](https://ygm-studio.github.io/inkisle-canary/)验证 npm 安装、Pages 子路径和 GitHub Discussions 互动。
- [Waline canary](https://ygm-studio.github.io/inkisle-waline-canary/)验证独立 Vercel 服务端、Neon 数据库、留言表单和 reaction。

两个站点的维护边界、数据归属和版本升级流程记录在[Canary Sites](https://github.com/YGM-Studio/inkisle/blob/main/docs/canary-sites.md)中。

这篇文章本身就是长期运行的公开验收页面。你可以在下方留下反馈，帮助我们继续验证真实环境下的加载、登录、回复和 reaction 体验。
