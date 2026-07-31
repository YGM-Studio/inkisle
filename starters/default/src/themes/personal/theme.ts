import HomePage from "./components/HomePage.astro";
import MarkdownPage from "./components/MarkdownPage.astro";
import NotFoundPage from "./components/NotFoundPage.astro";
import PostArchivePage from "./components/PostArchivePage.astro";
import SearchPage from "./components/SearchPage.astro";
import TaxonomyPage from "./components/TaxonomyPage.astro";
import TopicIndexPage from "./components/TopicIndexPage.astro";
import PostLayout from "./layouts/PostLayout.astro";
import type { InkIsleTheme } from "../types";

export const personalTheme: InkIsleTheme = {
  name: "personal",
  label: "Personal Blog",
  components: {
    HomePage,
    PostArchivePage,
    PostLayout,
    MarkdownPage,
    TaxonomyPage,
    SearchPage,
    TopicIndexPage,
    NotFoundPage
  }
};
