import { absoluteUrl, getSiteDescription, siteConfig } from "../config";
import type { ContentEntry } from "./content";

export function toRssXml(posts: ContentEntry[]) {
  const description = getSiteDescription();
  const items = posts
    .map((post) => {
      const link = absoluteUrl(post.url);
      const pubDate = post.date ? new Date(post.date).toUTCString() : new Date().toUTCString();

      return [
        "<item>",
        `<title>${escapeXml(post.title)}</title>`,
        `<link>${escapeXml(link)}</link>`,
        `<guid>${escapeXml(link)}</guid>`,
        `<pubDate>${escapeXml(pubDate)}</pubDate>`,
        `<description>${escapeXml(post.summary || post.excerpt)}</description>`,
        "</item>"
      ].join("");
    })
    .join("");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "<channel>",
    `<title>${escapeXml(siteConfig.title)}</title>`,
    `<link>${escapeXml(siteConfig.site)}</link>`,
    `<description>${escapeXml(description)}</description>`,
    items,
    "</channel>",
    "</rss>"
  ].join("");
}

export function toJsonFeed(posts: ContentEntry[]) {
  const description = getSiteDescription();

  return {
    version: "https://jsonfeed.org/version/1.1",
    title: siteConfig.title,
    home_page_url: siteConfig.site,
    feed_url: absoluteUrl("/feed.json"),
    description,
    authors: [{ name: siteConfig.author.name, url: siteConfig.author.url }],
    items: posts.map((post) => ({
      id: absoluteUrl(post.url),
      url: absoluteUrl(post.url),
      title: post.title,
      summary: post.summary || post.excerpt,
      content_html: post.html,
      date_published: post.date ? new Date(post.date).toISOString() : undefined,
      date_modified: post.updated ? new Date(post.updated).toISOString() : undefined,
      tags: post.tags,
      language: post.locale
    }))
  };
}

export function publicPost(post: ContentEntry) {
  return {
    title: post.title,
    slug: post.slug,
    locale: post.locale,
    url: absoluteUrl(post.url),
    date: post.date,
    updated: post.updated,
    summary: post.summary || post.excerpt,
    tags: post.tags,
    category: post.category,
    text: post.text
  };
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
