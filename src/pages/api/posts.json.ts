import { siteConfig } from "../../config";
import { getPosts } from "../../lib/content";
import { publicPost } from "../../lib/feeds";

export async function GET() {
  const posts = await getPosts();

  return Response.json({
    title: siteConfig.title,
    description: siteConfig.description,
    generatedAt: new Date().toISOString(),
    items: posts.map(publicPost)
  });
}

