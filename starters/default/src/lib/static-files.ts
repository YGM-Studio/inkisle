import { siteConfig, type StaticFileConfig } from "../config";

export type NormalizedStaticFile = StaticFileConfig & {
  path: string;
};

export function getConfiguredStaticFiles() {
  const seen = new Set<string>();
  const files: NormalizedStaticFile[] = [];

  for (const file of siteConfig.verificationFiles) {
    const filePath = normalizeStaticFilePath(file.path);
    const content = typeof file.content === "string" ? file.content : undefined;

    if (!filePath || content === undefined || seen.has(filePath)) {
      continue;
    }

    seen.add(filePath);
    files.push({
      ...file,
      path: filePath,
      contentType: file.contentType || inferContentType(filePath)
    });
  }

  return files;
}

function normalizeStaticFilePath(rawPath: string) {
  if (typeof rawPath !== "string") {
    return undefined;
  }

  const cleanPath = rawPath.trim().replace(/^\/+/, "");

  if (
    !cleanPath ||
    cleanPath.endsWith("/") ||
    cleanPath.includes("\\") ||
    cleanPath.split("/").includes("..")
  ) {
    return undefined;
  }

  return cleanPath;
}

function inferContentType(filePath: string) {
  if (filePath.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }

  if (filePath.endsWith(".xml")) {
    return "application/xml; charset=utf-8";
  }

  if (filePath.endsWith(".json") || filePath.endsWith(".webmanifest")) {
    return "application/json; charset=utf-8";
  }

  return "text/plain; charset=utf-8";
}
