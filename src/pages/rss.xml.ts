import { getPosts } from "../lib/content";
import { toRssXml } from "../lib/feeds";

export async function GET() {
  const posts = await getPosts();

  return new Response(toRssXml(posts), {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=300"
    }
  });
}

