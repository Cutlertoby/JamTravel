import { SITE, APP_PROMO } from "@/lib/types";
import { formatDate } from "@/lib/format";
import type { Post } from "@/lib/types";

// Faithful port of the CRM's renderBlogHTML(): produces a complete, standalone
// HTML page for a single article (used by the admin "Copy HTML" / "Download
// HTML" buttons). Same markup + styles as before; the QR images now load from
// the deployed site rather than being inlined as base64.

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderBlogHTML(p: Post, base: string, heroImage: string): string {
  const NL = "\n";
  const intro = (p.intro_paragraphs || [])
    .map((t) => "    <p>" + esc(t) + "</p>")
    .join(NL);
  const sections = (p.sections || [])
    .map((s) => {
      const h = "    <h2>" + esc(s.h2 || "") + "</h2>";
      const paras = (s.paragraphs || [])
        .map((t) => "    <p>" + esc(t) + "</p>")
        .join(NL);
      return h + NL + paras;
    })
    .join(NL);
  const closing = (p.closing_paragraphs || [])
    .map((t) => "    <p>" + esc(t) + "</p>")
    .join(NL);
  const tips = (p.tip_list || [])
    .map((t) => "      <li>" + esc(t) + "</li>")
    .join(NL);
  const stepsBlock =
    p.steps && p.steps.length
      ? "    <h2>Step-by-step</h2>" +
        NL +
        '    <ol class="steps-list">' +
        NL +
        p.steps
          .map(
            (s) =>
              "      <li><strong>" +
              esc(s.heading || "") +
              "</strong><p>" +
              esc(s.body || "") +
              "</p></li>"
          )
          .join(NL) +
        NL +
        "    </ol>"
      : "";
  const faqsBlock =
    p.faqs && p.faqs.length
      ? "    <h2>Frequently asked questions</h2>" +
        NL +
        '    <div class="faqs">' +
        NL +
        p.faqs
          .map(
            (f) =>
              '      <div class="faq"><strong>' +
              esc(f.question || "") +
              "</strong><p>" +
              esc(f.answer || "") +
              "</p></div>"
          )
          .join(NL) +
        NL +
        "    </div>"
      : "";
  const quickAnswerBlock = p.quick_answer
    ? '    <div class="quick-answer"><strong>Quick answer</strong><p>' +
      esc(p.quick_answer) +
      "</p></div>"
    : "";
  const dateFormatted = formatDate(p.created_at);
  const title = esc(p.title || "");
  const metaDesc = esc(p.meta_description || "");
  const category = esc(p.category || "");
  const standfirst = esc(p.standfirst || "");
  const readTime = p.read_time_minutes || 5;
  const pullQuote = p.pull_quote
    ? '    <div class="pull-quote"><p>"' + esc(p.pull_quote) + '"</p></div>'
    : "";
  const tipHeading = p.tip_list_heading
    ? "    <h2>" + esc(p.tip_list_heading) + "</h2>"
    : "";
  const tipsBlock = tips ? "    <ul>" + NL + tips + NL + "    </ul>" : "";
  const ctaBlock = p.cta_headline
    ? '  <div class="article-cta"><div><p>' +
      esc(p.cta_headline) +
      "</p><span>" +
      esc(p.cta_subtext || "") +
      '</span></div><button class="btn-cta-sm">Download the app</button></div>'
    : "";

  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8"/>',
    '<meta name="viewport" content="width=device-width, initial-scale=1"/>',
    "<title>" + title + " \u2014 " + esc(SITE.name) + "</title>",
    '<meta name="description" content="' + metaDesc + '"/>',
    '<meta property="og:title" content="' + title + '"/>',
    '<meta property="og:description" content="' + metaDesc + '"/>',
    '<meta property="og:image" content="' + esc(heroImage) + '"/>',
    '<meta property="og:type" content="article"/>',
    "<style>",
    "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}",
    "html{scroll-behavior:smooth}",
    'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#111;background:#fff;-webkit-font-smoothing:antialiased}',
    "a{text-decoration:none;color:inherit}",
    "img{max-width:100%;display:block}",
    ".container{max-width:1200px;margin:0 auto;padding:0 1.5rem}",
    "header{position:sticky;top:0;width:100%;z-index:50;background:#fff;padding:1.25rem 0;border-bottom:1px solid #f0f0f0}",
    ".header-inner{display:flex;align-items:center;justify-content:space-between}",
    ".logo{font-size:1.25rem;font-weight:600;color:#000}",
    ".btn-download{display:inline-flex;align-items:center;gap:.5rem;background:#111;color:#fff;padding:.5rem 1rem;border-radius:8px;font-size:.875rem;font-weight:500;cursor:pointer;border:none}",
    ".article-wrap{max-width:720px;margin:0 auto;padding:3.5rem 1.5rem 5rem}",
    ".cat-badge{display:inline-flex;align-items:center;gap:.4rem;background:#eef3f8;color:#0b3d6b;padding:.35rem .875rem;border-radius:9999px;font-size:.8rem;font-weight:500;border:1px solid #c7d7e6;margin-bottom:1rem}",
    ".article-wrap h1{font-size:clamp(1.75rem,4vw,2.5rem);font-weight:700;line-height:1.2;color:#000;margin-bottom:1rem;letter-spacing:-.02em}",
    ".standfirst{font-size:1.125rem;color:#4b5563;line-height:1.6;margin-bottom:1.5rem}",
    ".article-meta{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;font-size:.8rem;color:#9ca3af;margin-bottom:2rem;padding-bottom:1.75rem;border-bottom:1px solid #f0f0f0}",
    ".meta-dot{color:#e5e7eb}",
    ".meta-author{display:inline-flex;align-items:center;gap:.5rem;font-weight:500;color:#374151}",
    ".meta-avatar{width:24px;height:24px;border-radius:50%;background:#111;color:#fff;font-size:.625rem;font-weight:600;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}",
    ".hero-img{width:100%;height:150px;background:#f3f4f6;border-radius:.875rem;overflow:hidden;margin-bottom:2.5rem}",
    ".hero-img img{width:100%;height:100%;object-fit:cover}",
    ".article-body{line-height:1.85;font-size:1.0625rem;color:#1f2937}",
    ".article-body p{margin-bottom:1.5rem}",
    ".article-body h2{font-size:1.25rem;font-weight:700;color:#000;margin:2.75rem 0 .875rem;line-height:1.3;letter-spacing:-.01em}",
    ".article-body ul{margin:0 0 1.5rem 0;list-style:none}",
    ".article-body ul li{display:flex;align-items:flex-start;gap:.75rem;margin-bottom:.75rem;line-height:1.7}",
    '.article-body ul li::before{content:"";width:6px;height:6px;border-radius:50%;background:#0b3d6b;flex-shrink:0;margin-top:.6rem}',
    ".pull-quote{border-left:3px solid #0b3d6b;padding:1.25rem 1.5rem;margin:2.5rem 0;background:#f9fafb;border-radius:0 .75rem .75rem 0}",
    ".pull-quote p{font-size:1.125rem;font-style:italic;color:#374151;margin:0;line-height:1.7}",
    ".article-cta{background:#f9fafb;border:1px solid #f0f0f0;border-radius:1rem;padding:2rem;margin:3rem 0 0;display:flex;align-items:center;justify-content:space-between;gap:1.5rem;flex-wrap:wrap}",
    ".article-cta p{font-weight:600;font-size:1rem;color:#000;margin:0}",
    ".article-cta span{font-size:.875rem;color:#6b7280;font-weight:400;display:block;margin-top:.25rem}",
    ".btn-cta-sm{background:#000;color:#fff;padding:.75rem 1.5rem;border-radius:9999px;font-size:.875rem;font-weight:500;border:none;cursor:pointer;white-space:nowrap;flex-shrink:0}",
    ".quick-answer{background:#eef3f8;border:1px solid #c7d7e6;border-radius:.625rem;padding:1rem 1.25rem;margin:0 0 2rem;color:#0b3d6b}",
    ".quick-answer strong{display:block;margin-bottom:.5rem;color:#082b4d;font-size:.8125rem;text-transform:uppercase;letter-spacing:.05em}",
    ".quick-answer p{margin:0;line-height:1.6}",
    ".steps-list{list-style:none;counter-reset:step;margin:1rem 0 2rem 0;padding:0}",
    ".steps-list li{counter-increment:step;position:relative;padding-left:3rem;margin-bottom:1.25rem}",
    ".steps-list li::before{content:counter(step);position:absolute;left:0;top:0;width:2rem;height:2rem;border-radius:50%;background:#0b3d6b;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700}",
    ".steps-list li strong{display:block;color:#000;margin-bottom:.25rem}",
    ".faqs{margin:1rem 0 2rem 0}",
    ".faq{background:#fafafa;border-radius:.625rem;padding:1rem 1.25rem;margin-bottom:.75rem}",
    ".faq strong{display:block;color:#000;margin-bottom:.5rem}",
    ".faq p{margin:0;color:#4b5563}",
    ".modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100;align-items:center;justify-content:center;padding:1rem}",
    ".modal-overlay.active{display:flex}",
    ".modal{background:#fff;border-radius:1.25rem;padding:2rem;max-width:480px;width:100%;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.15)}",
    ".modal-close{position:absolute;top:1rem;right:1.25rem;background:none;border:none;cursor:pointer;color:#9ca3af;font-size:1.25rem;line-height:1;padding:.25rem}",
    ".modal-close:hover{color:#111}",
    ".modal h2{font-size:1.375rem;font-weight:700;color:#000;margin-bottom:1.5rem;letter-spacing:-.01em}",
    ".modal-stores{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-bottom:1.25rem}",
    ".modal-store{display:flex;flex-direction:column;align-items:center;gap:.875rem}",
    ".modal-store img{width:130px;height:130px;border-radius:.5rem}",
    ".btn-appstore,.btn-googleplay{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;color:#fff;padding:.75rem 1.25rem;border-radius:9999px;font-size:.9rem;font-weight:600;border:none;cursor:pointer;width:100%;text-decoration:none}",
    ".btn-appstore{background:#000}",
    ".btn-googleplay{background:#1a73e8}",
    ".modal-hint{text-align:center;font-size:.8rem;color:#9ca3af;margin-top:.25rem}",
    "footer{background:#000;color:#fff;padding:2.5rem 0}",
    ".footer-grid{display:grid;grid-template-columns:1fr 1fr;gap:2.5rem;margin-bottom:3rem}",
    ".footer-tagline,.footer-links a,.footer-bottom p,.footer-address{color:#9ca3af;font-size:.875rem}",
    ".footer-links a{margin-right:1rem}",
    ".footer-bottom{border-top:1px solid #1f2937;padding-top:2rem;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:1rem}",
    "@media (max-width:640px){.footer-grid{grid-template-columns:1fr}.footer-bottom{flex-direction:column}.hero-img{height:110px}.article-cta{flex-direction:column;align-items:flex-start}}",
    "</style>",
    "</head>",
    "<body>",
    '<header><div class="container"><div class="header-inner"><a href="/" class="logo">' +
      esc(SITE.name) +
      '</a><button class="btn-download">Download</button></div></div></header>',
    '<div class="article-wrap">',
    '  <span class="cat-badge">' + category + "</span>",
    "  <h1>" + title + "</h1>",
    '  <p class="standfirst">' + standfirst + "</p>",
    '  <div class="article-meta"><span class="meta-author"><span class="meta-avatar">NM</span>' +
      esc(SITE.author) +
      '</span><span class="meta-dot">\u00b7</span><span>' +
      dateFormatted +
      '</span><span class="meta-dot">\u00b7</span><span>' +
      readTime +
      " min read</span></div>",
    '  <div class="hero-img"><img src="' +
      esc(heroImage) +
      '" alt="' +
      title +
      '"/></div>',
    '  <div class="article-body">',
    quickAnswerBlock,
    intro,
    sections,
    pullQuote,
    stepsBlock,
    tipHeading,
    tipsBlock,
    closing,
    faqsBlock,
    "  </div>",
    ctaBlock,
    "</div>",
    '<footer><div class="container"><div class="footer-grid"><div><div style="font-size:1.25rem;font-weight:600;color:#fff;margin-bottom:.75rem">' +
      esc(SITE.name) +
      '</div><p class="footer-tagline">' +
      esc(SITE.tagline) +
      '</p></div><div class="footer-links" style="padding-top:.25rem"><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Service</a></div></div><div class="footer-bottom"><p>\u00a9 ' +
      new Date().getFullYear() +
      " " +
      esc(SITE.legalName) +
      '</p><p class="footer-address">' +
      esc(SITE.servingLine) +
      "</p></div></div></footer>",
    "<!-- Download Modal -->",
    '<div class="modal-overlay" id="downloadModal">',
    '  <div class="modal">',
    '    <button class="modal-close" onclick="closeModal()">&times;</button>',
    "    <h2>Get the " + esc(APP_PROMO.name) + " app</h2>",
    '    <div class="modal-stores">',
    '      <div class="modal-store">',
    '        <img src="' + base + '/qr-ios.webp" alt="iOS QR"/>',
    '        <a href="' +
      esc(APP_PROMO.appStoreUrl) +
      '" target="_blank" class="btn-appstore">App Store</a>',
    "      </div>",
    '      <div class="modal-store">',
    '        <img src="' + base + '/qr-android.webp" alt="Android QR"/>',
    '        <a href="' +
      esc(APP_PROMO.googlePlayUrl) +
      '" target="_blank" class="btn-googleplay">Google Play</a>',
    "      </div>",
    "    </div>",
    '    <p class="modal-hint">Scan the QR code or click the button to download</p>',
    "  </div>",
    "</div>",
    "<script>",
    '  function openModal(){document.getElementById("downloadModal").classList.add("active");document.body.style.overflow="hidden"}',
    '  function closeModal(){document.getElementById("downloadModal").classList.remove("active");document.body.style.overflow=""}',
    '  document.getElementById("downloadModal").addEventListener("click",function(e){if(e.target===this)closeModal()})',
    '  document.addEventListener("keydown",function(e){if(e.key==="Escape")closeModal()})',
    '  document.querySelectorAll(".btn-download,.btn-cta-sm").forEach(function(b){b.addEventListener("click",openModal)})',
    "<\/script>",
    "</body>",
    "</html>",
  ].join(NL);
}
