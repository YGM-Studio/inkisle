import { siteConfig } from "../config";
import type { ContentEntry } from "./content";

type RankedPost = {
  post: ContentEntry;
  sameTopic: number;
  sharedTags: number;
  sameCategory: number;
  publishedAt: number;
};

export function getRelatedPosts(current: ContentEntry, posts: ContentEntry[]) {
  if (!siteConfig.relatedPosts.enabled) {
    return [];
  }

  const currentTags = new Set(current.tags.map(normalizeTaxonomy));
  const limit = Math.max(0, Math.floor(siteConfig.relatedPosts.limit));

  return posts
    .filter((candidate) => candidate.locale === current.locale && candidate.url !== current.url)
    .map((candidate): RankedPost => {
      const sharedTags = candidate.tags.reduce(
        (count, tag) => count + (currentTags.has(normalizeTaxonomy(tag)) ? 1 : 0),
        0
      );

      return {
        post: candidate,
        sameTopic: current.topic && candidate.topic === current.topic ? 1 : 0,
        sharedTags,
        sameCategory:
          current.category && normalizeTaxonomy(candidate.category) === normalizeTaxonomy(current.category)
            ? 1
            : 0,
        publishedAt: candidate.date ? new Date(candidate.date).getTime() : 0
      };
    })
    .filter((candidate) => candidate.sameTopic || candidate.sharedTags || candidate.sameCategory)
    .sort(compareRelatedPosts)
    .slice(0, limit)
    .map((candidate) => candidate.post);
}

function compareRelatedPosts(left: RankedPost, right: RankedPost) {
  return (
    right.sameTopic - left.sameTopic ||
    right.sharedTags - left.sharedTags ||
    right.sameCategory - left.sameCategory ||
    right.publishedAt - left.publishedAt ||
    left.post.title.localeCompare(right.post.title)
  );
}

function normalizeTaxonomy(value?: string) {
  return value?.trim().toLocaleLowerCase() ?? "";
}
