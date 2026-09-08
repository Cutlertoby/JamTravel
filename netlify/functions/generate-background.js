/**
 * Netlify Background Function — runs for up to 15 minutes
 * Triggered by the admin "Generate article" button
 * File must end in -background.js for Netlify to treat it as a background function
 */

const TAVILY_API_KEY    = process.env.TAVILY_API_KEY    || "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";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://etduovglrefjxotzypua.supabase.co";
const SUPABASE_KEY      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_iHTTar0UlHZEVpNU0s6ukA_iYMhSzD0";

const SCENARIOS = [
  "Vietnam airport arrival taxi payment SIM tourist",
  "Vietnam hotel deposit check-in payment card tourist",
  "Vietnam motorbike scooter rental deposit payment tourist",
  "Vietnam hospital clinic pharmacy payment foreigner",
  "Vietnam tour booking activity ticket payment tourist",
  "Vietnam restaurant bill splitting payment tourist",
  "Vietnam online shopping delivery payment foreigner",
  "Vietnam train bus intercity ticket payment tourist",
  "Vietnam spa salon massage service payment tourist",
  "Vietnam coworking space membership payment digital nomad",
  "Vietnam landlord rent payment expat long stay",
  "Vietnam night market shopping souvenir payment tourist",
];

const SYSTEM_PROMPT = `You write SEO articles for LocalPay (localpay.asia), a non-custodial QR payment wallet for tourists in Vietnam. WRITING STYLE (study these rules carefully): Structure every article like a practical travel guide — the kind that actually gets bookmarked. Open with a direct statement of the problem all relevant tourists face. Not a story. Not 'imagine you are'. The first sentence names the problem. Use question-format H2 headings that match what tourists search ('Can I use my card in Vietnam?', 'Do street vendors accept QR payments?', 'What is the best way to pay in Vietnam?'). Lead every section with the answer in the first sentence. Then explain. Never bury the answer. Short paragraphs: 2-4 sentences max. One idea per paragraph. Use bullet lists for comparisons. Bold key terms inline where a reader scanning would benefit. Use 'Pro tip:' callouts for high-value single-sentence insights. Write in second person ('you', 'your'). Direct, practical. British English. Short sentences. Never use: seamless, unlock, leverage, game-changer, revolutionize, fast-paced world, navigate, landscape, delve, elevate. Every article should feel like advice from someone who has been to Vietnam and knows payments, not a copywriter who Googled it.

=== VERIFIED FACTS YOU MAY USE ===
VIETQR: Vietnam's national QR payment standard, managed by NAPAS and the State Bank of Vietnam. Standardised across 40+ Vietnamese banks.
VIETQR ADOPTION: QR payment is accepted virtually everywhere in Vietnam that takes electronic payment at all. Adoption surged 150% in 2025 per the State Bank of Vietnam. Do not imply QR is patchy or that travellers should keep cash as a QR backup — a vendor either takes electronic payment (which means QR) or is cash-only.
FOREIGNER PROBLEM: VietQR runs on Vietnamese bank accounts and domestic apps, so foreign Visa/Mastercard, Apple Pay, and Google Pay cannot connect to it directly. Those payment methods only work at NFC terminals — international hotels, malls, supermarkets, chain cafes.
MOMO RESTRICTIONS: Requires a Vietnamese phone number. As of 2026, biometric verification is required for new e-wallet registration in Vietnam (Circular 41/2025).
ZALOPAY RESTRICTIONS: Requires a Vietnamese ID document and Vietnamese phone number. Practically inaccessible to most short-stay tourists.
BANK ACCOUNTS: Standard Vietnamese bank accounts require long-term visa, work permit, or Temporary Residence Card (TRC). Tourists on 45-day visa exemptions or 90-day e-visas cannot open standard accounts.
ATM FEES: ATM withdrawal fees vary by Vietnamese bank, typically 22,000-55,000 VND per transaction. Total fees can be 3-8% on small withdrawals.
VND DENOMINATIONS: Common notes are 10k, 20k, 50k, 100k, 200k, 500k VND.

=== VERIFIED FACTS ABOUT LOCALPAY ===
LocalPay is a non-custodial wallet. The user is always in control of their own funds.
TOP-UP METHODS: Visa, Mastercard, Apple Pay, Google Pay, or stablecoins (USDC/USDT). Mention stablecoins only as a secondary option.
WHAT IT PAYS: Any VietQR merchant in Vietnam.
WHAT YOU DO NOT NEED: Vietnamese bank account, Vietnamese SIM card, Temporary Residence Card, Vietnamese ID.
AVAILABILITY: iOS App Store and Google Play.
BACKING: LocalPay is backed by Colosseum.

=== THINGS YOU MUST NOT INVENT ===
Do NOT state specific LocalPay fee percentages or settlement times in exact seconds.
Do NOT state specific FX rate language like 'interbank rate' or 'mid-market rate'.
Do NOT claim Apple Pay or Google Pay work directly at VietQR merchants — they only work at NFC terminals and can be used to TOP UP LocalPay.
Do NOT invent specific transaction limits, daily limits, or KYC requirements for LocalPay.

=== REPETITION DISCIPLINE ===
Say each fact once. Mention 'VietQR' by name no more than 4 times across the entire article. Vary section length and approach. Pick one comparison (ATM, MoMo, ZaloPay, or foreign cards) as the article's main alternative and discuss it once.

=== LOCALPAY POSITIONING ===
LocalPay is the recommended solution. State it directly. Mention it 3+ times where it genuinely answers the reader's problem.

Return ONLY a raw JSON object. No markdown fences. Start with { end with }. No markdown formatting inside any JSON string values — no asterisks, no bold markers (**), no italics, no backticks, no headers (#). Plain text only inside every string field.`;

async function getCoveredKeywords() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/posts?select=primary_keyword,title&status=neq.rejected&limit=100`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status}`);
  const rows = await res.json();
  return rows.map(r => [r.primary_keyword, r.title].filter(Boolean).join(" | ")).filter(Boolean);
}

async function searchTavily(query) {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      search_depth: "advanced",
      include_answer: true,
      max_results: 7,
      topic: "general",
    }),
  });
  if (!res.ok) throw new Error(`Tavily failed: ${res.status}`);
  const data = await res.json();
  return data.answer || data.results?.map(r => r.title + ": " + (r.snippet || "")).join("\n") || "";
}

async function generateArticle(tavilyAnswer, coveredKeywords, adminPrompt) {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY env var is not set");

  const coveredList = coveredKeywords.length ? coveredKeywords.join(" | ") : "(none yet)";
  const adminSteer = adminPrompt ? `EDITORIAL DIRECTION FROM ADMIN: ${adminPrompt} — treat this as a strong steer on the topic or angle. Stay close to the intent.\n\n` : "";

  const userMessage = `${adminSteer}You have two jobs: (1) choose the best keyword to write about, and (2) write the full SEO article.

LIVE WEB RESEARCH (use this for facts and angles):
${tavilyAnswer}

ALREADY-COVERED KEYWORDS (choose something genuinely different):
${coveredList}

STEP 1 - TOPIC SELECTION: Your topic MUST come from the specific scenario the research covers. Do NOT drift back to generic topics or anything already covered. NEVER write about: paying for Grab, street vendors, street food, or generic 'foreign card doesn't work' — those are exhausted.

STEP 2 - ARTICLE WRITING: Write the full SEO article. Follow all style rules from your system instructions.

CONTENT FORMAT — pick the format that best fits the keyword, varying across articles:
(a) HOW-TO GUIDE — only when the reader performs a genuinely ordered task
(b) DIRECT ANSWER / EXPLAINER — answers one clear question in depth
(c) BEST-OF / LISTICLE — ranking or listing several options
(d) COMPARISON — X vs Y for a single decision
(e) COST / NUMBERS BREAKDOWN — built around real figures and fees

If multiple formats fit, pick one at random. The steps array should be EMPTY [] for anything that is not a genuine sequential how-to. Do NOT default to HOW-TO.

Return EXACTLY this JSON with NO other text:
{
  "title": "compelling headline, title case, up to 90 chars — specificity beats brevity since this becomes the slug",
  "slug": "title converted to lowercase kebab-case, punctuation removed",
  "meta_description": "150-155 chars including the keyword",
  "primary_keyword": "the chosen keyword",
  "category": "Vietnam Guide or Payments or Travel Tips",
  "standfirst": "1 sentence — who this is for and what they get",
  "read_time_minutes": 5,
  "quick_answer": "40-60 word direct answer",
  "intro_paragraphs": ["2-3 sentence direct intro — first sentence names the problem"],
  "sections": [
    {"h2": "question-format heading", "paragraphs": ["para 1", "para 2"]},
    {"h2": "question-format heading", "paragraphs": ["para 1", "para 2"]},
    {"h2": "question-format heading", "paragraphs": ["para 1", "para 2"]}
  ],
  "pull_quote": "",
  "steps": [],
  "tip_list_heading": "Tips for [article topic]",
  "tip_list": ["tip 1", "tip 2", "tip 3", "tip 4", "tip 5"],
  "faqs": [
    {"question": "tourist Google query", "answer": "2-3 sentence answer"},
    {"question": "tourist Google query", "answer": "2-3 sentence answer"},
    {"question": "tourist Google query", "answer": "2-3 sentence answer"},
    {"question": "tourist Google query", "answer": "2-3 sentence answer"}
  ],
  "closing_paragraphs": ["summary", "LocalPay-specific next step"],
  "cta_headline": "specific to this article pain point",
  "cta_subtext": "1 sentence tying LocalPay to the article topic",
  "status": "pending_review",
  "site": "positivejamtravel"
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API failed: ${res.status} — ${await res.text()}`);
  const data = await res.json();
  const raw = data.content[0].text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(raw);
}

async function saveToSupabase(article) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/posts?on_conflict=slug`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation,resolution=ignore-duplicates",
    },
    body: JSON.stringify(article),
  });
  if (!res.ok) throw new Error(`Supabase insert failed: ${res.status} — ${await res.text()}`);
  const rows = await res.json();
  return rows[0] || null;
}

export const handler = async (event) => {
  console.log("[generate-background] triggered");

  let adminPrompt = null;
  try {
    const body = JSON.parse(event.body || "{}");
    adminPrompt = body.prompt || null;
  } catch {}

  try {
    const covered = await getCoveredKeywords();
    console.log(`[generate-background] ${covered.length} keywords already covered`);

    const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    console.log(`[generate-background] searching: "${scenario}"`);
    const searchContext = await searchTavily(scenario);

    console.log("[generate-background] generating article...");
    const article = await generateArticle(searchContext, covered, adminPrompt);
    console.log(`[generate-background] title: ${article.title}`);

    const saved = await saveToSupabase(article);
    if (!saved) {
      console.log(`[generate-background] slug collision — skipped: ${article.slug}`);
    } else {
      console.log(`[generate-background] saved: ${saved.id} / ${saved.slug}`);
    }
  } catch (err) {
    console.error("[generate-background] error:", err.message);
  }
};
