# Positive Jam Travel

A single Next.js app that serves **two things at once**:

1. **A public news site** (TechBullion-style magazine layout) that publishes the
   SEO articles your Make.com pipeline generates.
2. **A password-protected admin dashboard** at `/admin` — your existing CRM, now
   built into the same app, for reviewing, editing, approving, and publishing
   drafts.

Both read from the **same Supabase database** the Make.com automation already
writes to. Nothing about the pipeline changes — drafts keep landing in Supabase,
and they show up in the admin **Drafts** tab for approval. The public site only
ever shows articles with `status = published`.

---

## This deployment

- **Site key:** `positivejamtravel` — every public query filters on `site = 'positivejamtravel'`
  in the shared Supabase `posts` table. Set via `SITE_KEY` in `lib/types.ts`.
- **Branding:** `SITE` in `lib/types.ts` (name, tagline, description, footer).
- **Design:** `app/globals.css` — tokens in `:root`, plus a "POSITIVE JAM TRAVEL — theme
  layer" section at the bottom of the file that overrides the defaults.
- Articles for this site must be created with `site = 'positivejamtravel'`, otherwise
  they will not appear here.

### Netlify setup

1. Push this folder to a new Git repo and connect it in Netlify (build command
   `npm run build`, publish dir `.next` — already set in `netlify.toml`).
2. Set environment variables in Netlify:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `ADMIN_PASSWORD`, `NEXT_PUBLIC_SITE_URL`, and optionally `PEXELS_API_KEY`.
3. `NEXT_PUBLIC_SITE_URL` must be the live domain — it drives canonical URLs,
   the sitemap and OG tags.

---

## How it fits together

```
Make.com  ──writes drafts──▶  Supabase (posts table)
                                   │
                         ┌─────────┴──────────┐
                         ▼                    ▼
                 /admin (gated)         public site
            review/edit/approve/    only status=published
                  publish
```

- **Public pages** are server-rendered and statically generated for SEO, with
  per-article `<title>`/meta, canonical URLs, Open Graph tags, and JSON-LD
  (`Article` + `FAQPage`) structured data.
- **Article pages** reuse your existing template styling exactly (green accent,
  quick-answer box, numbered steps, FAQ blocks, QR download modal).
- **Admin** is the same CRM workflow: Drafts → Approved → Published / Rejected,
  with live preview, full edit form, and Copy/Download HTML.

---

## 1. Run locally

```bash
npm install
cp .env.example .env.local   # then edit values (see below)
npm run dev                  # http://localhost:3000
```

- Public site: `http://localhost:3000`
- Admin: `http://localhost:3000/admin` (you'll be sent to `/admin/login`)

## 2. Environment variables

Set these in `.env.local` for local dev, and in **Netlify → Site settings →
Environment variables** for production.

| Variable | What it is |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The Supabase **publishable / anon** key (safe to expose, gated by RLS — same key the current CRM uses). |
| `ADMIN_PASSWORD` | The password for the `/admin` dashboard. **Set a strong one.** |
| `NEXT_PUBLIC_SITE_URL` | Your live URL, e.g. `https://your-site.netlify.app`. Used for canonical URLs, sitemap, and OG tags. |
| `PEXELS_API_KEY` | Free key from [pexels.com/api](https://www.pexels.com/api/) — each article fetches a topically relevant photo (searched by its keyword/category). Omit it and articles fall back to a stable but generic placeholder photo. |

The current values are pre-filled as defaults in `lib/` so the app works out of
the box, but you should override them with your own (especially `ADMIN_PASSWORD`
and `NEXT_PUBLIC_SITE_URL`).

## 3. Supabase

No migration needed — the app reads the **existing** `posts` table your pipeline
already populates. It expects these fields (all already present): `id, title,
slug, standfirst, category, primary_keyword, meta_description, intro_paragraphs,
quick_answer, sections, pull_quote, steps, tip_list_heading, tip_list, faqs,
closing_paragraphs, cta_headline, cta_subtext, read_time_minutes, status,
created_at`.

Make sure your RLS policies allow:
- **read** of `posts` with the anon key (for the public site), and
- **update** of `posts` with the anon key (for admin approve/publish/edit) —
  this is what the current CRM already relies on.

---

## 4. Deploy to Netlify with GitHub CI/CD

This is the "push to GitHub → auto-deploy" flow.

### a. Push this project to GitHub
```bash
git init
git add .
git commit -m "LocalPay news site + admin"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

### b. Connect the repo to Netlify
1. Netlify → **Add new site → Import an existing project**.
2. Choose **GitHub** and pick this repo.
3. Build settings are read from `netlify.toml` automatically:
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Plugin: `@netlify/plugin-nextjs` (Netlify installs it on first build).
4. Before the first deploy, add the **environment variables** from the table
   above (Site configuration → Environment variables).
5. Click **Deploy**.

### c. That's the CI/CD
From now on, **every push to `main` triggers a new Netlify build and deploy** —
no manual uploads. Pull requests get deploy previews automatically.

> Replacing the existing Netlify site: either point this new repo at your current
> Netlify site (Site configuration → Build & deploy → link repository), or create
> a fresh site and move the domain over once you're happy.

---

## Project structure

```
app/
  (public)/            public site (shares masthead + footer)
    page.tsx           homepage
    article/[slug]/    article pages (SEO + JSON-LD)
    category/[slug]/   category listings
    search/            search results
  admin/               gated dashboard
    page.tsx           the CRM (review/edit/approve/publish)
    login/             password sign-in
    admin.css          admin styles
  api/                 login/logout (sets an httpOnly cookie)
  layout.tsx           root layout (fonts, base metadata)
  globals.css          public + article styles
  sitemap.ts robots.ts
components/             header, footer, modal, cards, ArticleBody
lib/                    supabase REST, data access, types, helpers
middleware.ts           protects /admin/*
```

## Notes

- The admin password gate hides the dashboard UI. The real data boundary is your
  Supabase RLS — keep those policies tight.
- Articles have no per-image field, so cards use on-brand gradient tiles and the
  featured hero uses your existing travel photo. If you later add an `image_url`
  column, wire it into `components/cards.tsx` and the article hero.
- "Copy HTML" / "Download HTML" still work in admin for exporting a standalone
  page, same as the old CRM.
```
