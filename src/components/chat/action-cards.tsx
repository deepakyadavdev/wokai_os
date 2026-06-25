"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Brain,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Globe,
  HardDrive,
  Loader2,
  Mail,
  Phone,
  ShieldAlert,
  TriangleAlert,
  Zap,
  Cpu
} from "lucide-react";

import { toast } from "sonner";
import { RiskBadge } from "@/components/risk-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AgentPlan, ActionStatus, WokaiAction } from "@/lib/types";

/* ─────────────────────────── Helpers ─────────────────────────── */

function hasAction(actions: WokaiAction[], toolPrefix: string) {
  return actions.some((a) => a.tool.startsWith(toolPrefix));
}

function StatusDot({ status }: { status: ActionStatus }) {
  if (status === "COMPLETED")
    return <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />;
  if (status === "RUNNING")
    return (
      <motion.span
        className="size-2 rounded-full bg-blue-400"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
    );
  if (status === "NEEDS_APPROVAL")
    return <span className="size-2 rounded-full bg-yellow-400" />;
  if (status === "FAILED")
    return <span className="size-2 rounded-full bg-red-400" />;
  return <span className="size-2 rounded-full bg-muted-foreground/40" />;
}

function StatusLabel({ status }: { status: ActionStatus }) {
  const map: Record<ActionStatus, string> = {
    COMPLETED: "Done",
    RUNNING: "Running…",
    NEEDS_APPROVAL: "Awaiting approval",
    PLANNED: "Planned",
    QUEUED: "Queued",
    FAILED: "Failed"
  };
  return <span className="text-muted-foreground">{map[status]}</span>;
}

/* ─────────────────────────── Step list ─────────────────────────── */

function StepList({ actions }: { actions: WokaiAction[] }) {
  if (actions.length === 0) return null;
  return (
    <div className="mt-3 flex flex-col gap-1.5">
      {actions.map((action) => (
        <div key={action.id} className="flex items-center gap-2 text-xs">
          <StatusDot status={action.status} />
          <span className="flex-1 text-foreground/80">{action.label}</span>
          <StatusLabel status={action.status} />
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────── Card wrapper ─────────────────────────── */

function ResultCard({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("mt-3 rounded-xl border p-4", className)}
    >
      {children}
    </motion.div>
  );
}

function CardHeader({
  icon: Icon,
  label,
  iconClass
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  iconClass?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center gap-2 text-sm font-medium", iconClass)}>
      <Icon className="size-4" />
      {label}
    </div>
  );
}

/* ─────────────────────────── EMAIL card ─────────────────────────── */

function EmailCard({ action, onApprove }: { action: WokaiAction; onApprove: () => void }) {
  const isDone = action.status === "COMPLETED";
  return (
    <ResultCard className="border-blue-500/30 bg-blue-500/10">
      <CardHeader icon={Mail} label={isDone ? "Email Sent Successfully" : "Email Draft Created"} iconClass="text-blue-400" />
      <div className="space-y-1.5 text-sm">
        <div>
          <span className="text-muted-foreground">Action: </span>{action.label}
        </div>
        {action.output && (
          <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap bg-black/35 p-2 rounded leading-relaxed border border-blue-500/20 font-mono">
            {action.output}
          </div>
        )}
      </div>
      {!isDone && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={onApprove} className="bg-blue-600 text-white hover:bg-blue-500" disabled={action.status === "RUNNING"}>
            {action.status === "RUNNING" ? <Loader2 className="size-3 animate-spin" /> : "Send"}
          </Button>
        </div>
      )}
    </ResultCard>
  );
}

/* ─────────────────────────── CALENDAR card ─────────────────────────── */

function CalendarCard({ action, onApprove }: { action: WokaiAction; onApprove: () => void }) {
  const isDone = action.status === "COMPLETED";
  return (
    <ResultCard className="border-violet-500/30 bg-violet-500/10">
      <CardHeader icon={CalendarDays} label={isDone ? "Event Confirmed on Calendar" : "Event Drafted"} iconClass="text-violet-400" />
      <div className="space-y-1.5 text-sm">
        <div>
          <span className="text-muted-foreground">Action: </span>{action.label}
        </div>
        {action.output && (
          <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap bg-black/35 p-2 rounded leading-relaxed border border-violet-500/20 font-mono">
            {action.output}
          </div>
        )}
      </div>
      {!isDone && (
        <div className="mt-3">
          <Button size="sm" onClick={onApprove} className="bg-violet-600 text-white hover:bg-violet-500" disabled={action.status === "RUNNING"}>
            {action.status === "RUNNING" ? <Loader2 className="size-3 animate-spin" /> : "Approve Event"}
          </Button>
        </div>
      )}
    </ResultCard>
  );
}

/* ─────────────────────────── CALL card ─────────────────────────── */

function CallCard({ action, onApprove }: { action: WokaiAction; onApprove: () => void }) {
  const isDone = action.status === "COMPLETED";
  return (
    <ResultCard className="border-green-500/30 bg-green-500/10">
      <CardHeader icon={Phone} label={isDone ? "Call Placed and Logged" : "Contact Found"} iconClass="text-green-400" />
      <div className="space-y-1.5 text-sm">
        <div>
          <span className="text-muted-foreground">Action: </span>{action.label}
        </div>
        {action.output && (
          <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap bg-black/35 p-2 rounded leading-relaxed border border-green-500/20 font-mono">
            {action.output}
          </div>
        )}
      </div>
      {!isDone && (
        <div className="mt-3">
          <Button size="sm" onClick={onApprove} className="bg-green-600 text-white hover:bg-green-500" disabled={action.status === "RUNNING"}>
            {action.status === "RUNNING" ? <Loader2 className="size-3 animate-spin" /> : "Call Now"}
          </Button>
        </div>
      )}
    </ResultCard>
  );
}

/* ─────────────────────────── DRIVE card ─────────────────────────── */

function DriveCard({ action }: { action: WokaiAction }) {
  return (
    <ResultCard className="border-orange-500/30 bg-orange-500/10">
      <CardHeader icon={HardDrive} label="File Located" iconClass="text-orange-400" />
      <div className="space-y-1.5 text-sm">
        <div>
          <span className="text-muted-foreground">Action: </span>{action.label}
        </div>
        {action.output && (
          <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap bg-black/35 p-2 rounded leading-relaxed border border-orange-500/20 font-mono">
            {action.output}
          </div>
        )}
      </div>
    </ResultCard>
  );
}

/* ─────────────────────────── BROWSER card ─────────────────────────── */

function BrowserCard({ result, action, onApprove, onReject }: { result: AgentPlan; action: WokaiAction; onApprove: () => void; onReject: () => void }) {
  const isDone = action.status === "COMPLETED";
  const isRejected = action.status === "FAILED";

  return (
    <ResultCard className="border-yellow-500/30 bg-yellow-500/10">
      <CardHeader icon={Globe} label="Browser Agent" iconClass="text-yellow-400" />
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-xs">
          <StatusDot status={action.status} />
          <span className="flex-1">{action.label}</span>
        </div>
        {action.output && (
          <div className="text-xs text-muted-foreground mt-2 pl-4 italic">
            {action.output}
          </div>
        )}
      </div>
      {!isDone && !isRejected && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={onApprove} className="bg-emerald-600 text-white hover:bg-emerald-500" disabled={action.status === "RUNNING"}>
            {action.status === "RUNNING" ? <Loader2 className="size-3 animate-spin" /> : "Approve Submission"}
          </Button>
          <Button size="sm" onClick={onReject} variant="outline" className="border-red-500/40 text-red-400 hover:bg-red-500/10" disabled={action.status === "RUNNING"}>
            Reject
          </Button>
        </div>
      )}
    </ResultCard>
  );
}

/* ─────────────────────────── TERMINAL card ─────────────────────────── */

function TerminalCard({ action, onApprove }: { action: WokaiAction; onApprove: () => void }) {
  const isDone = action.status === "COMPLETED";
  return (
    <ResultCard className="border-zinc-500/30 bg-zinc-950 font-mono text-zinc-300">
      <CardHeader icon={Cpu} label={isDone ? "Terminal Execution Completed" : "Terminal Authorization Required"} iconClass="text-emerald-400" />
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-1.5 text-zinc-500">
          <span>$</span>
          <span className="text-zinc-200">{action.label}</span>
        </div>
        {isDone ? (
          <div className="bg-black/50 p-2 rounded text-[11px] leading-4 text-emerald-400/90 whitespace-pre overflow-x-auto font-mono">
            {action.output || "No output returned."}
          </div>
        ) : (
          <div className="text-zinc-500 italic">Command execution paused. Needs approval.</div>
        )}
      </div>
      {!isDone && (
        <div className="mt-3 flex gap-2 font-sans">
          <Button size="sm" onClick={onApprove} className="bg-emerald-600 text-white hover:bg-emerald-500" disabled={action.status === "RUNNING"}>
            {action.status === "RUNNING" ? <Loader2 className="size-3 animate-spin" /> : "Approve & Run"}
          </Button>
        </div>
      )}
    </ResultCard>
  );
}

/* ─────────────────────────── RESCUE / TASK card ─────────────────────────── */

function RescueCard({ result }: { result: AgentPlan }) {
  const task = result.suggestedTasks[0];
  const [accepted, setAccepted] = React.useState(false);
  if (!task) return null;
  return (
    <ResultCard className="border-red-500/30 bg-red-500/10">
      <CardHeader icon={Zap} label="Rescue Plan" iconClass="text-red-400" />
      <div className="mb-2">
        <RiskBadge level={result.riskLevel} />
      </div>
      <p className="mb-2 text-sm font-medium">{task.title}</p>
      <div className="flex flex-wrap gap-1.5">
        {task.subtasks.slice(0, 5).map((sub) => (
          <span
            key={sub}
            className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs text-red-300"
          >
            {sub}
          </span>
        ))}
      </div>
      <div className="mt-3">
        <Button
          size="sm"
          onClick={() => {
            setAccepted(true);
            toast.success("Rescue plan accepted and initialized!");
          }}
          disabled={accepted}
          className="bg-red-600 text-white hover:bg-red-500 disabled:bg-emerald-600/50 disabled:text-emerald-300"
        >
          {accepted ? "Plan Accepted ✓" : "Accept Plan"}
        </Button>
      </div>
    </ResultCard>
  );
}

/* ─────────────────────────── MEMORY card ─────────────────────────── */

function MemoryCard({ result }: { result: AgentPlan }) {
  const memory = result.memoryWrites[0];
  if (!memory) return null;
  return (
    <ResultCard className="border-pink-500/30 bg-pink-500/10">
      <CardHeader icon={Brain} label="Memory Saved" iconClass="text-pink-400" />
      <p className="text-sm font-medium">{memory.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{memory.content}</p>
    </ResultCard>
  );
}

/* ─────────────────────────── Approval banner ─────────────────────────── */

function ApprovalBanner() {
  return (
    <div className="mt-3 flex items-center gap-2 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-3 py-2.5 text-sm text-yellow-400">
      <ShieldAlert className="size-4 shrink-0" />
      <span>Approval required before sensitive actions proceed.</span>
    </div>
  );
}

/* ─────────────────────────── Main export ─────────────────────────── */

interface ActionCardsProps {
  result: AgentPlan;
  onUpdateActionStatus?: (actionId: string, status: ActionStatus, output?: string) => Promise<void> | void;
  onUpdatePlan?: (updatedPlan: AgentPlan) => void;
}

export function ActionCards({ result, onUpdateActionStatus, onUpdatePlan }: ActionCardsProps) {
  const { actions } = result;

  const hasGmail = hasAction(actions, "gmail");
  const hasCalendar = hasAction(actions, "calendar");
  const hasCalls = hasAction(actions, "calls");
  const hasDrive = hasAction(actions, "drive");
  const hasBrowser = hasAction(actions, "browser");
  const hasTerminal = hasAction(actions, "devices.terminal");
  const hasMemory = hasAction(actions, "memory.retain");
  const hasTasks = result.suggestedTasks.length > 0;

  const showAny =
    hasGmail ||
    hasCalendar ||
    hasCalls ||
    hasDrive ||
    hasBrowser ||
    hasTerminal ||
    hasMemory ||
    hasTasks ||
    actions.length > 0;

  if (!showAny) return null;

  async function handleApproveAction(actionId: string, tool: string, label: string) {
    console.log(`[WokAI OS] Approve Action Triggered - Action ID: ${actionId}, Tool: ${tool}, Label: "${label}"`);

    if (onUpdateActionStatus) {
      await onUpdateActionStatus(actionId, "RUNNING");
    }
    
    // Update the local results list immediately
    if (onUpdatePlan) {
      onUpdatePlan({
        ...result,
        actions: result.actions.map((a) =>
          a.id === actionId ? { ...a, status: "RUNNING" as ActionStatus } : a
        )
      });
    }

    setTimeout(async () => {
      let output = "Action completed successfully.";
      let finalStatus: ActionStatus = "COMPLETED";

      // 10 second timeout controller helper
      const createTimeoutSignal = (timeoutMs = 10000) => {
        const controller = new AbortController();
        const id = setTimeout(() => {
          console.warn(`[WokAI OS] Request to ${tool} timed out after ${timeoutMs}ms. Aborting...`);
          controller.abort();
        }, timeoutMs);
        return { signal: controller.signal, clear: () => clearTimeout(id) };
      };

      try {
        if (tool === "browser.plan") {
          console.log(`[WokAI OS] [Browser Agent] Triggering local browser agent for goal: "${label}"`);
          const { signal, clear } = createTimeoutSignal(15000); // Browser task can take slightly longer
          try {
            const res = await fetch("/api/browser-agent", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ goal: label }),
              signal
            });
            console.log(`[WokAI OS] [Browser Agent] Response Status: ${res.status}`);
            const data = await res.json();
            console.log(`[WokAI OS] [Browser Agent] Response Data:`, data);
            output = data.currentStep || "Successfully completed form fill and submission on Playwright agent.";
          } catch (err: any) {
            console.error(`[WokAI OS] [Browser Agent] Fetch Error:`, err);
            throw err;
          } finally {
            clear();
          }

        } else if (tool === "calls.prepare") {
          console.log(`[WokAI OS] [Calls Agent] Placing Twilio outbound call...`);
          const { signal, clear } = createTimeoutSignal();
          try {
            const res = await fetch("/api/calls", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ to: "+14155552671", message: `This is a call from WokAI OS: ${label}` }),
              signal
            });
            console.log(`[WokAI OS] [Calls Agent] Response Status: ${res.status}`);
            const data = await res.json();
            console.log(`[WokAI OS] [Calls Agent] Response Data:`, data);
            output = data.sid
              ? `Twilio outbound call placed sid: ${data.sid}`
              : `Outbound dialer script ready: "${data.script}"`;
          } catch (err: any) {
            console.error(`[WokAI OS] [Calls Agent] Fetch Error:`, err);
            throw err;
          } finally {
            clear();
          }

        } else if (tool === "devices.terminal") {
          let command = "dir";
          const match = label.match(/(?:run|exec|execute)\s+[`'"]?([^`'"]+)[`'"]?/i);
          if (match && match[1]) {
            command = match[1];
          } else if (label.toLowerCase().includes("terminal")) {
            const cmdMatch = label.match(/terminal:\s*(.+)/i) || label.match(/command:\s*(.+)/i);
            if (cmdMatch && cmdMatch[1]) command = cmdMatch[1];
          }

          console.log(`[WokAI OS] [Terminal Exec] Posting local shell command: "${command}" to /api/devices/exec`);
          const { signal, clear } = createTimeoutSignal();
          try {
            const res = await fetch("/api/devices/exec", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ command }),
              signal
            });
            console.log(`[WokAI OS] [Terminal Exec] Response Status: ${res.status}`);
            const data = await res.json();
            console.log(`[WokAI OS] [Terminal Exec] Response Data:`, data);
            if (res.ok) {
              output = data.stdout || data.stderr || "Command executed with no output.";
            } else {
              output = `Command failed:\nError: ${data.error || ""}\nStdout: ${data.stdout || ""}\nStderr: ${data.stderr || ""}`;
              finalStatus = "FAILED";
            }
          } catch (err: any) {
            console.error(`[WokAI OS] [Terminal Exec] Fetch Error:`, err);
            throw err;
          } finally {
            clear();
          }

        } else if (tool === "gmail.summarize") {
          console.log("[WokAI OS] [Gmail API] Checking Google Access Token...");
          const token = localStorage.getItem("googleAccessToken");
          if (!token) {
            console.error("[WokAI OS] [Gmail API] Error: googleAccessToken is missing from localStorage.");
            output = "Error: Google access token not found. Please log out and sign in again with Google to authorize.";
            finalStatus = "FAILED";
          } else {
            console.log("[WokAI OS] [Gmail API] Listing latest messages: GET https://gmail.googleapis.com/gmail/v1/users/me/messages");
            const { signal, clear } = createTimeoutSignal();
            try {
              const listRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5", {
                headers: { "Authorization": `Bearer ${token}` },
                signal
              });
              console.log(`[WokAI OS] [Gmail API] List Response Status: ${listRes.status}`);
              if (!listRes.ok) {
                const errText = await listRes.text();
                console.error(`[WokAI OS] [Gmail API] List Request Failed:`, errText);
                throw new Error(`Gmail API list failed: ${errText}`);
              }
              const listData = await listRes.json();
              console.log("[WokAI OS] [Gmail API] List Response Data:", listData);
              const messages = listData.messages || [];
              if (messages.length === 0) {
                console.log("[WokAI OS] [Gmail API] Inbox is empty.");
                output = "No emails found in your Gmail inbox.";
              } else {
                let summaryLines = [];
                for (const msg of messages) {
                  console.log(`[WokAI OS] [Gmail API] Fetching details for message ID: ${msg.id}`);
                  const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
                    headers: { "Authorization": `Bearer ${token}` },
                    signal
                  });
                  if (detailRes.ok) {
                    const detail = await detailRes.json();
                    const snippet = detail.snippet || "";
                    const headers = detail.payload?.headers || [];
                    const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "(No Subject)";
                    const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "(Unknown Sender)";
                    summaryLines.push(`• From: ${from}\n  Subject: ${subject}\n  Snippet: ${snippet}`);
                  } else {
                    console.warn(`[WokAI OS] [Gmail API] Failed to fetch details for message ID ${msg.id}`);
                  }
                }
                output = `Successfully retrieved and summarized your Gmail inbox:\n\n${summaryLines.join("\n\n")}`;
                console.log("[WokAI OS] [Gmail API] Completed summary of inbox.");
              }
            } catch (err: any) {
              console.error(`[WokAI OS] [Gmail API] Execution Error:`, err);
              finalStatus = "FAILED";
              output = `Gmail execution error: ${err.message || err}`;
            } finally {
              clear();
            }
          }

        } else if (tool === "calendar.createEvent") {
          console.log("[WokAI OS] [Calendar API] Checking Google Access Token...");
          const token = localStorage.getItem("googleAccessToken");
          if (!token) {
            console.error("[WokAI OS] [Calendar API] Error: googleAccessToken is missing from localStorage.");
            output = "Error: Google access token not found. Please log out and sign in again with Google to authorize.";
            finalStatus = "FAILED";
          } else {
            const start = new Date(Date.now() + 60 * 60 * 1000);
            const end = new Date(Date.now() + 120 * 60 * 1000);
            const eventBody = {
              summary: "WokAI Task Focus Meeting",
              description: `Created automatically by WokAI OS: "${label}"`,
              start: {
                dateTime: start.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
              },
              end: {
                dateTime: end.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
              }
            };

            console.log("[WokAI OS] [Calendar API] Creating event: POST https://www.googleapis.com/calendar/v3/calendars/primary/events", eventBody);
            const { signal, clear } = createTimeoutSignal();
            try {
              const createRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${token}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(eventBody),
                signal
              });
              console.log(`[WokAI OS] [Calendar API] Create Event Response Status: ${createRes.status}`);
              if (!createRes.ok) {
                const errText = await createRes.text();
                console.error(`[WokAI OS] [Calendar API] Create Request Failed:`, errText);
                throw new Error(`Google Calendar API failed: ${errText}`);
              }
              const eventData = await createRes.json();
              console.log("[WokAI OS] [Calendar API] Create Event Response Data:", eventData);
              output = `Successfully created Google Calendar event:\n- Title: ${eventData.summary}\n- Time: ${new Date(eventData.start.dateTime).toLocaleString()}\n- Link: ${eventData.htmlLink}`;
            } catch (err: any) {
              console.error(`[WokAI OS] [Calendar API] Execution Error:`, err);
              finalStatus = "FAILED";
              output = `Calendar execution error: ${err.message || err}`;
            } finally {
              clear();
            }
          }
        }
      } catch (err: any) {
        console.error("[WokAI OS] Tool Execution Exception:", err);
        finalStatus = "FAILED";
        output = `Execution failed: ${err.message || err}`;
      }

      if (onUpdateActionStatus) {
        await onUpdateActionStatus(actionId, finalStatus, output);
      }

      if (onUpdatePlan) {
        const updatedActions = result.actions.map((a) =>
          a.id === actionId ? { ...a, status: finalStatus, output } : a
        );
        const updatedNeedsApproval = updatedActions.some(
          (a) => a.status === "NEEDS_APPROVAL"
        );
        onUpdatePlan({
          ...result,
          actions: updatedActions,
          needsApproval: updatedNeedsApproval
        });
      }
    }, 1200);
  }

  async function handleRejectAction(actionId: string) {
    if (onUpdateActionStatus) {
      await onUpdateActionStatus(actionId, "FAILED", "Action rejected by user");
    }

    if (onUpdatePlan) {
      const updatedActions = result.actions.map((a) =>
        a.id === actionId ? { ...a, status: "FAILED" as ActionStatus, output: "Action rejected by user" } : a
      );
      const updatedNeedsApproval = updatedActions.some(
        (a) => a.status === "NEEDS_APPROVAL"
      );
      onUpdatePlan({
        ...result,
        actions: updatedActions,
        needsApproval: updatedNeedsApproval
      });
    }
  }

  const gmailAction = actions.find((a) => a.tool.startsWith("gmail"));
  const calendarAction = actions.find((a) => a.tool.startsWith("calendar"));
  const callsAction = actions.find((a) => a.tool.startsWith("calls"));
  const driveAction = actions.find((a) => a.tool.startsWith("drive"));
  const browserAction = actions.find((a) => a.tool === "browser.plan");
  const terminalAction = actions.find((a) => a.tool === "devices.terminal");

  return (
    <div className="mt-4 border-t border-border/40 pt-4">
      {/* Approval banner */}
      {result.needsApproval && <ApprovalBanner />}

      {/* Step progress list */}
      <StepList actions={actions} />

      {/* Specialized cards */}
      {hasGmail && gmailAction && (
        <EmailCard
          action={gmailAction}
          onApprove={() => handleApproveAction(gmailAction.id, gmailAction.tool, gmailAction.label)}
        />
      )}
      {hasCalendar && calendarAction && (
        <CalendarCard
          action={calendarAction}
          onApprove={() => handleApproveAction(calendarAction.id, calendarAction.tool, calendarAction.label)}
        />
      )}
      {hasCalls && callsAction && (
        <CallCard
          action={callsAction}
          onApprove={() => handleApproveAction(callsAction.id, callsAction.tool, callsAction.label)}
        />
      )}
      {hasDrive && driveAction && <DriveCard action={driveAction} />}
      {hasBrowser && browserAction && (
        <BrowserCard
          result={result}
          action={browserAction}
          onApprove={() => handleApproveAction(browserAction.id, browserAction.tool, browserAction.label)}
          onReject={() => handleRejectAction(browserAction.id)}
        />
      )}
      {hasTerminal && terminalAction && (
        <TerminalCard
          action={terminalAction}
          onApprove={() => handleApproveAction(terminalAction.id, terminalAction.tool, terminalAction.label)}
        />
      )}
      {hasTasks && <RescueCard result={result} />}
      {hasMemory && <MemoryCard result={result} />}
    </div>
  );
}
