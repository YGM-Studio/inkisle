export function GET() {
  return new Response(
    [
      "self.addEventListener('install', () => {",
      "  self.skipWaiting();",
      "});",
      "",
      "self.addEventListener('activate', (event) => {",
      "  event.waitUntil(self.clients.claim());",
      "});",
      "",
      "self.addEventListener('fetch', () => {});",
      ""
    ].join("\n"),
    {
      headers: {
        "content-type": "application/javascript; charset=utf-8",
        "cache-control": "no-cache"
      }
    }
  );
}
