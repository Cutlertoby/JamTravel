/**
 * Netlify Background Function — runs for up to 15 minutes
 * Triggered by the admin "Generate article" button
 * File must end in -background.js for Netlify to treat it as a background function
 */

import Anthropic from "@anthropic-ai/sdk";

const TAVILY_API_KEY    = process.env.TAVILY_API_KEY    || "";
const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://etduovglrefjxotzypua.supabase.co";
const SUPABASE_KEY      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_iHTTar0UlHZEVpNU0s6ukA_iYMhSzD0";

// The site this deployment writes to unless the admin asks for another one.
const DEFAULT_SITE = "positivejamtravel";

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

// ---------------------------------------------------------------------------
// Variation space.
//
// Repetition was structural, not stylistic: a dozen near-identical scenarios
// picked at random, one fixed narrative frame, and a fixed JSON skeleton meant
// every article came out the same shape regardless of topic. Three axes now
// vary per run — subject, angle, and format — and the article's structure is
// decided here in code rather than left to the model to "pick at random",
// which it does badly.
// ---------------------------------------------------------------------------

const SCENARIOS = [
  // Arrival & transport
  "Vietnam airport arrival taxi payment first hour tourist",
  "Vietnam Grab ride hailing top up payment foreigner",
  "Vietnam train bus intercity ticket booking payment tourist",
  "Vietnam domestic flight booking payment foreign card declined",
  "Vietnam motorbike scooter rental deposit payment tourist",
  "Vietnam ferry boat island transfer payment Phu Quoc Cat Ba",
  // Accommodation
  "Vietnam hotel deposit check-in payment card tourist",
  "Vietnam homestay guesthouse booking payment rural",
  "Vietnam landlord rent deposit payment expat long stay",
  "Vietnam coworking space membership payment digital nomad",
  // Everyday spending
  "Vietnam restaurant bill splitting payment group tourist",
  "Vietnam cafe coffee shop QR payment tourist Hanoi",
  "Vietnam night market shopping souvenir payment tourist",
  "Vietnam supermarket convenience store payment foreigner",
  "Vietnam laundry service barber small shop payment",
  // Services & admin
  "Vietnam hospital clinic pharmacy payment foreigner",
  "Vietnam SIM card eSIM data purchase payment tourist",
  "Vietnam visa extension agency fee payment foreigner",
  "Vietnam spa salon massage service payment tourist",
  "Vietnam gym yoga class membership payment expat",
  "Vietnam language school course fee payment foreigner",
  // Experiences
  "Vietnam tour booking activity ticket payment tourist",
  "Vietnam cooking class workshop booking payment traveller",
  "Vietnam Ha Long Bay cruise booking deposit payment",
  "Vietnam Ha Giang loop motorbike tour payment remote",
  "Vietnam diving snorkelling trip payment Nha Trang",
  // Money mechanics
  "Vietnam ATM withdrawal fees foreign card limits",
  "Vietnam currency exchange rates gold shops tourist",
  "Vietnam tipping culture cash etiquette foreigner",
  "Vietnam online shopping Shopee Lazada delivery payment foreigner",
];

// The lens the article is written through. Keeps subject matter from collapsing
// into the same "your card won't work, use LocalPay" narrative every time.
const ANGLES = [
  "the specific costs involved, with real numbers",
  "what actually goes wrong and how to recover from it",
  "what changed recently and what it means now",
  "the difference between what works in cities and what works rurally",
  "what locals do versus what tourists are told to do",
  "the first-time visitor's version versus the returning visitor's version",
  "the decision itself — what to weigh and in what order",
  "a myth or piece of common advice that is out of date",
];

const FORMATS = [
  {
    key: "explainer",
    brief:
      "DIRECT ANSWER / EXPLAINER — answer one clear question thoroughly. No numbered process.",
    sections: [4, 6],
    steps: false,
  },
  {
    key: "comparison",
    brief:
      "COMPARISON — weigh two or three named options against each other for one decision. Reach a verdict; do not sit on the fence.",
    sections: [4, 5],
    steps: false,
  },
  {
    key: "numbers",
    brief:
      "COST / NUMBERS BREAKDOWN — built around concrete figures, fees and totals. Lead with the arithmetic.",
    sections: [3, 5],
    steps: false,
  },
  {
    key: "howto",
    brief:
      "HOW-TO GUIDE — a genuinely ordered task the reader performs start to finish. Only valid when order actually matters.",
    sections: [2, 4],
    steps: true,
  },
  {
    key: "listicle",
    brief:
      "LIST — several distinct options or situations, each worth its own section. Vary entry length; do not write identikit entries.",
    sections: [5, 7],
    steps: false,
  },
  {
    key: "mistakes",
    brief:
      "MISTAKES / PITFALLS — the things that catch people out, each with the fix. Concrete situations, not abstract warnings.",
    sections: [4, 6],
    steps: false,
  },
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

/**
 * Picks a scenario that recent articles haven't already worked over.
 * Scores each scenario by how many of its distinctive words appear in recent
 * titles, then chooses randomly from the least-covered third.
 */
function pickScenario(recentTitles) {
  const haystack = recentTitles.join(" ").toLowerCase();
  const scored = SCENARIOS.map((s) => {
    const terms = s
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4 && w !== "vietnam" && w !== "tourist" && w !== "foreigner");
    const hits = terms.filter((t) => haystack.includes(t)).length;
    return { s, hits };
  }).sort((a, b) => a.hits - b.hits);

  const pool = scored.slice(0, Math.max(6, Math.ceil(scored.length / 3)));
  return rand(pool).s;
}

const SYSTEM_PROMPT = `You write for an independent travel publication covering Vietnam. Your articles are read by tourists, digital nomads and expats who need practical answers about money, connectivity and getting things done in Vietnam.

LocalPay (localpay.asia) is the publication's commercial partner: a non-custodial QR payment wallet aimed at exactly these readers. Your articles should genuinely help the reader AND make a clear, honest case for LocalPay wherever it actually solves the problem at hand. Both goals matter — an article that helps but never mentions LocalPay has failed, and so has one that reads like an advert.

=== WRITING STYLE ===
Write like someone who has spent real time in Vietnam and knows how payments work there. Direct, specific, unfussy. British English. Second person ("you", "your"). Short paragraphs, 2-4 sentences. One idea per paragraph.
Vary how you open. Do NOT begin every article by naming a problem — sometimes lead with a number, a scene, a piece of received wisdom that is wrong, a direct answer, or a specific situation.
Vary your headings. Question-format H2s are useful but must not be every heading in every article. Mix in flat declarative headings and headings built around a specific thing or number.
Bold key terms sparingly where a scanning reader benefits.
Never use: seamless, unlock, leverage, game-changer, revolutionize, fast-paced world, navigate, landscape, delve, elevate, dive into, when it comes to, in today's world, look no further, whether you're a.

=== BEING QUOTED BY AI SEARCH (this matters as much as ranking) ===
Assistants and AI Overviews quote passages that stand alone. So:
Answer the question in the title within the first two sentences of the article, in full, without preamble.
Every factual sentence must make sense lifted out of context — no "as mentioned above", no "this means that", no pronouns pointing at earlier paragraphs.
Include at least three specific, checkable details: a figure in VND or a percentage, a named institution or regulation, a date or timeframe. Vague claims are not quotable.
Name things explicitly: NAPAS, the State Bank of Vietnam, VietQR, Circular 41/2025, specific banks and apps.
Each FAQ answer must be self-contained and complete on its own.

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

=== HOW TO HANDLE LOCALPAY ===
LocalPay is the recommended answer, and you should say so plainly — but earn it. Introduce it at the point in the article where the reader's problem actually becomes acute, not in the first paragraph by reflex and not only at the very end.
Where it belongs, be concrete about why: no Vietnamese bank account, no local SIM, no residency card, works at any VietQR merchant, tops up with the card the reader already has.
Do not stack every LocalPay benefit into one paragraph. Do not repeat the same benefit in three places.
Where a rival option genuinely wins for a particular reader, say so — a guide that never concedes anything reads like marketing and gets trusted less, by readers and by search engines.

=== ANTI-REPETITION ===
Say each fact once. Mention 'VietQR' by name no more than 4 times in the whole article.
Choose ONE main alternative to compare against (ATM cash, MoMo, ZaloPay, or foreign cards) and deal with it once.
Vary section length deliberately — some two paragraphs, some four.
Do not reuse the sentence patterns, openings or headings of the recent articles you are shown.

Return ONLY a raw JSON object. No markdown fences. Start with { end with }. No markdown formatting inside any JSON string values — no asterisks, no bold markers (**), no italics, no backticks, no headers (#). Plain text only inside every string field.`;

async function getRecentCoverage(site) {
  // Ordered newest-first and scoped to this site. The previous version had no
  // ordering and a fixed limit, so once the table passed that many rows it was
  // showing the model the OLDEST articles — and happily regenerating recent ones.
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/posts?select=primary_keyword,title,standfirst` +
      `&status=neq.rejected&site=eq.${encodeURIComponent(site)}` +
      `&order=created_at.desc&limit=40`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status}`);
  const rows = await res.json();
  return {
    titles: rows.map((r) => r.title).filter(Boolean),
    lines: rows
      .map((r) => [r.primary_keyword, r.title].filter(Boolean).join(" | "))
      .filter(Boolean),
    // The last few openings, so the model can be told not to echo them.
    openings: rows.slice(0, 6).map((r) => r.standfirst).filter(Boolean),
  };
}

async function searchTavily(query) {
  if (!TAVILY_API_KEY) return "";
  try {
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
    return (
      data.answer ||
      data.results?.map((r) => r.title + ": " + (r.snippet || "")).join("\n") ||
      ""
    );
  } catch (err) {
    // Research is helpful but not essential — the verified-facts block carries
    // the article if search is down.
    console.warn("[generate-background] tavily unavailable:", err.message);
    return "";
  }
}

/** Pulls the JSON object out of a response, tolerating stray prose or fences. */
function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("no JSON object found in model response");
  }
  return JSON.parse(text.slice(start, end + 1));
}

async function generateArticle({ research, coverage, adminPrompt, site, plan }) {
  const coveredList = coverage.lines.length ? coverage.lines.join(" | ") : "(none yet)";
  const recentOpenings = coverage.openings.length
    ? coverage.openings.map((o, i) => `${i + 1}. ${o}`).join("\n")
    : "(none yet)";

  const adminSteer = adminPrompt
    ? `EDITORIAL DIRECTION FROM ADMIN: ${adminPrompt}\nThis overrides the assigned subject and angle below where they conflict. Stay close to this intent.\n\n`
    : "";

  const userMessage = `${adminSteer}Write one complete article for the publication.

ASSIGNED SUBJECT AREA: ${plan.scenario}
ASSIGNED ANGLE: Write it through this lens — ${plan.angle}
ASSIGNED FORMAT: ${plan.format.brief}

These assignments exist to keep the publication's output varied. Follow them unless the admin direction above says otherwise. Find the specific, searchable question inside the assigned subject area — do not write the generic version.

STRUCTURE REQUIRED FOR THIS ARTICLE:
- ${plan.sectionCount} sections in "sections"
- ${plan.format.steps ? `a populated "steps" array of ${plan.stepCount} steps` : `"steps" MUST be an empty array []`}
- ${plan.tipCount} items in "tip_list"
- ${plan.faqCount} FAQs
- ${plan.pullQuote ? `a "pull_quote": one striking sentence from the article, quoted verbatim` : `"pull_quote" MUST be an empty string ""`}

LIVE WEB RESEARCH (use for current facts and angles; ignore anything irrelevant):
${research || "(no live research available — rely on the verified facts in your instructions)"}

ALREADY COVERED — pick a genuinely different question:
${coveredList}

RECENT OPENINGS ON THIS SITE — do not echo these framings or sentence shapes:
${recentOpenings}

Exhausted subjects, never write about these again: paying for Grab as the main topic, street vendors, street food, or a generic "my foreign card does not work in Vietnam" piece.

Return EXACTLY this JSON shape with NO other text:
{
  "title": "compelling headline, title case, up to 90 chars — specificity beats brevity since this becomes the slug",
  "slug": "title converted to lowercase kebab-case, punctuation removed",
  "meta_description": "150-155 chars including the keyword",
  "primary_keyword": "the specific search phrase this article targets",
  "category": "Vietnam Guide or Payments or Travel Tips",
  "standfirst": "1 sentence — who this is for and what they get",
  "read_time_minutes": ${plan.readTime},
  "quick_answer": "40-60 words answering the title question completely, quotable standalone",
  "intro_paragraphs": ["2-3 sentences", "optional second paragraph"],
  "sections": [
    {"h2": "heading", "paragraphs": ["para", "para"]}
  ],
  "pull_quote": "",
  "steps": [],
  "tip_list_heading": "a specific heading, not 'Tips for X'",
  "tip_list": ["tip"],
  "faqs": [{"question": "a real query someone types", "answer": "2-3 self-contained sentences"}],
  "closing_paragraphs": ["close the loop on the article's question", "the concrete next step, which is where LocalPay belongs if it has not already appeared"],
  "cta_headline": "specific to this article's pain point",
  "cta_subtext": "1 sentence tying LocalPay to this article's topic",
  "status": "pending_review",
  "site": "${site}"
}`;

  const response = await anthropic.messages.create({
    model: "claude-opus-5",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  const article = extractJson(text);
  article.site = site; // never trust the model for routing
  article.status = "pending_review";
  return article;
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
  let site = DEFAULT_SITE;
  try {
    const body = JSON.parse(event.body || "{}");
    adminPrompt = body.prompt || null;
    if (typeof body.site === "string" && body.site.trim()) site = body.site.trim();
  } catch {}

  try {
    const coverage = await getRecentCoverage(site);
    console.log(`[generate-background] site=${site}, ${coverage.lines.length} recent articles`);

    // Decide the article's shape here rather than asking the model to vary
    // itself — left to its own devices it converges on one format and one
    // section count, which is most of why output felt samey.
    const format = rand(FORMATS);
    const plan = {
      scenario: pickScenario(coverage.titles),
      angle: rand(ANGLES),
      format,
      sectionCount: randInt(format.sections[0], format.sections[1]),
      stepCount: randInt(4, 6),
      tipCount: randInt(4, 6),
      faqCount: randInt(3, 5),
      pullQuote: Math.random() < 0.4,
      readTime: randInt(4, 8),
    };
    console.log(
      `[generate-background] plan: ${format.key} / ${plan.sectionCount} sections / "${plan.scenario}"`
    );

    const research = await searchTavily(plan.scenario);

    console.log("[generate-background] generating article...");
    const article = await generateArticle({ research, coverage, adminPrompt, site, plan });
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
