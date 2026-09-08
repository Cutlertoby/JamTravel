import Link from "next/link";
import { SITE } from "@/lib/types";
import { categorySlug } from "@/lib/format";

// Magazine masthead: logo, category nav (from live content), search, app CTA.
// Search is a plain GET form so it works without client JS.
export default function SiteHeader({
  categories,
}: {
  categories: string[];
}) {
  const navCats = categories.slice(0, 7);
  return (
    <header className="masthead">
      <div className="container masthead-bar">
        <Link href="/" className="masthead-logo">
          Positive Jam <span className="logo-accent">Travel</span>
        </Link>

        <nav className="masthead-nav" aria-label="Sections">
          <Link href="/">Home</Link>
          {navCats.map((c) => (
            <Link key={c} href={`/category/${categorySlug(c)}`}>
              {c}
            </Link>
          ))}
        </nav>

        <div className="masthead-actions">
          <form className="masthead-search" action="/search" method="GET">
            <input
              type="text"
              name="q"
              placeholder="Search"
              aria-label="Search articles"
            />
            <button type="submit" aria-label="Search">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
