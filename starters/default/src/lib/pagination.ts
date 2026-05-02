import { siteConfig } from "../config";

export function paginate<T>(
  items: T[],
  currentPage: number,
  pageSize = siteConfig.pagination.postsPerPage
) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    currentPage: safePage,
    totalItems: items.length,
    totalPages,
    pageSize
  };
}

