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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendStatus = (status: string) => {
        controller.enqueue(encoder.encode(JSON.stringify({ status }) + "\n"));
      };

      try {
        const result = await generateAgentPlan(parsed.data.message, (phase) => {
          sendStatus(phase);
        });
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
