import { exec } from "child_process";
import { NextRequest, NextResponse } from "next/server";
import { promisify } from "util";

import { verifyFirebaseToken } from "@/lib/firebase/admin";

const execAsync = promisify(exec);

export const runtime = "nodejs";

// Only allow safe, read-only or explicitly approved command prefixes
const ALLOWED_PREFIXES = [
  "echo",
  "whoami",
  "hostname",
  "date",
  "ls",
  "dir",
  "cat",
  "type",
  "pwd",
  "node --version",
  "npm --version",
  "git status",
  "git log",
  "git branch",
  "systeminfo",
  "uname"
];

const BLOCKED_PATTERNS = [
  /[;&|`$]/,        // shell chaining / injection
  /\.\.[\\/]/,      // directory traversal
  /rm\s/i,          // destructive commands
  /del\s/i,
  /format\s/i,
  /mkfs/i,
  /shutdown/i,
  /reboot/i,
  /curl\s/i,
  /wget\s/i,
  /powershell/i,
  /bash\s-c/i
];

function isCommandAllowed(command: string): boolean {
  const trimmed = command.trim().toLowerCase();

  const prefixAllowed = ALLOWED_PREFIXES.some((prefix) =>
    trimmed.startsWith(prefix.toLowerCase())
  );
  if (!prefixAllowed) return false;
  const hasBlocked = BLOCKED_PATTERNS.some((pattern) => pattern.test(command));
  return !hasBlocked;
}

export async function POST(request: NextRequest) {
  // Verify authentication
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "") || null;
  let user = await verifyFirebaseToken(token);

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required. Provide a valid Firebase ID token." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const command = body?.command;
    if (!command || typeof command !== "string") {
      return NextResponse.json(
        { error: "Command is required and must be a string." },
        { status: 400 }
      );
    }

    if (!isCommandAllowed(command)) {
      return NextResponse.json(
        {
          error: `Command not allowed. Only safe read-only commands are permitted. Allowed prefixes: ${ALLOWED_PREFIXES.join(", ")}`
        },
        { status: 403 }
      );
    }

    const { stdout, stderr } = await execAsync(command, {
      timeout: 10000,
      maxBuffer: 1024 * 512 // 512 KB output limit
    });
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
