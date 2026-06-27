"use client";

import * as React from "react";

import { demoSnapshot } from "@/lib/data/demo";
import { getFirebaseDb } from "@/lib/firebase/client";
import { saveAgentResult } from "@/lib/firebase/workspace-store";
import { safeJsonParse } from "@/lib/utils";
import type { AgentPlan, UserProfile, WorkspaceSnapshot, ActionStatus } from "@/lib/types";

const STORAGE_KEY = "wokai-workspace-v1";

const emptySnapshot: WorkspaceSnapshot = {
  tasks: [],
  memories: [],
  actions: [],
  devices: [],
  emails: [],
  events: [],
  browserJobs: []
};

export function useWorkspaceData(user: UserProfile | null, currentPage?: string) {
  const fallback = demoSnapshot;

  const [snapshot, setSnapshot] = React.useState<WorkspaceSnapshot>(() => {
    if (typeof window === "undefined") return fallback;
    return safeJsonParse<WorkspaceSnapshot>(window.localStorage.getItem(STORAGE_KEY), fallback);
  });
  const [hydrated, setHydrated] = React.useState(false);
  const firebaseReady = Boolean(getFirebaseDb() && user?.uid);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [snapshot]);

  // Load and poll devices from API
  React.useEffect(() => {
    async function loadDevices() {
      try {
        const res = await fetch("/api/devices");
        if (res.ok) {
          const data = await res.json();
          if (data.devices) {
            setSnapshot((current) => ({ ...current, devices: data.devices }));
          }
        }
      } catch (err) {
        console.error("Failed to load devices", err);
      }
    }
    loadDevices();
    // Only poll every 30s when on dashboard or devices pages
    const shouldPoll = !currentPage || currentPage === "dashboard" || currentPage === "devices";
    const interval = shouldPoll ? setInterval(loadDevices, 30000) : null;
    return () => { if (interval) clearInterval(interval); };
  }, [currentPage]);

  // Real-time Firestore sync
  React.useEffect(() => {
    if (!firebaseReady || !user?.uid) return undefined;

    let unsubTasks: (() => void) | undefined;
    let unsubMemories: (() => void) | undefined;
    let unsubActions: (() => void) | undefined;

    import("@/lib/firebase/workspace-store").then(({ subscribeToUserCollection }) => {
      unsubTasks = subscribeToUserCollection(user.uid, "tasks", (tasks: any[]) => {
        setSnapshot((current) => ({ ...current, tasks: [...tasks].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()) }));
      });

      unsubMemories = subscribeToUserCollection(user.uid, "memories", (memories: any[]) => {
        setSnapshot((current) => ({ ...current, memories }));
      });

      unsubActions = subscribeToUserCollection(user.uid, "actions", (actions: any[]) => {
        setSnapshot((current) => ({ ...current, actions }));
      });
    });

    return () => {
      unsubTasks?.();
      unsubMemories?.();
      unsubActions?.();
    };
  }, [firebaseReady, user?.uid]);

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
          try {
            const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
            await setDoc(
              doc(db, "users", user.uid, "actions", actionId),
              { status, output: output ?? null, updatedAt: serverTimestamp() },
              { merge: true }
            );
          } catch (err: any) {
            console.warn("[WokAI OS] Failed to update action status in Firestore:", err.message);
          }
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
    hydrated
  };
}
