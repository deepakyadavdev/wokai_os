import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const modelServerUrl = process.env.MODEL_SERVER_URL || process.env.NEXT_PUBLIC_MODEL_SERVER_URL || "";

  if (!modelServerUrl) {
    return NextResponse.json({
      status: "inactive",
      message: "MODEL_SERVER_URL environment variable is not configured.",
      timestamp: new Date().toISOString()
    });
  }

  try {
    const res = await fetch(`${modelServerUrl.replace(/\/$/, "")}/ping`, {
      method: "GET",
      signal: AbortSignal.timeout(5000)
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        status: "alive",
        serverUrl: modelServerUrl,
        gpuData: data,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      status: "unreachable",
      serverUrl: modelServerUrl,
      error: `Server responded with status ${res.status}`,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json({
      status: "error",
      serverUrl: modelServerUrl,
      error: err?.message || "Failed to connect to GPU Model Server",
      timestamp: new Date().toISOString()
    });
  }
}
