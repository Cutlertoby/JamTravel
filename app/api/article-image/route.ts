import { NextResponse } from "next/server";
import { articleImage } from "@/lib/images";
import type { Post } from "@/lib/types";

export const runtime = "nodejs";

// Used by the admin dashboard's Copy/Download HTML buttons, which run in the
// browser and can't hold the Pexels key. They POST the minimal post fields
// needed to pick a relevant photo, and get back a resolved image URL.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Post>;
    const url = await articleImage(body as Post);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ url: null }, { status: 200 });
  }
}
