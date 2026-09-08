import { REST_BASE, supabaseHeaders } from "./supabase";
import { categorySlug } from "./format";
import { SITE_KEY } from "./types";
import type { Post } from "./types";

// Public pages only ever read PUBLISHED posts. Drafts/approved/rejected stay
// invisible to the world and are only reachable from the gated /admin area.
//
// Every query below is scoped to SITE_KEY. The posts table is shared across
// sites, so without that filter one deployment would serve — and sitemap —
// another site's articles, creating duplicate content across domains.

const PUBLIC_SELECT = "*";
const SITE_FILTER = `site=eq.${SITE_KEY}`;
const REVALIDATE = 60; // seconds — ISR-style caching for public pages

async function restGet(path: string, revalidate = REVALIDATE): Promise<Post[]> {
  const res = await fetch(`${REST_BASE}/${path}`, {
    headers: supabaseHeaders(),
    next: { revalidate },
  });
  if (!res.ok) {
    // Fail soft: an empty list renders an empty state instead of a 500.
    console.error(
      `Supabase GET failed (${res.status}): ${path} — ${await res
        .text()
        .catch(() => "")}`
    );
    return [];
  }
  return (await res.json()) as Post[];
}

export async function getPublishedPosts(limit = 100): Promise<Post[]> {
  return restGet(
    `posts?select=${PUBLIC_SELECT}&status=eq.published&${SITE_FILTER}&order=created_at.desc&limit=${limit}`
  );
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const enc = encodeURIComponent(slug);
  const rows = await restGet(
    `posts?select=${PUBLIC_SELECT}&status=eq.published&${SITE_FILTER}&slug=eq.${enc}&limit=1`
  );
  return rows[0] ?? null;
}

export async function getAllPublishedSlugs(): Promise<string[]> {
  const rows = await restGet(
    `posts?select=slug&status=eq.published&${SITE_FILTER}&order=created_at.desc&limit=1000`
  );
  return rows.map((r) => r.slug).filter(Boolean);
}

// Distinct categories present in published content, ordered by frequency.
export async function getCategories(): Promise<string[]> {
  const rows = await getPublishedPosts(500);
  const counts = new Map<string, number>();
  for (const p of rows) {
    const c = (p.category || "").trim();
    if (!c) continue;
    counts.set(c, (counts.get(c) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);
}

export async function getPostsByCategorySlug(slug: string): Promise<{
  label: string;
  posts: Post[];
}> {
  const all = await getPublishedPosts(500);
  const matched = all.filter((p) => categorySlug(p.category) === slug);
  const label = matched[0]?.category || "";
  return { label, posts: matched };
}

// Lightweight keyword/title search over published posts (server-side filter).
export async function searchPublished(query: string): Promise<Post[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = await getPublishedPosts(500);
  return all.filter((p) => {
    const haystack = [
      p.title,
      p.standfirst,
      p.primary_keyword,
      p.category,
      p.meta_description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

// Group a flat list into per-category buckets for the homepage sections.
export function groupByCategory(posts: Post[]): {
  label: string;
  slug: string;
  posts: Post[];
}[] {
  const map = new Map<string, Post[]>();
  for (const p of posts) {
    const label = (p.category || "Uncategorized").trim();
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(p);
  }
  return [...map.entries()].map(([label, ps]) => ({
    label,
    slug: categorySlug(label),
    posts: ps,
  }));
}
