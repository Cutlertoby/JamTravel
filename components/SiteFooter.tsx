import Link from "next/link";
import { SITE } from "@/lib/types";
import { categorySlug } from "@/lib/format";

export default function SiteFooter({
  categories,
}: {
  categories: string[];
}) {
  const cols = categories.slice(0, 6);
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              Positive Jam <span className="logo-accent">Travel</span>
            </div>
            <p className="footer-tagline">{SITE.description}</p>
          </div>

          {cols.length ? (
            <div className="footer-col">
              <h4>Sections</h4>
              {cols.map((c) => (
                <Link key={c} href={`/category/${categorySlug(c)}`}>
                  {c}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="footer-col">
            <h4>{SITE.name}</h4>
            <Link href="/">Home</Link>
            <Link href="/search">Search</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} {SITE.legalName}
          </p>
          <p className="footer-address">{SITE.servingLine}</p>
        </div>
      </div>
    </footer>
  );
}
