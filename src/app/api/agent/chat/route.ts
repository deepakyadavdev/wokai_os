import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateAgentPlan } from "@/lib/wokai/agent";

export const runtime = "nodejs";

const chatRequestSchema = z.object({
  message: z.string().min(1).max(4000)
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const result = await generateAgentPlan(parsed.data.message);
  return NextResponse.json(result);
}
