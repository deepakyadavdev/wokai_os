import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createOutboundCall } from "@/lib/wokai/adapters";

export const runtime = "nodejs";

const schema = z.object({
  to: z.string().min(3),
  message: z.string().min(1).max(500)
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Phone number and message are required." }, { status: 400 });
  }

  const result = await createOutboundCall(parsed.data.to, parsed.data.message);
  return NextResponse.json(result);
}
