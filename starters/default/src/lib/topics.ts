import { getTopics, type ResolvedTopic } from "../config";
import { getPosts, type ContentEntry } from "./content";

export type TopicGroup = ResolvedTopic & {
  posts: ContentEntry[];
  postCount: number;
};

export async function getTopicGroups(locale: string, recentPostLimit = 5): Promise<TopicGroup[]> {
  const posts = await getPosts(locale);

  return getTopics(locale).map((topic) => {
    const matchingPosts = posts.filter((post) => post.topic === topic.id);

    return {
      ...topic,
      posts: matchingPosts.slice(0, recentPostLimit),
      postCount: matchingPosts.length
    };
  });
}
