import type { MetadataRoute } from "next";
import { getAllPublishedSlugs, getCategories } from "@/lib/posts";
import { categorySlug } from "@/lib/format";
import { siteUrl } from "@/lib/types";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [slugs, cats] = await Promise.all([
    getAllPublishedSlugs(),
    getCategories(),
  ]);
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    ...cats.map((c) => ({
      url: `${base}/category/${categorySlug(c)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...slugs.map((s) => ({
      url: `${base}/article/${s}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
