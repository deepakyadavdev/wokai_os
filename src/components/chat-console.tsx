"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, CheckCircle2, Clock, Loader2, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { RiskBadge } from "@/components/risk-badge";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { AgentPlan } from "@/lib/types";
import { getGoogleToken } from "@/lib/google/token";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  result?: AgentPlan;
}

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

const examples = [
  "My project presentation is due tomorrow.",
  "Schedule a team sync meeting tomorrow at 4 PM.",
  "Check important emails and draft replies.",
  "Apply for internship and pause before submit."
];

export function ChatConsole({
  onAgentResult,
  compact = false
}: {
  onAgentResult: (result: AgentPlan) => Promise<void>;
  compact?: boolean;
}) {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I am WokAI, your intelligent execution companion. How can I help you finish your tasks today?"
    }
  ]);
  const [input, setInput] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [progressStatus, setProgressStatus] = React.useState<string | null>(null);

  async function handleSend(text?: string) {
    const trimmed = (text ?? input).trim();
    if (!trimmed || pending) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: trimmed };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setPending(true);

    setProgressStatus("routing");
    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          googleToken: getGoogleToken() || undefined
        })
      });

      if (!response.ok) throw new Error("The agent route did not accept the request.");

      const reader = response.body?.getReader();
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

      await onAgentResult(result);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.response,
          result
        }
      ]);
      toast.success("WokAI generated a work plan");
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: error instanceof Error ? error.message : "Something went wrong."
        }
      ]);
      toast.error("Agent request failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className={compact ? "min-h-[420px]" : "min-h-[calc(100vh-11rem)]"}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>AI Work Conductor</CardTitle>
            <CardDescription>OMP-style planning, subagents, tools, approvals, and memory.</CardDescription>
          </div>
          <Badge variant="signal">Conductor online</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className={compact ? "max-h-[260px] overflow-auto pr-1" : "max-h-[58vh] overflow-auto pr-1"}>
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={
                    message.role === "user"
                      ? "ml-auto max-w-[86%] rounded-lg bg-primary px-4 py-3 text-sm text-primary-foreground"
                      : "max-w-[94%] rounded-lg border border-border bg-background/70 px-4 py-3 text-sm"
                  }
                >
                  {message.role === "user" ? (
                    <p className="leading-6">{message.content}</p>
                  ) : (
                    <MarkdownRenderer content={message.content} />
                  )}
                  {message.result ? <AgentResult result={message.result} /> : null}
                </motion.div>
              ))}
            </AnimatePresence>
            {pending ? (
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-background/60 px-4 py-3.5 text-xs font-mono text-muted-foreground w-full">
                <div className="flex items-center justify-between border-b border-border/40 pb-1.5 mb-1 text-sm font-medium text-foreground/80 font-sans">
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Agent Planning Pipeline
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {PHASE_ORDER.slice(0, PHASE_ORDER.indexOf(progressStatus || "routing") + 1).map((phaseId, index, arr) => {
                    const isDone = index < arr.length - 1;
                    const label = PHASE_DETAILS[phaseId] || phaseId;
                    return (
                      <div key={phaseId} className="flex items-center gap-2">
                        {isDone ? (
                          <span className="text-emerald-400 font-bold">✓</span>
                        ) : (
                          <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                        )}
                        <span className={isDone ? "text-muted-foreground/75" : "text-amber-400 font-medium animate-pulse"}>
                          {label}... {isDone ? "Done" : "Thinking"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {examples.map((example) => (
            <Button key={example} variant="outline" size="sm" onClick={() => handleSend(example)}>
              {example}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask WokAI to finish something, rescue a deadline, schedule, email, call, search files, or run a browser task..."
            className="min-h-[76px]"
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void handleSend();
              }
            }}
          />
          <Button className="h-auto self-stretch" onClick={() => handleSend()} disabled={pending || !input.trim()}>
            {pending ? <Loader2 className="animate-spin" /> : <ArrowUp />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentResult({ result }: { result: AgentPlan }) {
  return (
    <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <RiskBadge level={result.riskLevel} />
        <Badge variant={result.needsApproval ? "warning" : "success"}>
          {result.needsApproval ? "Approval needed" : "Safe steps queued"}
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <ResultBlock title="Reasoning" items={result.reasoning} icon={Sparkles} />
        <ResultBlock title="Plan" items={result.plan} icon={Clock} />
        <ResultBlock
          title="Tool Status"
          items={result.actions.map((action) => `${action.label} - ${action.status.replace("_", " ")}`)}
          icon={result.needsApproval ? ShieldAlert : CheckCircle2}
        />
      </div>
    </div>
  );
}

function ResultBlock({
  title,
  items,
  icon: Icon
}: {
  title: string;
  items: string[];
  icon: typeof Sparkles;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <Icon />
        {title}
      </div>
      <ul className="flex flex-col gap-2 text-xs leading-5">
        {items.slice(0, 5).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
