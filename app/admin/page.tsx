"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { REST_BASE, supabaseHeaders } from "@/lib/supabase";
import { renderBlogHTML } from "@/lib/articleHtml";
import { formatDate } from "@/lib/format";
import ArticleBody from "@/components/ArticleBody";
import { SITE, SITE_KEY, SITES } from "@/lib/types";
import type { Post, PostStatus, Section } from "@/lib/types";

type Tab =
  | "dashboard"
  | "pending_review"
  | "approved"
  | "published"
  | "rejected"
  | "keywords";

type Bucket = "pending_review" | "approved" | "published" | "rejected";

// Anything that isn't explicitly approved/published/rejected (including the
// pipeline's `pending_review`, a blank status, or a legacy `draft`) counts as
// awaiting review.
function statusOf(p: Post): Bucket {
  const s = (p.status || "").toLowerCase();
  if (s === "approved" || s === "published" || s === "rejected") return s;
  return "pending_review";
}

const STATUS_LABEL: Record<Bucket, string> = {
  pending_review: "Pending",
  approved: "Approved",
  published: "Published",
  rejected: "Rejected",
};

// ---- text <-> structured helpers (mirror the original CRM edit logic) ------
const splitParas = (v: string) =>
  v
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
const splitLines = (v: string) =>
  v
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean);
const parsePairs = (v: string) =>
  splitLines(v).map((line) => {
    const idx = line.indexOf("|");
    if (idx === -1) return { a: line.trim(), b: "" };
    return { a: line.slice(0, idx).trim(), b: line.slice(idx + 1).trim() };
  });

interface EditState {
  title: string;
  slug: string;
  standfirst: string;
  category: string;
  primary_keyword: string;
  meta_description: string;
  quick_answer: string;
  pull_quote: string;
  tip_list_heading: string;
  cta_headline: string;
  cta_subtext: string;
  read_time_minutes: string;
  image_url: string;
  introText: string;
  closingText: string;
  tipsText: string;
  stepsText: string;
  faqsText: string;
  sections: { h2: string; parasText: string }[];
}

function toEditState(p: Post): EditState {
  return {
    title: p.title || "",
    slug: p.slug || "",
    standfirst: p.standfirst || "",
    category: p.category || "",
    primary_keyword: p.primary_keyword || "",
    meta_description: p.meta_description || "",
    quick_answer: p.quick_answer || "",
    pull_quote: p.pull_quote || "",
    tip_list_heading: p.tip_list_heading || "",
    cta_headline: p.cta_headline || "",
    cta_subtext: p.cta_subtext || "",
    read_time_minutes:
      p.read_time_minutes != null ? String(p.read_time_minutes) : "",
    image_url: p.image_url || "",
    introText: (p.intro_paragraphs || []).join("\n\n"),
    closingText: (p.closing_paragraphs || []).join("\n\n"),
    tipsText: (p.tip_list || []).join("\n"),
    stepsText: (p.steps || [])
      .map((s) => `${s.heading || ""} | ${s.body || ""}`)
      .join("\n"),
    faqsText: (p.faqs || [])
      .map((f) => `${f.question || ""} | ${f.answer || ""}`)
      .join("\n"),
    sections: (p.sections || []).map((s) => ({
      h2: s.h2 || "",
      parasText: (s.paragraphs || []).join("\n\n"),
    })),
  };
}

function editToPatch(e: EditState): Partial<Post> {
  const sections: Section[] = e.sections
    .map((s) => ({ h2: s.h2.trim(), paragraphs: splitParas(s.parasText) }))
    .filter((s) => s.h2 || s.paragraphs.length);
  const rt = parseInt(e.read_time_minutes, 10);
  return {
    title: e.title.trim(),
    slug: e.slug.trim(),
    standfirst: e.standfirst.trim(),
    category: e.category.trim(),
    primary_keyword: e.primary_keyword.trim(),
    meta_description: e.meta_description.trim(),
    quick_answer: e.quick_answer.trim(),
    pull_quote: e.pull_quote.trim(),
    tip_list_heading: e.tip_list_heading.trim(),
    cta_headline: e.cta_headline.trim(),
    cta_subtext: e.cta_subtext.trim(),
    read_time_minutes: Number.isFinite(rt) ? rt : null,
    image_url: e.image_url.trim() || null,
    intro_paragraphs: splitParas(e.introText),
    closing_paragraphs: splitParas(e.closingText),
    tip_list: splitLines(e.tipsText),
    steps: parsePairs(e.stepsText).map((x) => ({ heading: x.a, body: x.b })),
    faqs: parsePairs(e.faqsText).map((x) => ({ question: x.a, answer: x.b })),
    sections,
  };
}

// ---- icons ----------------------------------------------------------------
function Icon({ name }: { name: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      );
    case "draft":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      );
    case "approved":
      return (
        <svg {...common}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case "published":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case "rejected":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      );
    case "keywords":
      return (
        <svg {...common}>
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      );
    case "signout":
      return (
        <svg {...common}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
    default:
      return null;
  }
}

export default function AdminDashboard() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");
  // Which site's content this desk is currently working on. Defaults to this
  // deployment's own site; switching it re-scopes the whole dashboard, and
  // anything created while it's set posts to that site instead.
  const [activeSite, setActiveSite] = useState<string>(SITE_KEY);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genPrompt, setGenPrompt] = useState("");
  const [toast, setToast] = useState<{ msg: string; type?: string } | null>(
    null
  );

  const showToast = useCallback((msg: string, type?: string) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setErrored(false);
    try {
      const res = await fetch(
        `${REST_BASE}/posts?select=*&site=eq.${activeSite}&order=created_at.desc`,
        { headers: supabaseHeaders(), cache: "no-store" }
      );
      if (!res.ok) throw new Error(String(res.status));
      setPosts((await res.json()) as Post[]);
    } catch {
      setErrored(true);
      showToast("Could not load posts", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, activeSite]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const byStatus = useMemo(() => {
    const m: Record<Bucket, Post[]> = {
      pending_review: [],
      approved: [],
      published: [],
      rejected: [],
    };
    for (const p of posts) m[statusOf(p)].push(p);
    return m;
  }, [posts]);

  const openPost = useMemo(
    () => posts.find((p) => String(p.id) === openId) || null,
    [posts, openId]
  );

  async function patchPost(id: string | number, patch: Partial<Post>) {
    const res = await fetch(`${REST_BASE}/posts?id=eq.${id}`, {
      method: "PATCH",
      headers: supabaseHeaders({ Prefer: "return=minimal" }),
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(String(res.status));
  }

  async function startNewArticle() {
    setBusy(true);
    try {
      const blank: Partial<Post> = {
        title: "Untitled article",
        slug: `untitled-${Date.now()}`,
        status: "pending_review",
        site: activeSite,
      };
      const res = await fetch(`${REST_BASE}/posts`, {
        method: "POST",
        headers: supabaseHeaders({ Prefer: "return=representation" }),
        body: JSON.stringify(blank),
      });
      if (!res.ok) throw new Error(String(res.status));
      const [created] = (await res.json()) as Post[];
      setPosts((prev) => [created, ...prev]);
      setOpenId(String(created.id));
      setEdit(toEditState(created));
      setEditing(true);
      showToast("New article created — fill it in and save", "success");
    } catch {
      showToast("Couldn't create a new article", "error");
    } finally {
      setBusy(false);
    }
  }

  async function generateArticle() {
    setGenerating(true);
    try {
      const res = await fetch(
        "/.netlify/functions/generate-background",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Generate for whichever site the desk is currently working on,
          // not just this deployment's own site.
          body: JSON.stringify({
            prompt: genPrompt.trim() || null,
            site: activeSite,
          }),
        }
      );
      if (!res.ok) throw new Error(String(res.status));
      setGenPrompt("");
      showToast(
        "Article generation started — it'll appear in Pending shortly",
        "success"
      );
    } catch {
      showToast("Couldn't trigger generation", "error");
    } finally {
      setGenerating(false);
    }
  }

  async function setStatus(p: Post, status: PostStatus, label: string) {
    setBusy(true);
    try {
      await patchPost(p.id, { status });
      setPosts((prev) =>
        prev.map((x) => (String(x.id) === String(p.id) ? { ...x, status } : x))
      );
      showToast(label, "success");
      setOpenId(null);
      setEditing(false);
    } catch {
      showToast("Update failed", "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdits() {
    if (!openPost || !edit) return;
    setBusy(true);
    try {
      const patch = editToPatch(edit);
      await patchPost(openPost.id, patch);
      setPosts((prev) =>
        prev.map((x) =>
          String(x.id) === String(openPost.id) ? { ...x, ...patch } : x
        )
      );
      showToast("Changes saved", "success");
      setEditing(false);
    } catch {
      showToast("Save failed", "error");
    } finally {
      setBusy(false);
    }
  }

  function startEdit() {
    if (!openPost) return;
    setEdit(toEditState(openPost));
    setEditing(true);
  }

  async function resolveImage(post: Post): Promise<string> {
    try {
      const res = await fetch("/api/article-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: post.slug,
          id: post.id,
          title: post.title,
          category: post.category,
          primary_keyword: post.primary_keyword,
        }),
      });
      const data = await res.json();
      return data?.url || "";
    } catch {
      return "";
    }
  }

  async function copyHTML() {
    if (!openPost) return;
    const image = await resolveImage(openPost);
    const html = renderBlogHTML(openPost, window.location.origin, image);
    navigator.clipboard
      .writeText(html)
      .then(() => showToast("HTML copied", "success"))
      .catch(() => showToast("Copy failed", "error"));
  }

  async function downloadHTML() {
    if (!openPost) return;
    const image = await resolveImage(openPost);
    const html = renderBlogHTML(openPost, window.location.origin, image);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${openPost.slug || "article"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function signOut() {
    await fetch("/api/admin-logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  function closeReader() {
    setOpenId(null);
    setEditing(false);
  }

  // ---- nav config ----
  const navItems: { key: Tab; label: string; icon: string; count?: number }[] =
    [
      { key: "dashboard", label: "Dashboard", icon: "dashboard" },
      {
        key: "pending_review",
        label: "Pending",
        icon: "draft",
        count: byStatus.pending_review.length,
      },
      {
        key: "approved",
        label: "Approved",
        icon: "approved",
        count: byStatus.approved.length,
      },
      {
        key: "published",
        label: "Published",
        icon: "published",
        count: byStatus.published.length,
      },
      {
        key: "rejected",
        label: "Rejected",
        icon: "rejected",
        count: byStatus.rejected.length,
      },
      { key: "keywords", label: "Keywords", icon: "keywords" },
    ];

  const listForTab =
    tab === "pending_review"
      ? byStatus.pending_review
      : tab === "approved"
      ? byStatus.approved
      : tab === "published"
      ? byStatus.published
      : tab === "rejected"
      ? byStatus.rejected
      : [];

  return (
    <div className="admin-app">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="mark">
            L<span>P</span>
          </span>
          <span className="admin-brand-name">
            {SITE.name}
            <small>Content desk</small>
          </span>
        </div>

        {/* Which site this desk is posting to. Every deployment reads the same
            Supabase table, so one dashboard can run all of them. */}
        <div className="site-switcher">
          <label htmlFor="site-select">Working on</label>
          <select
            id="site-select"
            value={activeSite}
            onChange={(e) => {
              setActiveSite(e.target.value);
              closeReader();
            }}
          >
            {SITES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
                {s.key === SITE_KEY ? " (this site)" : ""}
              </option>
            ))}
          </select>
          {activeSite !== SITE_KEY ? (
            <p className="site-switcher-note">
              Posting to another site — it won’t appear on this domain.
            </p>
          ) : null}
        </div>

        <nav className="nav-section">
          {navItems.map((it) => (
            <button
              key={it.key}
              className={`nav-item${tab === it.key ? " active" : ""}`}
              onClick={() => {
                setTab(it.key);
                closeReader();
              }}
            >
              <Icon name={it.icon} />
              <span className="nav-item-text">{it.label}</span>
              {typeof it.count === "number" ? (
                <span className="nav-item-count">{it.count}</span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="status-pill">
            <span
              className={`status-dot${
                loading ? " loading" : errored ? " error" : ""
              }`}
            />
            {loading ? "Syncing…" : errored ? "Offline" : "Connected"}
          </div>
          <button className="signout-btn" onClick={signOut}>
            <Icon name="signout" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="admin-main">
        <div className="admin-toolbar">
          <button className="btn btn-secondary" onClick={startNewArticle}>
            <Icon name="draft" />
            New article
          </button>
          <div className="gen-prompt-wrap">
            <textarea
              className="gen-prompt-input"
              placeholder="Optional: suggest a topic, angle, or keyword for the next article…"
              value={genPrompt}
              onChange={(e) => setGenPrompt(e.target.value)}
              rows={2}
            />
            <button
              className="btn btn-primary"
              onClick={generateArticle}
              disabled={generating}
            >
              <Icon name="published" />
              {generating ? "Generating…" : "Generate article"}
            </button>
          </div>
        </div>

        {tab === "dashboard" ? (
          <DashboardView byStatus={byStatus} total={posts.length} />
        ) : tab === "keywords" ? (
          <KeywordsView posts={posts} />
        ) : (
          <ListView
            title={TAB_TITLE[tab as Bucket]}
            subtitle={subtitleFor(tab as Bucket)}
            posts={listForTab}
            loading={loading}
            onOpen={(p) => setOpenId(String(p.id))}
          />
        )}
      </main>

      {/* Reader / editor overlay */}
      {openPost ? (
        <div
          className="reader-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeReader();
          }}
        >
          <div className="reader-panel">
            <div className="reader-head">
              <h2>{editing ? "Edit article" : "Preview"}</h2>
              <button className="reader-close" onClick={closeReader}>
                ×
              </button>
            </div>

            <div className="reader-body">
              {editing && edit ? (
                <EditForm edit={edit} setEdit={setEdit} />
              ) : (
                <PreviewPane post={openPost} />
              )}
            </div>

            <div className="reader-foot">
              <div className="reader-actions">
                {editing ? (
                  <>
                    <button
                      className="btn btn-approve"
                      onClick={saveEdits}
                      disabled={busy}
                    >
                      Save changes
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setEditing(false)}
                      disabled={busy}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    {statusOf(openPost) !== "published" ? (
                      <button
                        className="btn btn-publish"
                        onClick={() =>
                          setStatus(openPost, "published", "Published")
                        }
                        disabled={busy}
                      >
                        Publish
                      </button>
                    ) : null}
                    {statusOf(openPost) === "pending_review" ? (
                      <button
                        className="btn btn-approve"
                        onClick={() =>
                          setStatus(openPost, "approved", "Approved")
                        }
                        disabled={busy}
                      >
                        Approve
                      </button>
                    ) : null}
                    {statusOf(openPost) !== "rejected" ? (
                      <button
                        className="btn btn-reject"
                        onClick={() =>
                          setStatus(openPost, "rejected", "Rejected")
                        }
                        disabled={busy}
                      >
                        Reject
                      </button>
                    ) : null}
                    <button className="btn btn-secondary" onClick={startEdit}>
                      Edit
                    </button>
                  </>
                )}
              </div>

              {!editing ? (
                <div className="reader-actions">
                  <button className="btn btn-secondary" onClick={copyHTML}>
                    Copy HTML
                  </button>
                  <button className="btn btn-secondary" onClick={downloadHTML}>
                    Download HTML
                  </button>
                  {statusOf(openPost) === "published" ? (
                    <a
                      className="btn btn-primary"
                      href={`/article/${openPost.slug}`}
                      target="_blank"
                      rel="noopener"
                    >
                      View live
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className={`toast show ${toast.type || ""}`}>{toast.msg}</div>
      ) : null}
    </div>
  );
}

const TAB_TITLE: Record<Bucket, string> = {
  pending_review: "Pending review",
  approved: "Approved",
  published: "Published",
  rejected: "Rejected",
};

function subtitleFor(status: Bucket): string {
  switch (status) {
    case "pending_review":
      return "Auto-generated articles waiting for review.";
    case "approved":
      return "Reviewed and ready to publish.";
    case "published":
      return "Live on the public site.";
    case "rejected":
      return "Declined drafts, kept for reference.";
  }
}

// ---- Dashboard ----
function DashboardView({
  byStatus,
  total,
}: {
  byStatus: Record<Bucket, Post[]>;
  total: number;
}) {
  const stats = [
    {
      label: "Awaiting review",
      value: byStatus.pending_review.length,
      meta: "Pending",
    },
    { label: "Approved", value: byStatus.approved.length, meta: "Ready to go" },
    {
      label: "Published",
      value: byStatus.published.length,
      meta: "Live now",
    },
    { label: "Total articles", value: total, meta: "All statuses" },
  ];
  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">
            Content pipeline overview for {SITE.name}.
          </div>
        </div>
      </div>
      <div className="stats-row">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-meta">{s.meta}</div>
          </div>
        ))}
      </div>
    </>
  );
}

// ---- List ----
function ListView({
  title,
  subtitle,
  posts,
  loading,
  onOpen,
}: {
  title: string;
  subtitle: string;
  posts: Post[];
  loading: boolean;
  onOpen: (p: Post) => void;
}) {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">{title}</div>
          <div className="page-subtitle">{subtitle}</div>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Loading…</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <h3>Nothing here</h3>
          <p>No articles in this stage right now.</p>
        </div>
      ) : (
        <div className="posts-list">
          {posts.map((p) => (
            <button
              className="post-card"
              key={String(p.id)}
              onClick={() => onOpen(p)}
            >
              <div className="post-info">
                <div className="post-title">{p.title || "Untitled"}</div>
                <div className="post-meta">
                  <span className={`pill pill-status-${statusOf(p)}`}>
                    {STATUS_LABEL[statusOf(p)]}
                  </span>
                  <span className="post-meta-dot">·</span>
                  <span>{p.category || "Uncategorized"}</span>
                  <span className="post-meta-dot">·</span>
                  <span>{formatDate(p.created_at)}</span>
                </div>
              </div>
              {p.primary_keyword ? (
                <span className="pill pill-keyword">{p.primary_keyword}</span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ---- Keywords ----
function KeywordsView({ posts }: { posts: Post[] }) {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Keywords</div>
          <div className="page-subtitle">
            Primary keyword per article — useful for spotting overlap.
          </div>
        </div>
      </div>
      {posts.length === 0 ? (
        <div className="empty-state">
          <p>No articles yet.</p>
        </div>
      ) : (
        <div className="keywords-grid">
          {posts.map((p) => (
            <div className="keyword-card" key={String(p.id)}>
              <div className="keyword-text">{p.primary_keyword || "—"}</div>
              <div className="keyword-meta">
                {p.category || "Uncategorized"} · {STATUS_LABEL[statusOf(p)]} ·{" "}
                {formatDate(p.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// Sync fallback used only for the very first paint in the admin client
// preview, before the Pexels lookup (which needs a server round-trip)
// resolves. Mirrors lib/images.ts's fallback.
function picsumFallback(post: Post, w = 1200, h = 750): string {
  const seed = encodeURIComponent(post.slug || String(post.id) || "article");
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

// ---- Preview pane (reuses public article styles + ArticleBody) ----
function PreviewPane({ post }: { post: Post }) {
  const [image, setImage] = useState<string>(() => picsumFallback(post));

  useEffect(() => {
    let cancelled = false;
    fetch("/api/article-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: post.slug,
        id: post.id,
        title: post.title,
        category: post.category,
        primary_keyword: post.primary_keyword,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.url) setImage(data.url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  return (
    <>
      <div className="meta-info">
        <div className="meta-info-row">
          <div className="meta-info-label">Primary keyword</div>
          <div className="meta-info-value">{post.primary_keyword || "—"}</div>
        </div>
        <div className="meta-info-row">
          <div className="meta-info-label">Slug</div>
          <div className="meta-info-value">/{post.slug || "—"}</div>
        </div>
        <div className="meta-info-row">
          <div className="meta-info-label">Meta description</div>
          <div className="meta-info-value">{post.meta_description || "—"}</div>
        </div>
      </div>

      <div className="article-wrap">
        {post.category ? <span className="cat-badge">{post.category}</span> : null}
        <h1>{post.title || "Untitled"}</h1>
        {post.standfirst ? (
          <p className="standfirst">{post.standfirst}</p>
        ) : null}
        <div className="article-meta">
          <span className="meta-author">
            <span className="meta-avatar">AS</span>
            {SITE.author}
          </span>
          <span className="meta-dot">·</span>
          <span>{formatDate(post.created_at)}</span>
          <span className="meta-dot">·</span>
          <span>{post.read_time_minutes || 5} min read</span>
        </div>
        <div className="hero-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={post.title} />
        </div>
        <ArticleBody post={post} />
        {post.cta_headline ? (
          <div className="article-cta">
            <div>
              <p>{post.cta_headline}</p>
              {post.cta_subtext ? <span>{post.cta_subtext}</span> : null}
            </div>
            <button className="btn-cta-sm" type="button">
              Download the app
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}

// ---- Edit form ----
// ---- Image field: preview + manual URL override + Pexels re-search ----
function ImageField({
  edit,
  setEdit,
}: {
  edit: EditState;
  setEdit: (e: EditState) => void;
}) {
  const [searchTerm, setSearchTerm] = useState(
    edit.primary_keyword || edit.category || edit.title
  );
  const [searching, setSearching] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string>(edit.image_url || "");

  // Keep the live preview in sync if the user pastes a URL directly.
  useEffect(() => {
    setPreviewSrc(edit.image_url || "");
  }, [edit.image_url]);

  async function findPhoto() {
    if (!searchTerm.trim() || searching) return;
    setSearching(true);
    try {
      const res = await fetch("/api/article-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "search-preview",
          id: "search-preview",
          title: searchTerm,
          category: "",
          primary_keyword: searchTerm,
        }),
      });
      const data = await res.json();
      if (data?.url) {
        setEdit({ ...edit, image_url: data.url });
      }
    } catch {
      /* ignore */
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="field-group">
      <label>
        Article image <span className="hint">overrides the automatic photo</span>
      </label>

      {previewSrc ? (
        <div className="image-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewSrc} alt="Article image preview" />
        </div>
      ) : (
        <div className="image-preview image-preview-empty">
          No image set — using the automatic photo
        </div>
      )}

      <input
        type="text"
        placeholder="Paste an image URL, or search below"
        value={edit.image_url}
        onChange={(e) => setEdit({ ...edit, image_url: e.target.value })}
        style={{ marginTop: "0.6rem" }}
      />

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem" }}>
        <input
          type="text"
          placeholder="Search term, e.g. 'ATM Vietnam'"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={findPhoto}
          disabled={searching}
        >
          {searching ? "Searching…" : "Find photo"}
        </button>
        {edit.image_url ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setEdit({ ...edit, image_url: "" })}
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ---- Link insertion toolbar ------------------------------------------------
function LinkToolbar({
  textareaId,
  onInsert,
}: {
  textareaId: string;
  onInsert: (newValue: string) => void;
}) {
  function insertLink() {
    const ta = document.getElementById(textareaId) as HTMLTextAreaElement | null;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.slice(start, end);
    const url = prompt("Enter URL:", "https://");
    if (!url) return;
    const linked = `<a href="${url}" target="_blank" rel="noopener noreferrer">${selected || url}</a>`;
    const next = ta.value.slice(0, start) + linked + ta.value.slice(end);
    onInsert(next);
    // Restore focus and cursor after state update
    setTimeout(() => {
      ta.focus();
      const pos = start + linked.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  }
  return (
    <div className="link-toolbar">
      <button type="button" className="link-btn" onClick={insertLink}>
        🔗 Link
      </button>
    </div>
  );
}

function EditForm({
  edit,
  setEdit,
}: {
  edit: EditState;
  setEdit: (e: EditState) => void;
}) {
  const set = (patch: Partial<EditState>) => setEdit({ ...edit, ...patch });
  const field = (key: keyof EditState) => ({
    value: edit[key] as string,
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => set({ [key]: e.target.value } as Partial<EditState>),
  });

  return (
    <div className="edit-form">
      <div className="field-group">
        <label>Title</label>
        <input type="text" {...field("title")} />
      </div>
      <div className="field-group">
        <label>
          Slug <span className="hint">URL path</span>
        </label>
        <input type="text" {...field("slug")} />
      </div>
      <div className="field-group">
        <label>Category</label>
        <input type="text" {...field("category")} />
      </div>
      <div className="field-group">
        <label>Primary keyword</label>
        <input type="text" {...field("primary_keyword")} />
      </div>
      <div className="field-group">
        <label>
          Read time <span className="hint">minutes</span>
        </label>
        <input type="number" {...field("read_time_minutes")} />
      </div>
      <div className="field-group">
        <label>Meta description</label>
        <textarea rows={2} {...field("meta_description")} />
      </div>
      <div className="field-group">
        <label>Standfirst</label>
        <textarea rows={2} {...field("standfirst")} />
      </div>

      <hr className="form-divider" />

      <ImageField edit={edit} setEdit={setEdit} />

      <hr className="form-divider" />

      <div className="field-group">
        <label>
          Intro paragraphs <span className="hint">blank line between</span>
        </label>
        <LinkToolbar textareaId="ta-intro" onInsert={(v) => set({ introText: v })} />
        <textarea id="ta-intro" rows={6} {...field("introText")} />
      </div>
      <div className="field-group">
        <label>Quick answer</label>
        <textarea rows={3} {...field("quick_answer")} />
      </div>

      <hr className="form-divider" />

      <label style={{ fontWeight: 700, marginBottom: "0.5rem" }}>
        Sections
      </label>
      {edit.sections.map((s, i) => (
        <div className="section-block" key={i}>
          <label>Heading</label>
          <input
            type="text"
            value={s.h2}
            onChange={(e) => {
              const next = edit.sections.slice();
              next[i] = { ...next[i], h2: e.target.value };
              set({ sections: next });
            }}
          />
          <label>
            Paragraphs <span className="hint">blank line between</span>
          </label>
          <LinkToolbar textareaId={`ta-sec-${i}`} onInsert={(v) => {
            const next = edit.sections.slice();
            next[i] = { ...next[i], parasText: v };
            set({ sections: next });
          }} />
          <textarea
            id={`ta-sec-${i}`}
            rows={5}
            value={s.parasText}
            onChange={(e) => {
              const next = edit.sections.slice();
              next[i] = { ...next[i], parasText: e.target.value };
              set({ sections: next });
            }}
          />
          <button
            className="btn btn-reject"
            style={{ marginTop: "0.5rem" }}
            onClick={() =>
              set({ sections: edit.sections.filter((_, j) => j !== i) })
            }
          >
            Remove section
          </button>
        </div>
      ))}
      <button
        className="btn btn-secondary"
        style={{ marginBottom: "0.5rem" }}
        onClick={() =>
          set({ sections: [...edit.sections, { h2: "", parasText: "" }] })
        }
      >
        + Add section
      </button>

      <hr className="form-divider" />

      <div className="field-group">
        <label>Pull quote</label>
        <textarea rows={3} {...field("pull_quote")} />
      </div>
      <div className="field-group">
        <label>
          Steps <span className="hint">one per line: heading | body</span>
        </label>
        <textarea rows={5} {...field("stepsText")} />
      </div>
      <div className="field-group">
        <label>Tips heading</label>
        <input type="text" {...field("tip_list_heading")} />
      </div>
      <div className="field-group">
        <label>
          Tips <span className="hint">one per line</span>
        </label>
        <textarea rows={5} {...field("tipsText")} />
      </div>
      <div className="field-group">
        <label>
          FAQs <span className="hint">one per line: question | answer</span>
        </label>
        <textarea rows={6} {...field("faqsText")} />
      </div>

      <hr className="form-divider" />

      <div className="field-group">
        <label>Closing paragraphs</label>
        <LinkToolbar textareaId="ta-closing" onInsert={(v) => set({ closingText: v })} />
        <textarea id="ta-closing" rows={5} {...field("closingText")} />
      </div>
      <div className="field-group">
        <label>CTA headline</label>
        <input type="text" {...field("cta_headline")} />
      </div>
      <div className="field-group">
        <label>CTA subtext</label>
        <input type="text" {...field("cta_subtext")} />
      </div>
    </div>
  );
}
