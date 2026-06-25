"use client";

import * as React from "react";

import { demoSnapshot } from "@/lib/data/demo";
import { getFirebaseDb } from "@/lib/firebase/client";
import { saveAgentResult } from "@/lib/firebase/workspace-store";
import { safeJsonParse } from "@/lib/utils";
import type { AgentPlan, UserProfile, WorkspaceSnapshot, ActionStatus } from "@/lib/types";

const STORAGE_KEY = "wokai-workspace-v1";

export function useWorkspaceData(user: UserProfile | null) {
  const [snapshot, setSnapshot] = React.useState<WorkspaceSnapshot>(() => {
    if (typeof window === "undefined") return demoSnapshot;
    return safeJsonParse<WorkspaceSnapshot>(window.localStorage.getItem(STORAGE_KEY), demoSnapshot);
  });
  const firebaseReady = Boolean(getFirebaseDb() && user?.uid);

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [snapshot]);

  const mergeAgentResult = React.useCallback(
    async (result: AgentPlan) => {
      setSnapshot((current) => ({
        ...current,
        tasks: [...result.suggestedTasks, ...current.tasks],
        memories: [...result.memoryWrites, ...current.memories],
        actions: [...result.actions, ...current.actions]
      }));

      if (firebaseReady && user) {
        await saveAgentResult(user.uid, {
          actions: result.actions,
          suggestedTasks: result.suggestedTasks,
          memoryWrites: result.memoryWrites
        });
      }
    },
    [firebaseReady, user]
  );

  const updateActionStatus = React.useCallback(
    async (actionId: string, status: ActionStatus, output?: string) => {
      setSnapshot((current) => ({
        ...current,
        actions: current.actions.map((a) =>
          a.id === actionId ? { ...a, status, output: output ?? a.output } : a
        )
      }));

      if (firebaseReady && user) {
        const db = getFirebaseDb();
        if (db) {
          const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
          await setDoc(
            doc(db, "users", user.uid, "actions", actionId),
            { status, output: output ?? null, updatedAt: serverTimestamp() },
            { merge: true }
          );
        }
      }
    },
    [firebaseReady, user]
  );

  const resetDemo = React.useCallback(() => {
    setSnapshot(demoSnapshot);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(demoSnapshot));
  }, []);

  return {
    snapshot,
    mergeAgentResult,
    updateActionStatus,
    resetDemo,
    firebaseReady,
    hydrated: true
  };
}
