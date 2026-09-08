import { REST_BASE, supabaseHeaders } from "./supabase";
import { SITE_KEY, SITES } from "./types";
import type { Post } from "./types";

// ---------------------------------------------------------------------------
// Cross-site related link.
//
// Picks one published article from a DIFFERENT site in the network and returns
// an absolute link to it, so the article body can carry a contextual outbound
// link. The point is crawl discovery: a new article on one domain gives search
// engines a path to pages on the others.
//
// Two deliberate constraints:
//   * A link is only returned when the candidate is actually topically related
//     (see MIN_SCORE). No relevant candidate means no link, rather than a
//     mechanical link on every article regardless of fit.
//   * Which candidate wins, and where the link is placed, both vary per
//     article, so the network doesn't render an identical footprint everywhere.
// ---------------------------------------------------------------------------

export interface CrossSiteLink {
  href: string;
  title: string;
  siteLabel: string;
  /** Index in `sections` to render the link after. */
  afterSection: number;
}

// Below this, the candidate isn't related enough to be worth linking.
const MIN_SCORE = 2;

const STOPWORDS = new Set([
  "the", "and", "for", "with", "you", "your", "are", "how", "what", "which",
  "best", "guide", "2026", "2025", "from", "that", "this", "get", "can", "not",
  "should", "actually", "need", "much", "many", "into", "out", "one", "all",
  "trip", "travel", "traveller", "travellers", "tourists", "tourist",
]);

function words(s?: string | null): string[] {
  if (!s) return [];
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Small deterministic hash so choices vary per article but stay stable. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function score(post: Post, candidate: Post): number {
  const mine = new Set([
    ...words(post.primary_keyword),
    ...words(post.title),
  ]);
  const theirs = new Set([
    ...words(candidate.primary_keyword),
    ...words(candidate.title),
  ]);

  let overlap = 0;
  for (const w of theirs) if (mine.has(w)) overlap++;

  // Subject overlap is required, not optional. Category alone is far too loose
  // — nearly everything here is filed under one or two categories, so scoring
  // on it would put a link on every article regardless of topic.
  if (overlap === 0) return 0;

  let n = Math.min(overlap, 4);

  const cat = (post.category || "").trim().toLowerCase();
  const candCat = (candidate.category || "").trim().toLowerCase();
  if (cat && cat === candCat) n += 3;

  return n;
}

/**
 * Returns a contextual link to a related article on another site in the
 * network, or null when nothing suitable exists.
 */
export async function getCrossSiteLink(
  post: Post
): Promise<CrossSiteLink | null> {
  // Only sites with a configured public URL can be linked to. A site with an
  // empty url is skipped rather than producing a broken link.
  const others = SITES.filter((s) => s.key !== SITE_KEY && s.url);
  if (!others.length) return null;

  const inList = others.map((s) => s.key).join(",");
  let rows: Post[] = [];
  try {
    const res = await fetch(
      `${REST_BASE}/posts?select=slug,title,category,primary_keyword,site,created_at` +
        `&status=eq.published&site=in.(${inList})&order=created_at.desc&limit=200`,
      { headers: supabaseHeaders(), next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    rows = (await res.json()) as Post[];
  } catch {
    return null;
  }
  if (!rows.length) return null;

  const scored = rows
    .map((r) => ({ row: r, s: score(post, r) }))
    .filter((x) => x.s >= MIN_SCORE)
    .sort((a, b) => b.s - a.s);

  if (!scored.length) return null;

  // Spread links across the top matches instead of every article pointing at
  // the single best-scoring page.
  const top = scored.slice(0, Math.min(5, scored.length));
  const seed = hash(String(post.slug || post.id));
  const pick = top[seed % top.length].row;

  const site = others.find((s) => s.key === pick.site);
  if (!site) return null;

  const base = site.url.replace(/\/$/, "");
  const sectionCount = (post.sections || []).length;
  // Place it mid-body, varying the slot per article.
  const afterSection =
    sectionCount > 1 ? 1 + (seed % Math.max(1, sectionCount - 1)) : 0;

  return {
    href: `${base}/article/${pick.slug}`,
    title: pick.title,
    siteLabel: site.label,
    afterSection,
  };
}
