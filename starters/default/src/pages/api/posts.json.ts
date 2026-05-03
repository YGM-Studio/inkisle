import { getSiteDescription, siteConfig } from "../../config";
import { getPosts } from "../../lib/content";
import { publicPost } from "../../lib/feeds";

export async function GET() {
  const posts = await getPosts();

  return Response.json({
    title: siteConfig.title,
    description: getSiteDescription(),
    generatedAt: new Date().toISOString(),
    items: posts.map(publicPost)
  });
}
