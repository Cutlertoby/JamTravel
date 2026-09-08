import type { Metadata } from "next";
import { searchPublished } from "@/lib/posts";
import { Card } from "@/components/cards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q || "").trim();
  const results = q ? await searchPublished(q) : [];

  return (
    <div className="container">
      <div className="section-head" style={{ marginTop: "2.5rem" }}>
        <h2>{q ? `Results for “${q}”` : "Search"}</h2>
      </div>

      {!q ? (
        <div className="empty">
          <p>Type a keyword in the search box to find articles.</p>
        </div>
      ) : results.length === 0 ? (
        <div className="empty">
          <h2>No matches</h2>
          <p>Nothing found for “{q}”. Try a different keyword.</p>
        </div>
      ) : (
        <>
          <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
            {results.length} article{results.length === 1 ? "" : "s"} found
          </p>
          <div className="card-grid">
            {results.map((p) => (
              <Card key={String(p.id)} post={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
