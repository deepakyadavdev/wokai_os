"use client";

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase/client";
import type { UserProfile, WokaiAction, WokaiMemory, WokaiTask } from "@/lib/types";

export function userCollection(uid: string, name: string) {
  const db = getFirebaseDb();
  return db ? collection(db, "users", uid, name) : null;
}

export function subscribeToUserCollection<T>(
  uid: string,
  name: string,
  callback: (items: T[]) => void
) {
  const ref = userCollection(uid, name);
  if (!ref) return () => undefined;
  const ordered = query(ref, orderBy("createdAt", "desc"));
  return onSnapshot(ordered, (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T));
  });
}

export async function saveUserProfile(profile: UserProfile) {
  const db = getFirebaseDb();
  if (!db) return;
  await setDoc(
    doc(db, "users", profile.uid),
    {
      name: profile.name,
      email: profile.email,
      photoURL: profile.photoURL ?? null,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export async function saveAgentResult(
  uid: string,
  result: {
    actions: WokaiAction[];
    suggestedTasks: WokaiTask[];
    memoryWrites: WokaiMemory[];
  }
) {
  const db = getFirebaseDb();
  if (!db) return;

  await Promise.all([
    ...result.actions.map((action) =>
      setDoc(doc(db, "users", uid, "actions", action.id), {
        ...action,
        createdAt: action.createdAt,
        updatedAt: serverTimestamp()
      })
    ),
    ...result.suggestedTasks.map((task) =>
      setDoc(doc(db, "users", uid, "tasks", task.id), {
        ...task,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    ),
    ...result.memoryWrites.map((memory) =>
      setDoc(doc(db, "users", uid, "memories", memory.id), {
        ...memory,
        updatedAt: memory.updatedAt,
        createdAt: serverTimestamp()
      })
    ),
    addDoc(collection(db, "users", uid, "audit_logs"), {
      type: "agent_result",
      actionCount: result.actions.length,
      taskCount: result.suggestedTasks.length,
      memoryCount: result.memoryWrites.length,
      createdAt: serverTimestamp()
    })
  ]);
}
