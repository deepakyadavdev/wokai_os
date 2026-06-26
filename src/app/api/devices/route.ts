import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAdminDb } from "@/lib/firebase/admin";

// ── In-memory fallback (used when Firebase Admin is not configured) ──
let memDevices = [
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

let memCommandQueue: Array<{
  id: string;
  deviceId: string;
  command: string;
  status: "pending" | "sent" | "completed";
}> = [
  { id: "cmd-1", deviceId: "dev-tablet", command: "Sync study notes", status: "pending" },
  { id: "cmd-2", deviceId: "dev-tablet", command: "Download assignment PDF", status: "pending" },
  { id: "cmd-3", deviceId: "dev-tablet", command: "Close background music app", status: "pending" }
];

// ── Firestore helpers ──
const DEVICE_COLLECTION = "wokai_devices";
const COMMAND_COLLECTION = "wokai_commands";

async function getDevicesFromStore() {
  const db = getAdminDb();
  if (!db) return { devices: memDevices, queue: memCommandQueue, persisted: false };

  const devSnap = await db.collection(DEVICE_COLLECTION).get();
  const cmdSnap = await db.collection(COMMAND_COLLECTION).get();

  // Seed defaults if Firestore collection is empty
  if (devSnap.empty) {
    for (const d of memDevices) {
      await db.collection(DEVICE_COLLECTION).doc(d.id).set(d);
    }
    for (const c of memCommandQueue) {
      await db.collection(COMMAND_COLLECTION).doc(c.id).set(c);
    }
    return { devices: memDevices, queue: memCommandQueue, persisted: true };
  }

  const devices = devSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const queue = cmdSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as typeof memCommandQueue;
  return { devices, queue, persisted: true };
}

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
  const { searchParams } = new URL(request.url);
  const pollDeviceId = searchParams.get("deviceId");
  const { devices, queue, persisted } = await getDevicesFromStore();
  const db = getAdminDb();

  if (pollDeviceId) {
    const pendingCommands = queue.filter(
      (c: any) => c.deviceId === pollDeviceId && c.status === "pending"
    );

    // Mark them as sent
    for (const c of pendingCommands) {
      (c as any).status = "sent";
      if (persisted && db) {
        await db.collection(COMMAND_COLLECTION).doc((c as any).id).update({ status: "sent" });
      }
    }

    // Update last seen
    const device = devices.find((d: any) => d.id === pollDeviceId);
    if (device && persisted && db) {
      await db.collection(DEVICE_COLLECTION).doc(pollDeviceId).update({
        online: true,
        lastSeen: new Date().toISOString()
      });
    }

    return NextResponse.json({ commands: pendingCommands });
  }

  return NextResponse.json({ devices, queue });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const db = getAdminDb();

  // Queue a command
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

    if (db) {
      await db.collection(COMMAND_COLLECTION).doc(newCmd.id).set(newCmd);
      const devRef = db.collection(DEVICE_COLLECTION).doc(parsed.data.deviceId);
      const devDoc = await devRef.get();
      if (devDoc.exists) {
        const current = devDoc.data();
        await devRef.update({ queuedCommands: (current?.queuedCommands || 0) + 1 });
      }
    } else {
      memCommandQueue.push(newCmd);
      memDevices = memDevices.map((d) =>
        d.id === parsed.data.deviceId
          ? { ...d, queuedCommands: d.queuedCommands + 1 }
          : d
      );
    }

    const { devices } = await getDevicesFromStore();
    return NextResponse.json({ success: true, command: newCmd, devices });
  }

  // Register a device
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid registration schema" }, { status: 400 });
  }

  const deviceData = {
    id: parsed.data.id,
    name: parsed.data.name,
    kind: parsed.data.kind,
    online: parsed.data.online ?? true,
    lastSeen: new Date().toISOString(),
    queuedCommands: 0
  };

  if (db) {
    await db.collection(DEVICE_COLLECTION).doc(parsed.data.id).set(deviceData, { merge: true });
  } else {
    const existing = memDevices.find((d) => d.id === parsed.data.id);
    if (existing) {
      memDevices = memDevices.map((d) =>
        d.id === parsed.data.id ? { ...d, ...deviceData, queuedCommands: d.queuedCommands } : d
      );
    } else {
      memDevices.push(deviceData);
    }
  }

  const { devices } = await getDevicesFromStore();
  return NextResponse.json({ success: true, devices });
}
