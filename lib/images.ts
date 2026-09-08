import type { Post } from "@/lib/types";

// Topically relevant article images via the Pexels API, keyed off each
// article's primary_keyword (falling back to category, then a generic
// query). Results are cached in memory per server instance so repeat
// requests for the same article don't re-hit the API, and any failure
// (missing key, no results, network error) falls back to a stable seeded
// Picsum photo so the page never breaks.

const cache = new Map<string, string>();

function fallbackImage(post: Post, w: number, h: number): string {
  const seed = encodeURIComponent(post.slug || String(post.id) || "article");
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

function queryFor(post: Post): string {
  return (
    post.primary_keyword?.trim() ||
    post.category?.trim() ||
    post.title?.trim() ||
    "travel"
  );
}

export async function articleImage(
  post: Post,
  w = 1200,
  h = 750
): Promise<string> {
  // Manual override wins, if the editor set one.
  if (post.image_url && post.image_url.trim()) return post.image_url.trim();

  const key = process.env.PEXELS_API_KEY;
  const fallback = fallbackImage(post, w, h);
  if (!key) return fallback;

  const query = queryFor(post);
  const cacheKey = `${query.toLowerCase()}|${w}x${h}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(
        query
      )}&per_page=1&orientation=landscape`,
      {
        headers: { Authorization: key },
        // Cache the upstream lookup for a day; Next.js dedupes/revalidates
        // this alongside the page's own revalidate window.
        next: { revalidate: 86400 },
      }
    );
    if (!res.ok) return fallback;
    const data = await res.json();
    const url: string | undefined = data?.photos?.[0]?.src?.large;
    if (!url) return fallback;
    cache.set(cacheKey, url);
    return url;
  } catch {
    return fallback;
  }
}
