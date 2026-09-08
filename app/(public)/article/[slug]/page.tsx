import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getPostBySlug,
  getAllPublishedSlugs,
  getPublishedPosts,
} from "@/lib/posts";
import ArticleBody from "@/components/ArticleBody";
import { Card, articleImage } from "@/components/cards";
import { SITE, APP_PROMO, siteUrl } from "@/lib/types";
import { formatDate, readTime, categorySlug } from "@/lib/format";

export const revalidate = 60;

// Slugs that show the LocalPay eSIM offer CTA (with a direct app link)
// instead of the default download CTA.
// Add this site's own article slugs here as they're published.
const ESIM_CTA_SLUGS: string[] = [];

export async function generateStaticParams() {
  const slugs = await getAllPublishedSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  if (!post) return { title: "Not found" };
  const url = `${siteUrl()}/article/${post.slug}`;
  const description =
    post.meta_description || post.standfirst || SITE.description;
  const image = await articleImage(post);
  return {
    title: post.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description,
      url,
      type: "article",
      publishedTime: post.created_at,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [image],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();

  const url = `${siteUrl()}/article/${post.slug}`;
  const description =
    post.meta_description || post.standfirst || SITE.description;
  const image = await articleImage(post);
  const all = await getPublishedPosts(100);
  const related = all
    .filter(
      (p) =>
        String(p.id) !== String(post.id) &&
        categorySlug(p.category) === categorySlug(post.category)
    )
    .slice(0, 3);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description,
    image: [image],
    datePublished: post.created_at,
    dateModified: post.created_at,
    author: { "@type": "Organization", name: SITE.author },
    publisher: {
      "@type": "Organization",
      name: SITE.legalName,
      logo: { "@type": "ImageObject", url: SITE.ogImage },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    articleSection: post.category || undefined,
    keywords: post.primary_keyword || undefined,
  };

  const faqLd =
    post.faqs && post.faqs.length
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: post.faqs.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      {faqLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      ) : null}

      <article className="article-wrap">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          {post.category ? (
            <>
              {" / "}
              <Link href={`/category/${categorySlug(post.category)}`}>
                {post.category}
              </Link>
            </>
          ) : null}
        </nav>

        {post.category ? (
          <Link
            href={`/category/${categorySlug(post.category)}`}
            className="cat-badge"
          >
            {post.category}
          </Link>
        ) : null}

        <h1>{post.title}</h1>

        {post.standfirst ? (
          <p className="standfirst">{post.standfirst}</p>
        ) : null}

        <div className="article-meta">
          <span className="meta-author">
            <span className="meta-avatar">PJ</span>
            {SITE.author}
          </span>
          <span className="meta-dot">·</span>
          <span>{formatDate(post.created_at)}</span>
          <span className="meta-dot">·</span>
          <span>{readTime(post)} min read</span>
        </div>

        <div className="hero-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={post.title} />
        </div>

        <ArticleBody post={post} />

        {ESIM_CTA_SLUGS.includes(post.slug) ? (
          <div className="article-cta">
            <div>
              <p>{post.cta_headline}</p>
              {post.cta_subtext ? <span>{post.cta_subtext}</span> : null}
            </div>
            <a
              className="btn-cta-sm"
              href="https://localpay.onelink.me/nEkT/9i4q91es"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download the app
            </a>
          </div>
        ) : post.slug !== "rounds" && (post.cta_headline ? (
          <div className="article-cta">
            <div>
              <p>{post.cta_headline}</p>
              {post.cta_subtext ? <span>{post.cta_subtext}</span> : null}
            </div>
            <button className="btn-cta-sm" data-open-download type="button">
              Download the app
            </button>
          </div>
        ) : (
          <div className="article-cta">
            <div>
              <p>Pay like a local with {APP_PROMO.name}</p>
              <span>QR payments across Vietnam, Indonesia and the Philippines</span>
            </div>
            <button className="btn-cta-sm" data-open-download type="button">
              Download the app
            </button>
          </div>
        ))}
      </article>

      {related.length ? (
        <div className="related">
          <h3>Related</h3>
          <div className="related-grid">
            {related.map((p) => (
              <Card key={String(p.id)} post={p} />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
