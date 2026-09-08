import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Token stored in the cookie: a hash of the admin password so the raw
// password never lives in the cookie. Middleware recomputes + compares.
async function tokenFor(pw: string): Promise<string> {
  const data = new TextEncoder().encode(pw + "::localpay-admin");
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: Request) {
  let password = "";
  try {
    const body = await req.json();
    password = String(body?.password || "");
  } catch {
    /* ignore */
  }

  const pw = process.env.ADMIN_PASSWORD || "";
  if (!pw) {
    return NextResponse.json(
      { error: "Admin password is not configured on the server." },
      { status: 500 }
    );
  }
  if (password !== pw) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("lp_admin", await tokenFor(pw), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
