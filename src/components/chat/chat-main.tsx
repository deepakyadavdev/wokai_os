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
  Bot
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { ActionCards } from "@/components/chat/action-cards";
import { WelcomeScreen } from "@/components/chat/welcome-screen";
import { Button } from "@/components/ui/button";
import { useWorkspaceData } from "@/hooks/use-workspace-data";
import { useChatSessions } from "@/hooks/use-chat-sessions";
import { cn } from "@/lib/utils";
import type { AgentPlan } from "@/lib/types";
import { getGoogleToken } from "@/lib/google/token";

/* ─────────────────────────── Loading dots ─────────────────────────── */

function ThinkingIndicator({ status }: { status: string }) {
  const getStatusText = () => {
    switch (status) {
      case "routing":
        return "Routing request...";
      case "agent1":
        return "Agent 1: Generating response...";
      case "agent2":
        return "Agent 2: Structuring plan...";
      case "agent3":
        return "Agent 3: Analyzing context...";
      case "api":
        return "Conductor: Preparing API layers...";
      default:
        return "WokAI is thinking...";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="mr-auto flex max-w-[85%] items-center gap-3 rounded-2xl rounded-bl-sm border border-border/50 bg-card/90 px-4 py-3"
    >
      <span className="text-sm text-muted-foreground">{getStatusText()}</span>
      <span className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-1.5 w-1.5 rounded-full bg-emerald-400"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </span>
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
    setMounted(true);
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

/* ─────────────────────────── Main component ─────────────────────────── */

export function ChatMain() {
  const { user } = useAuth();
  const { mergeAgentResult, updateActionStatus } = useWorkspaceData(user);
  const {
    activeSession,
    activeSessionId,
    addMessage,
    createSession,
    setActiveSessionId,
    updateMessageResult
  } = useChatSessions();

  const [pending, setPending] = React.useState(false);
  const [progressStatus, setProgressStatus] = React.useState<string>("routing");
  const [inputValue, setInputValue] = React.useState("");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  /* Derive messages from active session */
  const messages = activeSession?.messages ?? [];

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
      textareaRef.current.style.height = "52px";
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
                throw new Error(data.error || "Streaming error occurred.");
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
              throw new Error(data.error || "Streaming error occurred.");
            }
          } catch (e) {
            console.error("Error parsing final stream chunk:", e);
          }
        }
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

  /* New chat */
  function handleNewChat() {
    const session = createSession();
    setActiveSessionId(session.id);
    setInputValue("");
  }

  /* Greeting */
  const [greeting, setGreeting] = React.useState("day");
  React.useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("morning");
    else if (h < 17) setGreeting("afternoon");
    else setGreeting("evening");
  }, []);

  const userName = user?.name?.split(" ")[0] ?? "Deepak";

  /* Welcome state: no active session or session has zero messages */
  const isWelcome = messages.length === 0;

  return (
    <div className="flex h-screen flex-col lg:h-[100dvh]">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="relative flex size-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30">
            <Bot className="size-4" />
            <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.5)]" />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            {activeSession?.title && activeSession.title !== "New Chat"
              ? activeSession.title
              : "WokAI Chat"}
          </span>
        </div>
        <Button
          id="new-chat-top-btn"
          size="sm"
          variant="outline"
          className="gap-1.5 border-border/60 text-xs"
          onClick={handleNewChat}
        >
          <Plus className="size-3.5" />
          New Chat
        </Button>
      </div>

      {/* ── Message area ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {isWelcome ? (
          <WelcomeScreen
            greeting={greeting}
            userName={userName}
            onPromptSelect={(text) => void handleSubmit(text)}
          />
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
                        ? "ml-auto max-w-[72%] rounded-2xl rounded-br-sm bg-emerald-700/80 text-white"
                        : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm border border-border/50 bg-card/90"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>

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
                  <span className="mt-1 px-1 text-xs text-muted-foreground">
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

      {/* ── Sticky input bar ────────────────────────────────────── */}
      <div className="sticky bottom-0 shrink-0 bg-gradient-to-t from-background via-background/95 to-transparent pb-6 pt-3">
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
                  "flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm",
                  "transition hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400",
                  "disabled:pointer-events-none disabled:opacity-40"
                )}
              >
                <Icon className="size-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Textarea card */}
          <div
            className={cn(
              "relative flex items-end gap-2 rounded-2xl border border-border/70 bg-card/80 px-4 py-3",
              "shadow-lg backdrop-blur-xl ring-1 ring-transparent transition",
              "focus-within:border-emerald-500/50 focus-within:ring-emerald-500/20"
            )}
          >
            <textarea
              ref={textareaRef}
              id="chat-input"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                resizeTextarea();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder="Ask WokAI to rescue a deadline, schedule, email, call, browse, or find files…"
              rows={1}
              disabled={pending}
              className={cn(
                "w-full flex-1 resize-none bg-transparent text-sm text-foreground outline-none",
                "placeholder:text-muted-foreground/60 disabled:opacity-60",
                "min-h-[52px] max-h-[200px]"
              )}
              style={{ height: "52px" }}
            />

            <div className="flex shrink-0 items-center gap-1.5 pb-0.5">
              {/* Mic button (decorative / future voice input) */}
              <button
                type="button"
                aria-label="Voice input"
                className="rounded-full p-1.5 text-muted-foreground/50 transition hover:text-muted-foreground"
              >
                <Mic className="size-4" />
              </button>

              {/* Send button */}
              <Button
                id="chat-send"
                size="icon"
                onClick={() => void handleSubmit()}
                disabled={pending || !inputValue.trim()}
                className={cn(
                  "size-9 shrink-0 rounded-xl bg-emerald-600 text-white shadow-md",
                  "hover:bg-emerald-500 disabled:bg-muted/60 disabled:text-muted-foreground"
                )}
              >
                <ArrowUp className="size-4" />
              </Button>
            </div>
          </div>

          <p className="mt-2 text-center text-[10px] text-muted-foreground/50">
            Ctrl+Enter to send · WokAI may make mistakes. Review sensitive actions before approving.
          </p>
        </div>
      </div>
    </div>
  );
}
