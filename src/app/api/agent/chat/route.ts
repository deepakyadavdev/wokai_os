import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateAgentPlan } from "@/lib/wokai/agent";

export const runtime = "nodejs";

const chatRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  googleToken: z.string().optional(),
  isVoice: z.boolean().optional(),
  history: z.array(z.object({ role: z.string(), content: z.string() })).optional()
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await generateAgentPlan(
          parsed.data.message,
          (phase, output) => {
            controller.enqueue(
              encoder.encode(JSON.stringify({ status: phase, output: output || undefined }) + "\n")
            );
          },
          parsed.data.googleToken,
          1,
          parsed.data.isVoice,
          parsed.data.history
        );
        // Introduce a tiny delay so the transition of steps is visible/pleasant if it runs super fast
        await new Promise((r) => setTimeout(r, 100));
        controller.enqueue(encoder.encode(JSON.stringify({ status: "done", result }) + "\n"));
      } catch (err) {
        console.error("Error in streaming chat API:", err);
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              status: "error",
              error: err instanceof Error ? err.message : "Something went wrong"
            }) + "\n"
          )
        );
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
}
