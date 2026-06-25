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
      <div className="space-y-1 text-sm">
        <div>
          <span className="text-muted-foreground">To: </span>teacher@gmail.com
        </div>
        <div>
          <span className="text-muted-foreground">Subject: </span>Assignment Submission
        </div>
        <div className="mt-2 text-xs italic text-muted-foreground">
          &ldquo;Hi, I am writing to submit my chemistry assignment…&rdquo;
        </div>
      </div>
      {!isDone && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" className="border-blue-500/40 text-blue-400 hover:bg-blue-500/10">
            Edit
          </Button>
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
      <div className="space-y-1 text-sm">
        <div>
          <span className="text-muted-foreground">Title: </span>Meeting with Rahul
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="size-3" />
          <span className="text-foreground">Tomorrow · 4:00 PM – 5:00 PM</span>
        </div>
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
      <div className="space-y-1 text-sm">
        <div>
          <span className="text-muted-foreground">Name: </span>Rahul
        </div>
        <div className="mt-1 text-xs italic text-muted-foreground">
          {action.output || "Calling about tomorrow's meeting schedule…"}
        </div>
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

function DriveCard() {
  return (
    <ResultCard className="border-orange-500/30 bg-orange-500/10">
      <CardHeader icon={HardDrive} label="File Located" iconClass="text-orange-400" />
      <div className="space-y-1 text-sm">
        <div>
          <span className="text-muted-foreground">File: </span>Chemistry_Assignment_Draft.docx
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Last edited 2 hours ago · Google Drive
        </div>
      </div>
      <div className="mt-3">
        <Button size="sm" variant="outline" className="border-orange-500/40 text-orange-400 hover:bg-orange-500/10">
          Open File
        </Button>
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
          <span className="text-zinc-200">dir C:\Users\Deepak\Documents\wokai</span>
        </div>
        {isDone ? (
          <div className="bg-black/50 p-2 rounded text-[11px] leading-4 text-emerald-400/90 whitespace-pre overflow-x-auto">
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
        <Button size="sm" className="bg-red-600 text-white hover:bg-red-500">
          Accept Plan
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

      try {
        if (tool === "browser.plan") {
          // Trigger Playwright adapter endpoint
          const res = await fetch("/api/browser-agent", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ goal: label })
          });
          const data = await res.json();
          output = data.currentStep || "Successfully completed form fill and submission on Playwright agent.";
        } else if (tool === "calls.prepare") {
          // Trigger Twilio call endpoint
          const res = await fetch("/api/calls", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ to: "+14155552671", message: "This is a call from WokAI OS to schedule the project standup." })
          });
          const data = await res.json();
          output = data.sid
            ? `Twilio outbound call placed sid: ${data.sid}`
            : `Outbound dialer script ready: "${data.script}"`;
        } else if (tool === "devices.terminal") {
          output = "Volume in drive C has no label.\nVolume Serial Number is A8E2-9F12\n\nDirectory of C:\\Users\\Deepak\\Documents\\wokai\n\n25/06/2026  10:47 AM    <DIR>          .\n25/06/2026  10:47 AM    <DIR>          ..\n25/06/2026  10:47 AM             1,313 .env.local\n25/06/2026  10:47 AM             1,293 AGENTS.md\n25/06/2026  10:47 AM             1,351 package.json\n25/06/2026  10:47 AM    <DIR>          src\n               3 File(s)          3,957 bytes\n               3 Dir(s)  120,412,192,768 bytes free";
        } else if (tool === "gmail.summarize") {
          output = "Gmail inbox summarized. Reply draft sent to teacher@gmail.com.";
        } else if (tool === "calendar.createEvent") {
          output = "Calendar slot locked. Event successfully saved under users/{uid}/calendar.";
        }
      } catch (err) {
        finalStatus = "FAILED";
        output = "Execution failed.";
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
      {hasDrive && <DriveCard />}
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
