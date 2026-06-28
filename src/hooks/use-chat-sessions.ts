"use client";

import * as React from "react";
import { safeJsonParse } from "@/lib/utils";
import type { AgentPlan } from "@/lib/types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  result?: AgentPlan;
  thinkingLogs?: Array<{ agent: string; output: string }>;
  timestamp: string; // ISO
}

export interface ChatSession {
  id: string;
  title: string; // first user message, truncated to 50 chars
  createdAt: string; // ISO
  updatedAt: string; // ISO
  messages: ChatMessage[];
  model?: string;
  systemPrompt?: string;
}

// ── helpers ────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

function startOfDay(iso: string): number {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const STORAGE_KEY = "wokai-chat-sessions-v2";

// ── initial demo session ───────────────────────────────────────

const DEMO_SESSION_ID = "demo-session-welcome";

function buildDemoSession(): ChatSession {
  const createdAt = new Date(Date.now() - 1000 * 60 * 5).toISOString(); // 5 min ago
  return {
    id: DEMO_SESSION_ID,
    title: "Welcome to WokAI",
    createdAt,
    updatedAt: createdAt,
    messages: [
      {
        id: "demo-msg-1",
        role: "user",
        content: "Hey WokAI, what can you do for me?",
        timestamp: createdAt
      },
      {
        id: "demo-msg-2",
        role: "assistant",
        content:
          "Hi! I'm WokAI — your AI work companion. I can help you:\n\n" +
          "• **Manage tasks** — create, track, and prioritize work items\n" +
          "• **Summarize emails** — get the gist of your inbox in seconds\n" +
          "• **Schedule events** — find open slots and create calendar events\n" +
          "• **Search Drive** — locate documents and files instantly\n" +
          "• **Remember context** — I retain preferences and deadlines across sessions\n\n" +
          "Just tell me what you need — I'll build a plan and ask for approval before doing anything sensitive.",
        timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString()
      }
    ]
  };
}

function loadSessions(): ChatSession[] {
  if (typeof window === "undefined") return [buildDemoSession()];
  const stored = safeJsonParse<ChatSession[]>(
    window.localStorage.getItem(STORAGE_KEY),
    []
  );
  if (!stored || stored.length === 0) return [buildDemoSession()];
  return stored;
}

function saveSessions(sessions: ChatSession[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

// ── grouping ───────────────────────────────────────────────────

interface GroupedSessions {
  today: ChatSession[];
  yesterday: ChatSession[];
  week: ChatSession[];
  older: ChatSession[];
}

function groupSessions(sessions: ChatSession[]): GroupedSessions {
  const todayStart = startOfDay(now());
  const yesterdayStart = todayStart - 86_400_000;
  const weekStart = todayStart - 6 * 86_400_000;

  const result: GroupedSessions = { today: [], yesterday: [], week: [], older: [] };

  for (const s of sessions) {
    const ts = startOfDay(s.createdAt);
    if (ts >= todayStart) result.today.push(s);
    else if (ts >= yesterdayStart) result.yesterday.push(s);
    else if (ts >= weekStart) result.week.push(s);
    else result.older.push(s);
  }

  return result;
}

// ── hook ───────────────────────────────────────────────────────

export interface UseChatSessionsReturn {
  sessions: ChatSession[];
  activeSessionId: string | null;
  activeSession: ChatSession | null;
  setActiveSessionId: (id: string | null) => void;
  createSession: () => ChatSession;
  addMessage: (sessionId: string, msg: Omit<ChatMessage, "id" | "timestamp">) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
  updateMessageResult: (sessionId: string, messageId: string, result: AgentPlan) => void;
  deleteSession: (id: string) => void;
  groupedSessions: GroupedSessions;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredSessions: ChatSession[];
  updateSessionModel: (sessionId: string, model: string) => void;
  updateSessionSystemPrompt: (sessionId: string, systemPrompt: string) => void;
  importSessions: (imported: ChatSession[]) => void;
}

export function useChatSessions(): UseChatSessionsReturn {
  const [sessions, setSessions] = React.useState<ChatSession[]>(() => loadSessions());
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(
    () => {
      const loaded = loadSessions();
      return loaded.length > 0 ? loaded[0].id : null;
    }
  );
  const [searchQuery, setSearchQuery] = React.useState("");

  // Persist to localStorage whenever sessions change
  React.useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  // Derive sorted sessions (newest first by updatedAt)
  const sortedSessions = React.useMemo(
    () => [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [sessions]
  );

  const activeSession = React.useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  );

  const createSession = React.useCallback((): ChatSession => {
    const session: ChatSession = {
      id: generateId(),
      title: "New Chat",
      createdAt: now(),
      updatedAt: now(),
      messages: []
    };
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    return session;
  }, []);

  const addMessage = React.useCallback(
    (sessionId: string, msg: Omit<ChatMessage, "id" | "timestamp">) => {
      const message: ChatMessage = {
        ...msg,
        id: generateId(),
        timestamp: now()
      };
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          const messages = [...s.messages, message];
          // Auto-update title from first user message
          const firstUserMsg = messages.find((m) => m.role === "user");
          const title =
            s.title === "New Chat" && firstUserMsg
              ? firstUserMsg.content.slice(0, 50)
              : s.title;
          return { ...s, messages, title, updatedAt: now() };
        })
      );
    },
    []
  );

  const updateSessionTitle = React.useCallback(
    (sessionId: string, title: string) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, title: title.slice(0, 50), updatedAt: now() } : s
        )
      );
    },
    []
  );

  const updateMessageResult = React.useCallback(
    (sessionId: string, messageId: string, result: AgentPlan) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          return {
            ...s,
            messages: s.messages.map((m) =>
              m.id === messageId ? { ...m, result } : m
            ),
            updatedAt: now()
          };
        })
      );
    },
    []
  );

  const deleteSession = React.useCallback(
    (id: string) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        if (activeSessionId === id && next.length > 0) {
          setActiveSessionId(next[0].id);
        }
        return next;
      });
    },
    [activeSessionId]
  );

  const updateSessionModel = React.useCallback(
    (sessionId: string, model: string) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, model, updatedAt: now() } : s
        )
      );
    },
    []
  );

  const updateSessionSystemPrompt = React.useCallback(
    (sessionId: string, systemPrompt: string) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, systemPrompt, updatedAt: now() } : s
        )
      );
    },
    []
  );

  const sanitizeContent = React.useCallback((content: string): string => {
    // Strip common prompt injection patterns that could manipulate the LLM
    const injectionPatterns = [
      /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|commands?)/gi,
      /disregard\s+(all\s+)?(previous|prior|above|earlier)/gi,
      /you\s+are\s+now\s+(a|an)/gi,
      /new\s+(system|role|persona|instruction)/gi,
      /\[SYSTEM\]/gi,
      /\[INST\]/gi,
      /<\|im_start\|>/gi,
      /<\|im_end\|>/gi,
      /system\s*:\s*you\s+must/gi,
      /override\s+(all\s+)?(previous|prior)\s+(instructions?|rules?|constraints?)/gi,
    ];
    let sanitized = content;
    for (const pattern of injectionPatterns) {
      sanitized = sanitized.replace(pattern, "[removed]");
    }
    return sanitized;
  }, []);

  const importSessions = React.useCallback(
    (imported: ChatSession[]) => {
      if (!Array.isArray(imported)) {
        console.error("[WokAI OS] Import failed: data is not an array");
        return;
      }

      const MAX_SESSIONS = 200;
      const MAX_MESSAGES_PER_SESSION = 500;
      const MAX_CONTENT_LENGTH = 50000;
      const sanitized = imported.slice(0, MAX_SESSIONS).map((s) => {
        if (!s.id || !s.title || !Array.isArray(s.messages)) return null;
        const truncatedTitle = s.title.slice(0, 200);
        const sanitizedMessages = s.messages.slice(0, MAX_MESSAGES_PER_SESSION).map((m) => ({
          ...m,
          content: typeof m.content === "string" ? sanitizeContent(m.content.slice(0, MAX_CONTENT_LENGTH)) : ""
        }));
        return { ...s, title: truncatedTitle, messages: sanitizedMessages };
      }).filter(Boolean) as ChatSession[];

      if (sanitized.length === 0) {
        console.error("[WokAI OS] Import failed: no valid sessions found after validation");
        return;
      }

      setSessions((prev) => {
        const map = new Map<string, ChatSession>();
        prev.forEach(s => map.set(s.id, s));
        sanitized.forEach(s => map.set(s.id, s));
        const finalSessions = Array.from(map.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        if (finalSessions.length > 0) {
          const activeExists = finalSessions.some(s => s.id === activeSessionId);
          if (!activeExists) {
            setActiveSessionId(finalSessions[0].id);
          }
        }
        return finalSessions;
      });
    },
    [activeSessionId, sanitizeContent]
  );

  const groupedSessions = React.useMemo(
    () => groupSessions(sortedSessions),
    [sortedSessions]
  );

  const filteredSessions = React.useMemo(() => {
    if (!searchQuery.trim()) return sortedSessions;
    const q = searchQuery.toLowerCase();
    return sortedSessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [sortedSessions, searchQuery]);

  return {
    sessions: sortedSessions,
    activeSessionId,
    activeSession,
    setActiveSessionId,
    createSession,
    addMessage,
    updateSessionTitle,
    updateMessageResult,
    deleteSession,
    groupedSessions,
    searchQuery,
    setSearchQuery,
    filteredSessions,
    updateSessionModel,
    updateSessionSystemPrompt,
    importSessions
  };
}
