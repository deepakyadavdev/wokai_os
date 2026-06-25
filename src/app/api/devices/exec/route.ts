import { exec } from "child_process";
import { NextRequest, NextResponse } from "next/server";
import { promisify } from "util";

const execAsync = promisify(exec);

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const command = body?.command;
    if (!command) {
      return NextResponse.json({ error: "Command is required." }, { status: 400 });
    }

    // Run shell command
    const { stdout, stderr } = await execAsync(command, { timeout: 10000 });
    return NextResponse.json({ stdout, stderr });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message || "Command execution failed.",
        stdout: err.stdout || "",
        stderr: err.stderr || ""
      },
      { status: 500 }
    );
  }
}
