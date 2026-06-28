import { NextRequest, NextResponse } from "next/server";

import { verifyFirebaseToken } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, doc, getDocs, onSnapshot, orderBy, query, setDoc, deleteDoc } from "firebase/firestore";
import type { WokaiMemory } from "@/lib/types";

export const runtime = "nodejs";

async function getUid(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "") || null;
  const user = await verifyFirebaseToken(token);
  return user?.uid || null;
}

export async function GET(request: NextRequest) {
  const uid = await getUid(request);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getFirebaseDb();
  if (!db) {
    return NextResponse.json({ memories: [] });
  }

  try {
    const memoriesRef = collection(db, "users", uid, "memories");
    const q = query(memoriesRef, orderBy("updatedAt", "desc"));
    const snapshot = await getDocs(q);
    const memories = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as WokaiMemory));
    return NextResponse.json({ memories });
  } catch (err: any) {
    console.error("[Memory API] Fetch error:", err);
    return NextResponse.json({ memories: [] });
  }
}

export async function POST(request: NextRequest) {
  const uid = await getUid(request);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getFirebaseDb();
  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { type, title, content, confidence } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const memory: WokaiMemory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: type || "context",
      title: String(title).slice(0, 80),
      content: String(content).slice(0, 500),
      confidence: typeof confidence === "number" ? Math.max(0, Math.min(1, confidence)) : 0.85,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "users", uid, "memories", memory.id), {
      ...memory,
    });

    return NextResponse.json({ memory });
  } catch (err: any) {
    console.error("[Memory API] Create error:", err);
    return NextResponse.json({ error: err.message || "Failed to save memory" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const uid = await getUid(request);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getFirebaseDb();
  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Memory ID is required" }, { status: 400 });
    }

    await deleteDoc(doc(db, "users", uid, "memories", id));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Memory API] Delete error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete memory" }, { status: 500 });
  }
}
