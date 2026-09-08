// Date / text helpers shared across server + client components.

export function formatDate(input?: string | null): string {
  if (!input) return "";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function readTime(post: { read_time_minutes?: number | null }): number {
  return post.read_time_minutes && post.read_time_minutes > 0
    ? post.read_time_minutes
    : 5;
}

// Turn a category name into a URL slug, e.g. "Travel Money" -> "travel-money"
export function categorySlug(category?: string | null): string {
  return (category || "uncategorized")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Best-effort: derive a readable category label back from a slug when we have
// no exact match (used as a fallback heading on category pages).
export function titleCaseFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Rough excerpt from a post body for cards/SEO when standfirst is missing.
export function excerptFor(post: {
  standfirst?: string | null;
  meta_description?: string | null;
  intro_paragraphs?: string[] | null;
  quick_answer?: string | null;
}): string {
  if (post.standfirst) return post.standfirst;
  if (post.meta_description) return post.meta_description;
  if (post.quick_answer) return post.quick_answer;
  const intro = post.intro_paragraphs?.[0];
  if (intro) return intro.length > 180 ? intro.slice(0, 177) + "…" : intro;
  return "";
}
