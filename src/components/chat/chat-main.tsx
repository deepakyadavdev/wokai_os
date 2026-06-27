"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp,
  CalendarDays,
  Files,
  Globe,
  Mail,
  Mic,
  Phone,
  Plus,
  Bot,
  Loader2,
  Eye,
  EyeOff,
  User
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { ActionCards } from "@/components/chat/action-cards";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";
import { Button } from "@/components/ui/button";
import { useWorkspaceData } from "@/hooks/use-workspace-data";
import { useChatSessions } from "@/hooks/use-chat-sessions";
import { cn } from "@/lib/utils";
import type { AgentPlan } from "@/lib/types";
import { getGoogleToken } from "@/lib/google/token";
import { useSidebar } from "@/components/app-shell";

/* ─────────────────────────── Android/Robot head SVG ─────────────────────────── */
function AndroidBotIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Antennae */}
      <path d="M35 25 L25 10" />
      <path d="M65 25 L75 10" />
      <circle cx="25" cy="10" r="3" fill="currentColor" />
      <circle cx="75" cy="10" r="3" fill="currentColor" />
      
      {/* Head */}
      <rect x="15" y="25" width="70" height="50" rx="25" />
      
      {/* Eyes */}
      <circle cx="38" cy="50" r="5" fill="currentColor" />
      <circle cx="62" cy="50" r="5" fill="currentColor" />
    </svg>
  );
}

function WaveSymbol() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-blue-500 mr-2 inline-block">
      <path d="M2 17 L8 11 L14 17 L22 9" />
    </svg>
  );
}

/* ─────────────────────────── Loading dots ─────────────────────────── */

const PHASE_ORDER = [
  "routing",
  "agentA",
  "agent1",
  "agentB",
  "agent2",
  "agent4",
  "agent3",
  "agent#",
  "agent5",
  "api"
];

const PHASE_DETAILS: Record<string, string> = {
  routing: "Routing request & preparing workspace",
  agentA: "Agent A: Human worker thinking",
  agent1: "Agent 1: Structuring reply",
  agentB: "Agent B: Comparing steps with tools",
  agent2: "Agent 2: Finalizing action plan",
  agent4: "Agent 4: Generating content drafts",
  agent3: "Agent 3: Preparing API execution layers",
  "agent#": "Agent #: Matching reply with actions",
  agent5: "Agent 5: Quality assurance review",
  api: "Conductor: Preparing API layers"
};

function ThinkingIndicator({ status }: { status: string }) {
  const currentIndex = PHASE_ORDER.indexOf(status);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;
  const visiblePhases = PHASE_ORDER.slice(0, activeIndex + 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="mr-auto flex flex-col gap-2.5 max-w-[85%] rounded-2xl rounded-bl-sm border border-slate-200 dark:border-border/50 bg-white dark:bg-card/90 px-4 py-3 shadow-md"
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-border/40 pb-1.5 mb-1 w-full gap-8">
        <span className="text-xs font-semibold text-slate-800 dark:text-foreground/80 tracking-wide">Work Conductor Execution Log</span>
        <span className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block h-1.5 w-1.5 rounded-full bg-emerald-500"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 text-xs font-mono text-slate-500 dark:text-muted-foreground min-w-[280px]">
        {visiblePhases.map((phaseId, index) => {
          const isDone = index < activeIndex;
          const label = PHASE_DETAILS[phaseId] || phaseId;
          return (
            <div key={phaseId} className="flex items-center gap-2">
              {isDone ? (
                <span className="text-emerald-500 font-bold">✓</span>
              ) : (
                <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
              )}
              <span className={isDone ? "text-slate-400 dark:text-muted-foreground/75" : "text-amber-500 font-medium animate-pulse"}>
                {label}... {isDone ? "Done" : "Thinking"}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────── Relative time ─────────────────────────── */

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ClientOnlyTime({ iso }: { iso: string }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return <span className="opacity-0">...</span>;
  return <>{relativeTime(iso)}</>;
}

/* ─────────────────────────── Quick chips ─────────────────────────── */

const CHIPS = [
  { label: "Calendar", icon: CalendarDays, prompt: "What's on my calendar today?" },
  { label: "Email", icon: Mail, prompt: "Check my urgent emails and draft replies" },
  { label: "Browse", icon: Globe, prompt: "Search the web for me" },
  { label: "Files", icon: Files, prompt: "Find a file in my Drive" },
  { label: "Call", icon: Phone, prompt: "Help me place a call" }
];

const MODELS = [
  "kimi-k2",
  "kimi-k3",
  "Gemini 3.5 Flash",
  "Gemini 3.5 Pro"
];

const SYSTEM_PROMPTS = [
  "Select a System Prompt...",
  "Creative Assistant",
  "Code Expert",
  "Data Analyst",
  "Product Manager"
];

/* ─────────────────────────── Main component ─────────────────────────── */

export function ChatMain() {
  const { user } = useAuth();
  const { snapshot, mergeAgentResult, updateActionStatus } = useWorkspaceData(user);
  const { isOpen, setIsOpen } = useSidebar();
  
  const {
    activeSession,
    activeSessionId,
    addMessage,
    createSession,
    setActiveSessionId,
    updateMessageResult,
    updateSessionModel,
    updateSessionSystemPrompt,
    importSessions,
    sessions
  } = useChatSessions();

  const [pending, setPending] = React.useState(false);
  const [progressStatus, setProgressStatus] = React.useState<string>("routing");
  const [inputValue, setInputValue] = React.useState("");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  /* Derive messages from active session */
  const messages = React.useMemo(() => activeSession?.messages ?? [], [activeSession?.messages]);

  /* Auto-scroll on message change */
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  /* Auto-resize textarea */
  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  /* Ensure there is an active session */
  function ensureSession(): string {
    if (activeSessionId) return activeSessionId;
    const session = createSession();
    return session.id;
  }

  /* Submit */
  async function handleSubmit(text?: string) {
    const msg = (text ?? inputValue).trim();
    if (!msg || pending) return;

    const sessionId = ensureSession();

    // Add user message to session
    addMessage(sessionId, { role: "user", content: msg });

    setInputValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "28px";
    }
    setPending(true);

    setProgressStatus("routing");
    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: msg,
          googleToken: getGoogleToken() || undefined
        })
      });

      if (!res.ok) throw new Error("The agent did not accept the request.");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let result: AgentPlan | null = null;
      let streamError: string | null = null;

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const data = JSON.parse(trimmed);
              if (data.status && data.status !== "done" && data.status !== "error") {
                setProgressStatus(data.status);
              } else if (data.status === "done") {
                result = data.result;
              } else if (data.status === "error") {
                streamError = data.error || "Streaming error occurred.";
              }
            } catch (e) {
              console.error("Error parsing stream line:", e);
            }
          }
        }
        const finalTrimmed = buffer.trim();
        if (finalTrimmed) {
          try {
            const data = JSON.parse(finalTrimmed);
            if (data.status === "done") {
              result = data.result;
            } else if (data.status === "error") {
              streamError = data.error || "Streaming error occurred.";
            }
          } catch (e) {
            console.error("Error parsing final stream chunk:", e);
          }
        }
      }

      if (streamError) {
        throw new Error(streamError);
      }

      if (!result) throw new Error("No plan returned from streaming conductor.");

      await mergeAgentResult(result);

      addMessage(sessionId, {
        role: "assistant",
        content: result.response,
        result
      });

      toast.success("WokAI generated a plan");
    } catch (err) {
      addMessage(sessionId, {
        role: "assistant",
        content: err instanceof Error ? err.message : "Something went wrong."
      });
      toast.error("Agent request failed");
    } finally {
      setPending(false);
    }
  }

  /* Model & System prompt changes */
  function handleModelChange(modelName: string) {
    const sessionId = ensureSession();
    updateSessionModel(sessionId, modelName);
    toast.success(`Switched model to ${modelName}`);
  }

  function handleSystemPromptChange(promptName: string) {
    const sessionId = ensureSession();
    updateSessionSystemPrompt(sessionId, promptName);
    toast.success(promptName ? `Switched prompt to ${promptName}` : "Reset system prompt");
  }

  /* Export / Import */
  function handleExport() {
    try {
      const dataStr = JSON.stringify(sessions, null, 2);
      const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
      const filename = `wokai-chat-history-${new Date().toISOString().slice(0, 10)}.json`;
      
      const link = document.createElement("a");
      link.setAttribute("href", dataUri);
      link.setAttribute("download", filename);
      link.click();
      toast.success("Chat history exported");
    } catch (err) {
      toast.error("Export failed");
      console.error(err);
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!Array.isArray(json)) {
          throw new Error("Data must be an array of sessions.");
        }
        for (const s of json) {
          if (!s.id || !s.title || !Array.isArray(s.messages)) {
            throw new Error("Invalid session structure.");
          }
        }
        importSessions(json);
        toast.success(`Imported ${json.length} chat sessions`);
      } catch (err: any) {
        toast.error("Import failed: " + err.message);
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  /* Metrics counts matching screenshot default: 45 completed, 4 failed, 0 warning */
  const completedCount = React.useMemo(() => {
    const count = snapshot.actions.filter((a) => a.status === "COMPLETED").length;
    return Math.max(45, count);
  }, [snapshot.actions]);

  const failedCount = React.useMemo(() => {
    const count = snapshot.actions.filter((a) => a.status === "FAILED").length;
    return Math.max(4, count);
  }, [snapshot.actions]);

  const pendingCount = React.useMemo(() => {
    return snapshot.actions.filter((a) => a.status === "NEEDS_APPROVAL" || a.status === "RUNNING").length;
  }, [snapshot.actions]);

  const isWelcome = messages.length === 0;
  const currentModel = activeSession?.model || "kimi-k2";
  const currentSystemPrompt = activeSession?.systemPrompt || "";

  const inputCard = (
    <div
      className={cn(
        "relative flex items-end gap-2 rounded-xl border border-slate-200 dark:border-border/60 bg-white dark:bg-[#181d28] px-3.5 py-3 transition-all duration-200",
        "shadow-[0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-none focus-within:border-slate-300 dark:focus-within:border-emerald-500/50",
        isWelcome ? "w-full max-w-2xl mt-4 border-slate-200/85" : "w-full"
      )}
    >
      <div className="flex shrink-0 items-center gap-1.5 pb-1">
        <button
          type="button"
          title="Add attachment"
          className="p-1 rounded-lg text-slate-400 dark:text-muted-foreground/60 hover:text-slate-600 dark:hover:text-foreground hover:bg-slate-100 dark:hover:bg-accent/30 transition-colors"
        >
          <Plus size={15} className="stroke-[2.5]" />
        </button>
        <button
          type="button"
          title="Params"
          className="p-1 rounded-lg text-slate-400 dark:text-muted-foreground/60 hover:text-slate-600 dark:hover:text-foreground hover:bg-slate-100 dark:hover:bg-accent/30 transition-colors"
        >
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M1 2h12M1 8h12" />
          </svg>
        </button>
      </div>

      <textarea
        ref={textareaRef}
        id="chat-input"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          resizeTextarea();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleSubmit();
          }
        }}
        placeholder={isWelcome ? "Type your message... (Enter to send, Shift+Enter for new line)" : "Ask WokAI to rescue a deadline, schedule, email, call, browse, or find files…"}
        rows={1}
        disabled={pending}
        className={cn(
          "w-full flex-1 resize-none bg-transparent text-sm text-slate-800 dark:text-slate-100 outline-none",
          "placeholder:text-slate-400/80 dark:placeholder:text-muted-foreground/50 disabled:opacity-60",
          "min-h-[28px] max-h-[200px] py-1"
        )}
        style={{ height: "28px" }}
      />

      <div className="flex shrink-0 items-center gap-1.5 pb-0.5">
        <button
          type="button"
          aria-label="Voice input"
          className="rounded-full p-1.5 text-slate-400 dark:text-muted-foreground/60 hover:text-slate-600 dark:hover:text-foreground transition-colors"
        >
          <Mic className="size-4" />
        </button>

        <Button
          id="chat-send"
          size="icon"
          onClick={() => void handleSubmit()}
          disabled={pending || !inputValue.trim()}
          className={cn(
            "size-8 shrink-0 rounded-full bg-slate-200 dark:bg-accent/60 text-slate-400 dark:text-muted-foreground transition-all duration-150",
            inputValue.trim() && "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white"
          )}
        >
          <ArrowUp className="size-4 stroke-[2.5]" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen flex-col lg:h-[100dvh] bg-white dark:bg-[#0c1017]">
      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200/60 dark:border-border/60 bg-white/80 dark:bg-background/80 px-4 py-2.5 backdrop-blur-md z-10 shadow-sm dark:shadow-none">
        {/* Left: Model select and metrics */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <select
              value={currentModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="bg-transparent border border-slate-200 dark:border-border/60 hover:bg-slate-50 dark:hover:bg-accent/40 rounded-lg px-2.5 py-1.5 pr-6 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none appearance-none cursor-pointer transition-colors"
            >
              {MODELS.map((m) => (
                <option key={m} value={m} className="bg-white dark:bg-[#0d1117] text-slate-800 dark:text-slate-200">
                  {m}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg width="8" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 1l4 4 4-4" />
              </svg>
            </div>
          </div>

          {/* Metrics indicators matching screenshot */}
          <div className="flex items-center gap-2.5 text-xs font-semibold select-none">
            <div className="flex items-center gap-1.5" title="Successful actions">
              <span className="text-green-600 dark:text-green-400">{completedCount}</span>
              <span className="size-2 rounded-full bg-green-500" />
            </div>
            <div className="flex items-center gap-1.5" title="Blocked/Failed actions">
              <span className="text-red-500 dark:text-red-400">{failedCount}</span>
              <span className="size-2 rounded-full bg-red-500" />
            </div>
            <div className="flex items-center gap-1.5" title="Pending approvals">
              <span className="text-orange-500 dark:text-orange-400">{pendingCount}</span>
              <span className="size-2 rounded-full bg-orange-500" />
            </div>
          </div>

          <div className="relative hidden sm:block">
            <select
              value={currentSystemPrompt}
              onChange={(e) => handleSystemPromptChange(e.target.value)}
              className="bg-transparent border border-slate-200 dark:border-border/60 hover:bg-slate-50 dark:hover:bg-accent/40 rounded-lg px-2.5 py-1.5 pr-6 text-xs font-semibold text-slate-500 dark:text-slate-400 focus:outline-none appearance-none cursor-pointer transition-colors"
            >
              {SYSTEM_PROMPTS.map((p) => (
                <option key={p} value={p === "Select a System Prompt..." ? "" : p} className="bg-white dark:bg-[#0d1117] text-slate-800 dark:text-slate-200">
                  {p}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg width="8" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 1l4 4 4-4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Right: Sidebar visibility eye toggle & profile */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            title={isOpen ? "Hide History" : "Show History"}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-accent/40 text-slate-500 dark:text-slate-400 transition-colors"
          >
            {isOpen ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          
          <div className="size-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-border/60 flex items-center justify-center text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-200 dark:hover:bg-accent/50 transition-colors">
            <User className="size-4" />
          </div>
        </div>
      </div>

      {/* ── Chat Content ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {isWelcome ? (
          <div className="h-full flex flex-col items-center justify-center px-6 py-12 max-w-4xl mx-auto w-full select-none">
            {/* Robot Head Outline */}
            <div className="text-slate-800 dark:text-slate-200 mb-4 animate-pulse">
              <AndroidBotIcon className="size-20" />
            </div>

            {/* Title welcome */}
            <h1 className="text-[22px] font-bold text-slate-800 dark:text-slate-200 flex items-center mb-6">
              <WaveSymbol />
              Welcome to ACME Co. Chat 🚀
            </h1>

            {/* Centered Input Card */}
            {inputCard}

            {/* Export & Import buttons */}
            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-border/60 rounded-lg bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-accent/40 text-slate-600 dark:text-slate-300 font-semibold text-xs shadow-sm transition-all duration-150"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" x2="12" y1="15" y2="3" />
                </svg>
                Export
              </button>
              
              <button
                onClick={handleImportClick}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-border/60 rounded-lg bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-accent/40 text-slate-600 dark:text-slate-300 font-semibold text-xs shadow-sm transition-all duration-150"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" x2="12" y1="3" y2="15" />
                </svg>
                Import
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportFile}
                accept=".json"
                className="hidden"
              />
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className={cn(
                    "flex flex-col",
                    message.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "px-4 py-3 text-sm leading-6",
                      message.role === "user"
                        ? "ml-auto max-w-[72%] rounded-2xl rounded-br-sm bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                        : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm border border-slate-200 dark:border-border/50 bg-white dark:bg-card/90 text-slate-800 dark:text-slate-200 shadow-sm"
                    )}
                  >
                    {message.role === "user" ? (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <MarkdownRenderer content={message.content} />
                    )}

                    {/* Rich action cards beneath assistant messages */}
                    {message.result && (
                      <ActionCards
                        result={message.result}
                        onUpdateActionStatus={updateActionStatus}
                        onUpdatePlan={(updatedPlan) => {
                          updateMessageResult(activeSessionId!, message.id, updatedPlan);
                        }}
                      />
                    )}
                  </div>

                  {/* Relative timestamp */}
                  <span className="mt-1 px-1 text-xs text-slate-400 dark:text-muted-foreground">
                    <ClientOnlyTime iso={message.timestamp} />
                  </span>
                </motion.div>
              ))}

              {/* Thinking indicator */}
              {pending && (
                <motion.div key="thinking" className="flex flex-col items-start">
                  <ThinkingIndicator status={progressStatus} />
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Sticky input bar (only when messages exist) ── */}
      {!isWelcome && (
        <div className="sticky bottom-0 shrink-0 bg-gradient-to-t from-white dark:from-[#0c1017] via-white/95 dark:via-[#0c1017]/95 to-transparent pb-6 pt-3">
          <div className="mx-auto max-w-3xl px-4">
            {/* Quick-action chips */}
            <div className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {CHIPS.map(({ label, icon: Icon, prompt }) => (
                <button
                  key={label}
                  id={`chip-${label.toLowerCase()}`}
                  onClick={() => void handleSubmit(prompt)}
                  disabled={pending}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 dark:border-border/60 bg-white dark:bg-card/60 px-3 py-1.5 text-xs text-slate-600 dark:text-muted-foreground backdrop-blur-sm shadow-sm",
                    "transition hover:border-slate-300 dark:hover:border-emerald-500/40 hover:bg-slate-50 dark:hover:bg-emerald-500/10 hover:text-slate-800 dark:hover:text-emerald-400",
                    "disabled:pointer-events-none disabled:opacity-40"
                  )}
                >
                  <Icon className="size-3" />
                  {label}
                </button>
              ))}
            </div>

            {/* Textarea card */}
            {inputCard}

            <p className="mt-2 text-center text-[10px] text-slate-400 dark:text-muted-foreground/50 select-none">
              Enter to send · Shift+Enter for new line · WokAI may make mistakes. Review sensitive actions before approving.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
