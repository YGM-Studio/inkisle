import { getPosts } from "../lib/content";
import { toJsonFeed } from "../lib/feeds";

export async function GET() {
  const posts = await getPosts();

  return Response.json(toJsonFeed(posts), {
    headers: {
      "cache-control": "public, max-age=300"
    }
  });
}

