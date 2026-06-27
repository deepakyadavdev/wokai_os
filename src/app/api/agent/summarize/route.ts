import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateAgentHashExecutionSummary } from "@/lib/wokai/agent";

export const runtime = "nodejs";

const summarizeRequestSchema = z.object({
  tool: z.string(),
  label: z.string(),
  output: z.string(),
  googleToken: z.string().optional()
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = summarizeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  try {
    const summary = await generateAgentHashExecutionSummary(
      parsed.data.tool,
      parsed.data.label,
      parsed.data.output,
      geminiKey,
      parsed.data.googleToken
    );
    return NextResponse.json({ summary });
  } catch (err: any) {
    console.error("Error in Agent # summary route:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate summary" },
      { status: 500 }
    );
  }
}
