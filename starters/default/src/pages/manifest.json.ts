import { getWebManifest } from "../lib/pwa";

export function GET() {
  return Response.json(getWebManifest(), {
    headers: {
      "cache-control": "public, max-age=3600"
    }
  });
}
