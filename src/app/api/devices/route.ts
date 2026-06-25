import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Simulated server-side storage for device commands and registration.
// In a full production build, this maps to Firestore `users/{uid}/devices`
// and `users/{uid}/queued_commands`.
let deviceList = [
  {
    id: "dev-phone",
    name: "Deepak's Phone",
    kind: "phone",
    online: true,
    lastSeen: new Date().toISOString(),
    queuedCommands: 0
  },
  {
    id: "dev-laptop",
    name: "WokAI Laptop",
    kind: "laptop",
    online: true,
    lastSeen: new Date().toISOString(),
    queuedCommands: 0
  },
  {
    id: "dev-tablet",
    name: "Study Tablet",
    kind: "tablet",
    online: false,
    lastSeen: new Date(Date.now() - 7 * 36e5).toISOString(),
    queuedCommands: 3
  }
];

let commandQueue: Array<{ id: string; deviceId: string; command: string; status: "pending" | "sent" | "completed" }> = [
  { id: "cmd-1", deviceId: "dev-tablet", command: "Sync study notes", status: "pending" },
  { id: "cmd-2", deviceId: "dev-tablet", command: "Download assignment PDF", status: "pending" },
  { id: "cmd-3", deviceId: "dev-tablet", command: "Close background music app", status: "pending" }
];

const registerSchema = z.object({
  id: z.string().min(3),
  name: z.string().min(2),
  kind: z.enum(["phone", "laptop", "tablet", "desktop"]),
  online: z.boolean().optional()
});

const commandSchema = z.object({
  deviceId: z.string().min(3),
  command: z.string().min(1)
});

export async function GET(request: NextRequest) {
  // Option to filter commands for a specific device (polling for local Desktop/Mobile Agent)
  const { searchParams } = new URL(request.url);
  const pollDeviceId = searchParams.get("deviceId");

  if (pollDeviceId) {
    const pendingCommands = commandQueue.filter(
      (c) => c.deviceId === pollDeviceId && c.status === "pending"
    );
    // Mark them as sent
    pendingCommands.forEach((c) => {
      c.status = "sent";
    });
    
    // Update last seen
    deviceList = deviceList.map((d) =>
      d.id === pollDeviceId
        ? { ...d, online: true, lastSeen: new Date().toISOString() }
        : d
    );

    return NextResponse.json({ commands: pendingCommands });
  }

  return NextResponse.json({ devices: deviceList, queue: commandQueue });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  
  // Distinguish between registering a device vs queueing a command
  if (body?.command) {
    const parsed = commandSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid command schema" }, { status: 400 });
    }

    const newCmd = {
      id: `cmd-${Date.now()}`,
      deviceId: parsed.data.deviceId,
      command: parsed.data.command,
      status: "pending" as const
    };
    commandQueue.push(newCmd);

    // Update count in deviceList
    deviceList = deviceList.map((d) =>
      d.id === parsed.data.deviceId
        ? { ...d, queuedCommands: d.queuedCommands + 1 }
        : d
    );

    return NextResponse.json({ success: true, command: newCmd });
  }

  // Else handle device registration
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid registration schema" }, { status: 400 });
  }

  const existing = deviceList.find((d) => d.id === parsed.data.id);
  if (existing) {
    deviceList = deviceList.map((d) =>
      d.id === parsed.data.id
        ? {
            ...d,
            name: parsed.data.name,
            kind: parsed.data.kind,
            online: parsed.data.online ?? true,
            lastSeen: new Date().toISOString()
          }
        : d
    );
  } else {
    deviceList.push({
      id: parsed.data.id,
      name: parsed.data.name,
      kind: parsed.data.kind,
      online: parsed.data.online ?? true,
      lastSeen: new Date().toISOString(),
      queuedCommands: 0
    });
  }

  return NextResponse.json({ success: true, devices: deviceList });
}
