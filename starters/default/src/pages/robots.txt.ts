import { absoluteUrl } from "../config";

export function GET() {
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${absoluteUrl("/sitemap-index.xml")}\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600"
    }
  });
}
