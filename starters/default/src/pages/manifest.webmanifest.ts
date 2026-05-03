import { getWebManifest } from "../lib/pwa";

export function GET() {
  return Response.json(getWebManifest(), {
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": "public, max-age=3600"
    }
  });
}
