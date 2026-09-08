import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Must mirror tokenFor() in app/api/admin-login/route.ts.
async function tokenFor(pw: string): Promise<string> {
  const data = new TextEncoder().encode(pw + "::localpay-admin");
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The login page itself must stay reachable.
  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const pw = process.env.ADMIN_PASSWORD || "";
  const cookie = req.cookies.get("lp_admin")?.value;
  const expected = pw ? await tokenFor(pw) : "";
  const authed = !!cookie && !!expected && cookie === expected;

  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
