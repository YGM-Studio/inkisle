---
title: "InkIsle Begins"
date: 2026-05-02
updated: 2026-05-02
summary: "The first public post for validating Markdown, tags, static pages, and AI-friendly outputs."
tags:
  - InkIsle
  - Markdown
category: "Product"
interactionId: "hello-inkisle"
published: true
---

InkIsle is a static-first Markdown publishing system. This prototype starts with the smallest useful loop: keep content in Markdown, pre-render HTML at build time, and generate RSS, JSON Feed, search index, and `llms.txt`.

## Content convention

Main-language content lives directly in `content/posts/` and `content/pages/`. Translated content uses language-prefixed directories such as `content/en/posts/`.

## Next step

The next validation step is to migrate the real Hexo blog content and check whether routes, visual design, and machine-readable outputs match the publishing workflow.
