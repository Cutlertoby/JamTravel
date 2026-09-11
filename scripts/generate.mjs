/**
 * Run the article generator directly, without going through Netlify.
 *
 * The scheduled job used to POST to the deployed background function, which
 * meant a site whose Netlify build was stale or failing would keep serving an
 * older generator and silently ignore the requested status. Running the same
 * module here removes the deploy from the critical path.
 *
 * Usage: node scripts/generate.mjs <site> <status> [prompt]
 */
import { handler } from "../netlify/functions/generate-background.js";

const [site, status, prompt] = process.argv.slice(2);

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set");
  process.exit(1);
}

await handler({
  body: JSON.stringify({
    site: site || undefined,
    status: status || "pending_review",
    prompt: prompt || null,
  }),
});
