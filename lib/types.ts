// ---------------------------------------------------------------------------
// Article schema — mirrors the Supabase `posts` table the Make.com pipeline
// writes to. Keep field names in sync with the pipeline + CRM.
// ---------------------------------------------------------------------------

// The pipeline writes new articles as `pending_review`; the CRM moves them to
// approved → published, or rejected. (`draft` kept as a defensive alias.)
export type PostStatus =
  | "pending_review"
  | "approved"
  | "published"
  | "rejected"
  | "draft";

export interface Section {
  h2: string;
  paragraphs: string[];
  link?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
}

export interface Step {
  heading: string;
  body: string;
}

export interface Faq {
  question: string;
  answer: string;
}

export interface Post {
  id: string | number;
  title: string;
  slug: string;
  standfirst?: string | null;
  category?: string | null;
  primary_keyword?: string | null;
  meta_description?: string | null;
  intro_paragraphs?: string[] | null;
  quick_answer?: string | null;
  sections?: Section[] | null;
  pull_quote?: string | null;
  steps?: Step[] | null;
  tip_list_heading?: string | null;
  tip_list?: string[] | null;
  faqs?: Faq[] | null;
  closing_paragraphs?: string[] | null;
  cta_headline?: string | null;
  cta_subtext?: string | null;
  read_time_minutes?: number | null;
  // Manual image override. When set, this is used instead of the automatic
  // Pexels lookup. Optional column — articles without it fall back as before.
  image_url?: string | null;
  site?: string | null;
  status: PostStatus;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Site configuration — single place to tweak branding, nav, store links.
// ---------------------------------------------------------------------------

export const SITE = {
  name: "Positive Jam Travel",
  shortName: "PJT",
  tagline: "Travel guides for Southeast Asia",
  description:
    "Practical travel guides for Southeast Asia — connectivity, payments, transport and everything worth sorting before you land.",
  // Author byline shown on articles
  author: "Editorial Team",
  // Generic site-level fallback image (used only when a page has no
  // article-specific image, e.g. the homepage's default OG tag)
  heroImage: "https://picsum.photos/seed/positivejamtravel/1200/750",
  ogImage: "https://picsum.photos/seed/positivejamtravel/1200/630",
  // Footer
  legalName: "Positive Jam Travel",
  servingLine: "Independent travel guides",
} as const;

// The `site` column value in Supabase this deployment reads. Every public
// query filters on it, so it must stay unique per deployed site.
export const SITE_KEY = "positivejamtravel";

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

// ---------------------------------------------------------------------------
// App promotion — shown only at the bottom of individual articles (this is a
// third-party news site; LocalPay is an advertiser/partner here, not the
// site's own brand). Keep this separate from SITE.
// ---------------------------------------------------------------------------
export const APP_PROMO = {
  name: "LocalPay",
  appStoreUrl:
    "https://apps.apple.com/app/localpay-stablecoin-wallet/id6745826996",
  googlePlayUrl:
    "https://play.google.com/store/apps/details?id=com.bespoketechnicalleadership.localpayappasia",
} as const;
