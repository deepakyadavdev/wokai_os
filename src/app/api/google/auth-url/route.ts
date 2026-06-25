import { NextResponse } from "next/server";

import { getGoogleAuthUrl } from "@/lib/wokai/adapters";

export const runtime = "nodejs";

export async function GET() {
  const url = getGoogleAuthUrl();
  return NextResponse.json({
    configured: Boolean(url),
    url
  });
}
