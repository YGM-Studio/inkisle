import { absoluteUrl, siteConfig } from "../config";
import { getPages, getPosts } from "../lib/content";

export async function GET() {
  const posts = await getPosts();
  const pages = await getPages();

  const lines = [
    `# ${siteConfig.title}`,
    "",
    `> ${siteConfig.description}`,
    "",
    "## Content",
    "",
    ...posts.map((post) => {
      const summary = post.summary ? ` - ${post.summary}` : "";
      return `- [${post.title}](${absoluteUrl(post.url)})${summary}`;
    }),
    "",
    "## Pages",
    "",
    ...pages.map((page) => `- [${page.title}](${absoluteUrl(page.url)})`),
    "",
    "## Machine-readable outputs",
    "",
    `- [Posts JSON](${absoluteUrl("/api/posts.json")})`,
    `- [JSON Feed](${absoluteUrl("/feed.json")})`,
    `- [RSS](${absoluteUrl("/rss.xml")})`
  ];

  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300"
    }
  });
}

