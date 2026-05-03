import { getConfiguredStaticFiles } from "../lib/static-files";

export function getStaticPaths() {
  return getConfiguredStaticFiles().map((file) => ({
    params: { staticFile: file.path },
    props: { file }
  }));
}

export function GET({ props }: { props: { file: ReturnType<typeof getConfiguredStaticFiles>[number] } }) {
  const contentType = props.file.contentType || "text/plain; charset=utf-8";
  const content = contentType.toLowerCase().startsWith("text/html")
    ? renderHtmlFile(props.file.content)
    : props.file.content;

  return new Response(content, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=3600"
    }
  });
}

function renderHtmlFile(content: string) {
  if (/<!doctype html/i.test(content) || /<html[\s>]/i.test(content)) {
    return content;
  }

  return `<!doctype html><html><head><meta charset="utf-8"><title>Verification</title></head><body>${escapeHtml(content)}</body></html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
