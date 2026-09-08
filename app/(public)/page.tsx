import Link from "next/link";
import { getPublishedPosts, groupByCategory } from "@/lib/posts";
import {
  Hero,
  HeroSecondary,
  RailItem,
  PopularItem,
  Card,
} from "@/components/cards";
import { SITE } from "@/lib/types";

export const revalidate = 60;

export default async function HomePage() {
  const posts = await getPublishedPosts(100);

  if (posts.length === 0) {
    return (
      <div className="container">
        <div className="empty">
          <h2>No stories published yet</h2>
          <p>
            Approved articles from the {SITE.shortName} desk will appear here.
            Head to the admin dashboard to review and publish drafts.
          </p>
        </div>
      </div>
    );
  }

  const hero = posts[0];
  const heroSecondary = posts.slice(1, 3);
  const latest = posts.slice(0, 5);
  const popular = [...posts]
    .sort(
      (a, b) =>
        (b.read_time_minutes || 0) - (a.read_time_minutes || 0) ||
        +new Date(b.created_at) - +new Date(a.created_at)
    )
    .slice(0, 5);

  // Category sections below the fold (skip tiny/empty buckets, cap the count).
  const sections = groupByCategory(posts)
    .filter((g) => g.posts.length > 0)
    .slice(0, 6);

  return (
    <div className="container">
      <div className="home-top">
        {/* Left rail — Latest */}
        <div className="rail rail--latest">
          <div className="rail-title">Latest</div>
          {latest.map((p) => (
            <RailItem key={String(p.id)} post={p} />
          ))}
        </div>

        {/* Center — Featured */}
        <div className="rail rail--featured">
          <div className="rail-title">Featured</div>
          <Hero post={hero} />
          {heroSecondary.length ? (
            <div className="hero-secondary">
              {heroSecondary.map((p) => (
                <HeroSecondary key={String(p.id)} post={p} />
              ))}
            </div>
          ) : null}
        </div>

        {/* Right rail — Popular */}
        <div className="rail rail--popular">
          <div className="rail-title">Popular</div>
          {popular.map((p, i) => (
            <PopularItem key={String(p.id)} post={p} rank={i + 1} />
          ))}
        </div>
      </div>

      {/* Category sections */}
      {sections.map((g) => (
        <section key={g.slug}>
          <div className="section-head">
            <h2>{g.label}</h2>
            <Link href={`/category/${g.slug}`}>View all</Link>
          </div>
          <div className="card-grid">
            {g.posts.slice(0, 4).map((p) => (
              <Card key={String(p.id)} post={p} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
