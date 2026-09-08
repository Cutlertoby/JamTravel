import Link from "next/link";
import { formatDate, readTime, categorySlug, excerptFor } from "@/lib/format";
import type { Post } from "@/lib/types";
import { SITE } from "@/lib/types";
import { articleImage } from "@/lib/images";

export { articleImage };

export async function Thumb({ post }: { post: Post }) {
  const src = await articleImage(post);
  return (
    <span className="thumb">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={post.title} loading="lazy" />
      {post.category ? (
        <span className="thumb-tag">{post.category}</span>
      ) : null}
    </span>
  );
}

function Kicker({ post }: { post: Post }) {
  if (!post.category) return null;
  return (
    <div className="kicker-row">
      <Link
        href={`/category/${categorySlug(post.category)}`}
        className="eyebrow"
      >
        {post.category}
      </Link>
    </div>
  );
}

// Standard 4-up card with photo
export async function Card({ post }: { post: Post }) {
  return (
    <article className="card">
      <Link href={`/article/${post.slug}`} aria-label={post.title}>
        <span style={{ display: "block", aspectRatio: "16 / 10" }}>
          <Thumb post={post} />
        </span>
      </Link>
      <div style={{ marginTop: "0.75rem" }}>
        <Kicker post={post} />
        <Link href={`/article/${post.slug}`} className="headline-link">
          {post.title}
        </Link>
        <p className="dek">{excerptFor(post)}</p>
      </div>
    </article>
  );
}

// Left-rail item: small square tile + headline
export async function RailItem({ post }: { post: Post }) {
  return (
    <article className="rail-item">
      <Link href={`/article/${post.slug}`} aria-label={post.title}>
        <Thumb post={post} />
      </Link>
      <div>
        <Kicker post={post} />
        <Link href={`/article/${post.slug}`} className="headline-link">
          {post.title}
        </Link>
        <div className="byline">{formatDate(post.created_at)}</div>
      </div>
    </article>
  );
}

// Right-rail ranked item
export function PopularItem({ post, rank }: { post: Post; rank: number }) {
  return (
    <article className="popular-item">
      <div className="popular-rank">{rank}</div>
      <div>
        <Kicker post={post} />
        <Link href={`/article/${post.slug}`} className="headline-link">
          {post.title}
        </Link>
      </div>
    </article>
  );
}

// Featured hero
export async function Hero({ post }: { post: Post }) {
  return (
    <article className="hero">
      <Link href={`/article/${post.slug}`} aria-label={post.title}>
        <span style={{ display: "block", aspectRatio: "16 / 9" }}>
          <Thumb post={post} />
        </span>
      </Link>
      <div style={{ marginTop: "1.1rem" }}>
        <Kicker post={post} />
        <Link href={`/article/${post.slug}`} className="headline-link">
          {post.title}
        </Link>
        <p className="dek">{excerptFor(post)}</p>
        <div className="byline">
          {SITE.author} · {formatDate(post.created_at)} · {readTime(post)} min
          read
        </div>
      </div>
    </article>
  );
}

// Secondary featured (under hero)
export async function HeroSecondary({ post }: { post: Post }) {
  return (
    <article>
      <Link href={`/article/${post.slug}`} aria-label={post.title}>
        <span style={{ display: "block", aspectRatio: "16 / 10" }}>
          <Thumb post={post} />
        </span>
      </Link>
      <div style={{ marginTop: "0.6rem" }}>
        <Kicker post={post} />
        <Link href={`/article/${post.slug}`} className="headline-link">
          {post.title}
        </Link>
      </div>
    </article>
  );
}
