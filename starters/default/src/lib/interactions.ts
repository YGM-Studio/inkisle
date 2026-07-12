import { resolveLocalizedConfig, siteConfig, type InteractionProvider } from "../config";
import type { ContentEntry } from "./content";

export type InteractionState = {
  provider: Exclude<InteractionProvider, "none">;
  key: string;
  locale: string;
  reactions: boolean;
  retryURL: string;
};

export function getInteractionState(post: ContentEntry): InteractionState | undefined {
  const { interactions } = siteConfig;

  if (interactions.provider === "none") {
    return undefined;
  }

  if (interactions.provider !== "waline" && interactions.provider !== "giscus") {
    throw new Error(
      `Unknown interactions provider "${interactions.provider}". Use "none", "waline", or "giscus".`
    );
  }

  if (!(["separate", "shared"] as string[]).includes(interactions.localeScope)) {
    throw new Error(
      `Unknown interactions.localeScope "${interactions.localeScope}". Use "separate" or "shared".`
    );
  }

  validateProviderConfig(interactions.provider);

  if (!post.comments) {
    return undefined;
  }

  return {
    provider: interactions.provider,
    key:
      interactions.localeScope === "shared"
        ? post.interactionId
        : `${post.interactionId}:${post.locale}`,
    locale: post.locale,
    reactions: post.reactions,
    retryURL: post.url
  };
}

export function getWalineLanguage(locale: string) {
  return resolveLocalizedConfig(
    siteConfig.interactions.waline.lang,
    locale,
    locale === "zh" ? "zh-CN" : locale
  );
}

export function getGiscusLanguage(locale: string) {
  return resolveLocalizedConfig(
    siteConfig.interactions.giscus.lang,
    locale,
    locale === "zh" ? "zh-CN" : locale
  );
}

function validateProviderConfig(provider: Exclude<InteractionProvider, "none">) {
  if (provider === "waline") {
    requireHttpURL("interactions.waline.serverURL", siteConfig.interactions.waline.serverURL);
    requireHttpURL("interactions.waline.clientURL", siteConfig.interactions.waline.clientURL);
    requireHttpURL("interactions.waline.cssURL", siteConfig.interactions.waline.cssURL);
    return;
  }

  const { giscus } = siteConfig.interactions;
  requireHttpURL("interactions.giscus.host", giscus.host);
  requireConfigValue("interactions.giscus.repo", giscus.repo);
  requireConfigValue("interactions.giscus.repoId", giscus.repoId);
  requireConfigValue("interactions.giscus.category", giscus.category);
  requireConfigValue("interactions.giscus.categoryId", giscus.categoryId);

  if (!/^[^/\s]+\/[^/\s]+$/.test(giscus.repo)) {
    throw new Error('Invalid interactions.giscus.repo. Use the "owner/repository" format.');
  }
}

function requireConfigValue(name: string, value: string) {
  if (!value?.trim()) {
    throw new Error(`Missing ${name} for the configured interactions provider.`);
  }
}

function requireHttpURL(name: string, value: string) {
  requireConfigValue(name, value);

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error();
    }
  } catch {
    throw new Error(`Invalid ${name}. Use an absolute HTTP(S) URL.`);
  }
}
