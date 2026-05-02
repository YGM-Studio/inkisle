import { siteConfig } from "../config";
import { getPosts } from "../lib/content";

export async function GET() {
  const posts = await getPosts();

  return Response.json({
    generatedAt: new Date().toISOString(),
    defaultLocale: siteConfig.defaultLocale,
    items: posts.map((post) => ({
      title: post.title,
      locale: post.locale,
      url: post.url,
      date: post.date,
      summary: post.summary,
      tags: post.tags,
      category: post.category,
      text: post.text
    }))
  });
}

