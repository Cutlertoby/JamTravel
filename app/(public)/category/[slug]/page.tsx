import type { Metadata } from "next";
import { getPostsByCategorySlug, getCategories } from "@/lib/posts";
import { Card } from "@/components/cards";
import { titleCaseFromSlug, categorySlug } from "@/lib/format";
import { SITE } from "@/lib/types";

export const revalidate = 60;

export async function generateStaticParams() {
  const cats = await getCategories();
  return cats.map((c) => ({ slug: categorySlug(c) }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const { label } = await getPostsByCategorySlug(params.slug);
  const name = label || titleCaseFromSlug(params.slug);
  return {
    title: name,
    description: `${name} — guides and news from ${SITE.name}.`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: { slug: string };
}) {
  const { label, posts } = await getPostsByCategorySlug(params.slug);
  const name = label || titleCaseFromSlug(params.slug);

  return (
    <div className="container">
      <div className="section-head" style={{ marginTop: "2.5rem" }}>
        <h2>{name}</h2>
      </div>

      {posts.length === 0 ? (
        <div className="empty">
          <h2>Nothing here yet</h2>
          <p>No published articles in {name} so far. Check back soon.</p>
        </div>
      ) : (
        <div className="card-grid">
          {posts.map((p) => (
            <Card key={String(p.id)} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
