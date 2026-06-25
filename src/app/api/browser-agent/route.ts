import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { runLocalBrowserAgent } from "@/lib/wokai/browser-agent";

export const runtime = "nodejs";

const schema = z.object({
  goal: z.string().min(3).max(1000)
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Goal is required." }, { status: 400 });
  }

  const job = await runLocalBrowserAgent(parsed.data.goal);
  return NextResponse.json(job);
}
