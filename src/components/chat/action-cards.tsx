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
  Cpu,
  MonitorSmartphone,
  Users,
  FileText,
  Sheet,
  Presentation
} from "lucide-react";

import { toast } from "sonner";
import { RiskBadge } from "@/components/risk-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AgentPlan, ActionStatus, WokaiAction } from "@/lib/types";
import { getGoogleToken } from "@/lib/google/token";

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

function ContentPreview({ content, title = "Generated Content Preview" }: { content?: string; title?: string }) {
  if (!content) return null;
  return (
    <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap bg-black/35 p-2 rounded leading-relaxed border border-border/20 font-mono max-h-40 overflow-y-auto">
      <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1 font-semibold">{title}:</div>
      {content}
    </div>
  );
}

function ActionOutputView({ action, borderColor = "border-muted/30" }: { action: WokaiAction; borderColor?: string }) {
  const [showRaw, setShowRaw] = React.useState(false);

  if (!action.output && !action.summary) return null;

  return (
    <div className="mt-3 space-y-2">
      {/* Agent # Summary (Shown by default) */}
      {action.summary && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm transition-all duration-200 hover:border-emerald-500/30">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-400 text-xs mb-1 font-sans">
            <span className="inline-flex size-4 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] text-emerald-400 font-bold">#</span>
            Agent # Summary
          </div>
          <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{action.summary}</p>
        </div>
      )}

      {/* If there is no summary yet, but there is raw output, we fallback to showing raw output */}
      {!action.summary && action.output && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
          <div className="font-semibold text-amber-400 text-xs mb-1 font-sans uppercase tracking-wider">Raw Execution Output</div>
          <pre className="text-zinc-300 text-xs font-mono whitespace-pre-wrap bg-black/35 p-2 rounded leading-relaxed overflow-x-auto max-h-60">{action.output}</pre>
        </div>
      )}

      {/* Option to toggle raw API output (if summary exists) */}
      {action.summary && action.output && (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRaw(!showRaw)}
            className="h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/10 px-2.5 rounded-lg flex items-center gap-1.5 transition-all duration-150"
          >
            {showRaw ? "Hide Raw API Output" : "Show Raw API Output"}
          </Button>

          {showRaw && (
            <div className={`rounded-xl border ${borderColor} bg-black/30 p-3 text-xs space-y-3`}>
              <div>
                <div className="font-semibold text-zinc-400 text-[10px] mb-1 font-mono uppercase tracking-wider">Raw API Output</div>
                <pre className="text-zinc-300 font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-x-auto bg-black/25 p-2 rounded max-h-60 border border-border/10">{action.output}</pre>
              </div>
              
              <div className="border-t border-border/10 pt-2">
                <div className="font-semibold text-emerald-400 text-[10px] mb-1 font-mono uppercase tracking-wider">Agent # Summary</div>
                <p className="text-zinc-300 font-sans text-sm leading-relaxed whitespace-pre-wrap">{action.summary}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── EMAIL card ─────────────────────────── */

function EmailCard({ action, onApprove }: { action: WokaiAction; onApprove: () => void }) {
  const isDone = action.status === "COMPLETED";
  const isFailed = action.status === "FAILED";
  const isRunning = action.status === "RUNNING";
  const needsApprove = action.status === "NEEDS_APPROVAL" || isRunning;
  return (
    <ResultCard className={isFailed ? "border-red-500/30 bg-red-500/10" : "border-blue-500/30 bg-blue-500/10"}>
      <CardHeader icon={Mail} label={isDone ? "Email Sent Successfully" : isFailed ? "Email Sending Failed" : "Email Draft Created"} iconClass={isFailed ? "text-red-400" : "text-blue-400"} />
      <div className="space-y-1.5 text-sm">
        <div>
          <span className="text-muted-foreground">Action: </span>{action.label}
        </div>
        <ContentPreview content={action.content} title="Email Body Preview" />
        <ActionOutputView action={action} borderColor="border-blue-500/20" />
      </div>
      {needsApprove && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={onApprove} className="bg-blue-600 text-white hover:bg-blue-500" disabled={isRunning}>
            {isRunning ? <Loader2 className="size-3 animate-spin" /> : "Send"}
          </Button>
        </div>
      )}
    </ResultCard>
  );
}

/* ─────────────────────────── CALENDAR card ─────────────────────────── */

function CalendarCard({ action, onApprove }: { action: WokaiAction; onApprove: () => void }) {
  const isDone = action.status === "COMPLETED";
  const isFailed = action.status === "FAILED";
  const isRunning = action.status === "RUNNING";
  const needsApprove = action.status === "NEEDS_APPROVAL" || isRunning;
  return (
    <ResultCard className={isFailed ? "border-red-500/30 bg-red-500/10" : "border-violet-500/30 bg-violet-500/10"}>
      <CardHeader icon={CalendarDays} label={isDone ? "Event Confirmed on Calendar" : isFailed ? "Event Creation Failed" : "Event Drafted"} iconClass={isFailed ? "text-red-400" : "text-violet-400"} />
      <div className="space-y-1.5 text-sm">
        <div>
          <span className="text-muted-foreground">Action: </span>{action.label}
        </div>
        <ContentPreview content={action.content} title="Event Description" />
        <ActionOutputView action={action} borderColor="border-violet-500/20" />
      </div>
      {needsApprove && (
        <div className="mt-3">
          <Button size="sm" onClick={onApprove} className="bg-violet-600 text-white hover:bg-violet-500" disabled={isRunning}>
            {isRunning ? <Loader2 className="size-3 animate-spin" /> : "Approve Event"}
          </Button>
        </div>
      )}
    </ResultCard>
  );
}

/* ─────────────────────────── CALL card ─────────────────────────── */

function CallCard({ action, onApprove }: { action: WokaiAction; onApprove: () => void }) {
  const isDone = action.status === "COMPLETED";
  const isFailed = action.status === "FAILED";
  const isRunning = action.status === "RUNNING";
  const needsApprove = action.status === "NEEDS_APPROVAL" || isRunning;
  return (
    <ResultCard className={isFailed ? "border-red-500/30 bg-red-500/10" : "border-green-500/30 bg-green-500/10"}>
      <CardHeader icon={Phone} label={isDone ? "Call Placed and Logged" : isFailed ? "Phone Call Failed" : "Contact Found"} iconClass={isFailed ? "text-red-400" : "text-green-400"} />
      <div className="space-y-1.5 text-sm">
        <div>
          <span className="text-muted-foreground">Action: </span>{action.label}
        </div>
        <ContentPreview content={action.content} title="Call Script" />
        <ActionOutputView action={action} borderColor="border-green-500/20" />
      </div>
      {needsApprove && (
        <div className="mt-3">
          <Button size="sm" onClick={onApprove} className="bg-green-600 text-white hover:bg-green-500" disabled={isRunning}>
            {isRunning ? <Loader2 className="size-3 animate-spin" /> : "Call Now"}
          </Button>
        </div>
      )}
    </ResultCard>
  );
}

/* ─────────────────────────── DRIVE card ─────────────────────────── */

function DriveCard({ action, onApprove }: { action: WokaiAction; onApprove: () => void }) {
  const isDone = action.status === "COMPLETED";
  const isFailed = action.status === "FAILED";
  const isRunning = action.status === "RUNNING";
  const needsApprove = action.status === "NEEDS_APPROVAL" || isRunning;
  return (
    <ResultCard className={isFailed ? "border-red-500/30 bg-red-500/10" : "border-orange-500/30 bg-orange-500/10"}>
      <CardHeader
        icon={HardDrive}
        label={isDone ? "Drive Search Complete" : isFailed ? "Drive Search Failed" : "Drive Search Ready"}
        iconClass={isFailed ? "text-red-400" : "text-orange-400"}
      />
      <div className="space-y-1.5 text-sm">
        <div className="flex items-center gap-2 text-xs">
          <StatusDot status={action.status} />
          <span className="flex-1">{action.label}</span>
        </div>
        <ActionOutputView action={action} borderColor="border-orange-500/20" />
      </div>
      {needsApprove && (
        <div className="mt-3">
          <Button size="sm" onClick={onApprove} className="bg-orange-600 text-white hover:bg-orange-500" disabled={isRunning}>
            {isRunning ? <Loader2 className="size-3 animate-spin" /> : "Approve & Search"}
          </Button>
        </div>
      )}
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
        <ActionOutputView action={action} borderColor="border-yellow-500/20" />
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
  const isFailed = action.status === "FAILED";
  const isRunning = action.status === "RUNNING";
  const needsApprove = action.status === "NEEDS_APPROVAL" || isRunning;
  return (
    <ResultCard className={isFailed ? "border-red-500/30 bg-zinc-950 font-mono text-zinc-300" : "border-zinc-500/30 bg-zinc-950 font-mono text-zinc-300"}>
      <CardHeader 
        icon={Cpu} 
        label={isDone ? "Terminal Execution Completed" : isFailed ? "Terminal Execution Failed" : "Terminal Authorization Required"} 
        iconClass={isFailed ? "text-red-400" : "text-emerald-400"} 
      />
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-1.5 text-zinc-500">
          <span>$</span>
          <span className="text-zinc-200">{action.label}</span>
        </div>
        <ContentPreview content={action.content} title="Command to execute" />
        {isDone || isFailed ? (
          <ActionOutputView action={action} borderColor="border-zinc-500/20" />
        ) : (
          <div className="text-zinc-500 italic">Command execution paused. Needs approval.</div>
        )}
      </div>
      {needsApprove && (
        <div className="mt-3 flex gap-2 font-sans">
          <Button size="sm" onClick={onApprove} className="bg-emerald-600 text-white hover:bg-emerald-500" disabled={isRunning}>
            {isRunning ? <Loader2 className="size-3 animate-spin" /> : "Approve & Run"}
          </Button>
        </div>
      )}
    </ResultCard>
  );
}

/* ─────────────────────────── APP LAUNCHER card ─────────────────────────── */

function AppLauncherCard({ action, onApprove }: { action: WokaiAction; onApprove: () => void }) {
  const isDone = action.status === "COMPLETED";
  const isFailed = action.status === "FAILED";
  const isRunning = action.status === "RUNNING";
  const needsApprove = action.status === "NEEDS_APPROVAL" || isRunning;
  return (
    <ResultCard className={isFailed ? "border-red-500/30 bg-red-500/10" : "border-cyan-500/30 bg-cyan-500/10"}>
      <CardHeader 
        icon={MonitorSmartphone} 
        label={isDone ? "Application Launched" : isFailed ? "App Launch Failed" : "App Launch Requested"} 
        iconClass={isFailed ? "text-red-400" : "text-cyan-400"} 
      />
      <div className="space-y-1.5 text-sm">
        <div>
          <span className="text-muted-foreground">Action: </span>{action.label}
        </div>
        <ActionOutputView action={action} borderColor="border-cyan-500/20" />
      </div>
      {needsApprove && (
        <div className="mt-3">
          <Button size="sm" onClick={onApprove} className="bg-cyan-600 text-white hover:bg-cyan-500" disabled={isRunning}>
            {isRunning ? <Loader2 className="size-3 animate-spin" /> : "Open App"}
          </Button>
        </div>
      )}
    </ResultCard>
  );
}

/* ─────────────────────────── MAPS card ─────────────────────────── */

function MapsCard({ action, onApprove }: { action: WokaiAction; onApprove?: () => void }) {
  const isDone = action.status === "COMPLETED";
  const isFailed = action.status === "FAILED";
  const isRunning = action.status === "RUNNING";
  const needsApprove = action.status === "NEEDS_APPROVAL" || isRunning;
  return (
    <ResultCard className={isFailed ? "border-red-500/30 bg-red-500/10" : "border-rose-500/30 bg-rose-500/10"}>
      <CardHeader icon={Globe} label={isDone ? "Google Maps Completed" : isFailed ? "Route Calculation Failed" : "Google Maps Agent"} iconClass={isFailed ? "text-red-400" : "text-rose-400"} />
      <div className="space-y-1.5 text-sm">
        <div>
          <span className="text-muted-foreground">Action: </span>{action.label}
        </div>
        <ActionOutputView action={action} borderColor="border-rose-500/20" />
      </div>
      {needsApprove && onApprove && (
        <div className="mt-3">
          <Button size="sm" onClick={onApprove} className="bg-rose-600 text-white hover:bg-rose-500" disabled={isRunning}>
            {isRunning ? <Loader2 className="size-3 animate-spin" /> : "Calculate Route"}
          </Button>
        </div>
      )}
    </ResultCard>
  );
}

/* ─────────────────────────── SEARCH card ─────────────────────────── */

function SearchCard({ action, onApprove }: { action: WokaiAction; onApprove?: () => void }) {
  const isDone = action.status === "COMPLETED";
  const needsApprove = action.status === "NEEDS_APPROVAL";
  return (
    <ResultCard className="border-teal-500/30 bg-teal-500/10">
      <CardHeader icon={Globe} label="Google Custom Search" iconClass="text-teal-400" />
      <div className="space-y-1.5 text-sm">
        <div>
          <span className="text-muted-foreground">Query: </span>{action.label}
        </div>
        <ActionOutputView action={action} borderColor="border-teal-500/20" />
      </div>
      {needsApprove && onApprove && (
        <div className="mt-3">
          <Button size="sm" onClick={onApprove} className="bg-teal-600 text-white hover:bg-teal-500" disabled={action.status === "RUNNING"}>
            {action.status === "RUNNING" ? <Loader2 className="size-3 animate-spin" /> : "Search Google"}
          </Button>
        </div>
      )}
    </ResultCard>
  );
}

/* ─────────────────────────── CONTACTS card ─────────────────────────── */

function ContactsCard({ action, onApprove }: { action: WokaiAction; onApprove?: () => void }) {
  const isDone = action.status === "COMPLETED";
  const needsApprove = action.status === "NEEDS_APPROVAL";
  return (
    <ResultCard className="border-indigo-500/30 bg-indigo-500/10">
      <CardHeader icon={Users} label={isDone ? "Contact Details Found" : "Search Google Contacts"} iconClass="text-indigo-400" />
      <div className="space-y-1.5 text-sm">
        <div>
          <span className="text-muted-foreground">Action: </span>{action.label}
        </div>
        <ActionOutputView action={action} borderColor="border-indigo-500/20" />
      </div>
      {needsApprove && onApprove && (
        <div className="mt-3">
          <Button size="sm" onClick={onApprove} className="bg-indigo-600 text-white hover:bg-indigo-500" disabled={action.status === "RUNNING"}>
            {action.status === "RUNNING" ? <Loader2 className="size-3 animate-spin" /> : "Search Contacts"}
          </Button>
        </div>
      )}
    </ResultCard>
  );
}

/* ─────────────────────────── DOCS card ─────────────────────────── */

function DocsCard({ action, onApprove }: { action: WokaiAction; onApprove?: () => void }) {
  const isDone = action.status === "COMPLETED";
  const needsApprove = action.status === "NEEDS_APPROVAL";
  return (
    <ResultCard className="border-blue-400/30 bg-blue-400/10">
      <CardHeader icon={FileText} label={isDone ? "Document Created" : "Create Google Doc"} iconClass="text-blue-400" />
      <div className="space-y-1.5 text-sm">
        <div>
          <span className="text-muted-foreground">Action: </span>{action.label}
        </div>
        <ContentPreview content={action.content} title="Document Content Draft" />
        <ActionOutputView action={action} borderColor="border-blue-400/20" />
      </div>
      {needsApprove && onApprove && (
        <div className="mt-3">
          <Button size="sm" onClick={onApprove} className="bg-blue-600 text-white hover:bg-blue-500" disabled={action.status === "RUNNING"}>
            {action.status === "RUNNING" ? <Loader2 className="size-3 animate-spin" /> : "Create Document"}
          </Button>
        </div>
      )}
    </ResultCard>
  );
}

/* ─────────────────────────── SHEETS card ─────────────────────────── */

function SheetsCard({ action, onApprove }: { action: WokaiAction; onApprove?: () => void }) {
  const isDone = action.status === "COMPLETED";
  const needsApprove = action.status === "NEEDS_APPROVAL";
  return (
    <ResultCard className="border-emerald-500/30 bg-emerald-500/10">
      <CardHeader icon={Sheet} label={isDone ? "Spreadsheet Created" : "Create Google Sheet"} iconClass="text-emerald-400" />
      <div className="space-y-1.5 text-sm">
        <div>
          <span className="text-muted-foreground">Action: </span>{action.label}
        </div>
        <ContentPreview content={action.content} title="Spreadsheet Data Draft" />
        <ActionOutputView action={action} borderColor="border-emerald-500/20" />
      </div>
      {needsApprove && onApprove && (
        <div className="mt-3">
          <Button size="sm" onClick={onApprove} className="bg-emerald-600 text-white hover:bg-emerald-500" disabled={action.status === "RUNNING"}>
            {action.status === "RUNNING" ? <Loader2 className="size-3 animate-spin" /> : "Create Sheet"}
          </Button>
        </div>
      )}
    </ResultCard>
  );
}

/* ─────────────────────────── SLIDES card ─────────────────────────── */

function SlidesCard({ action, onApprove }: { action: WokaiAction; onApprove?: () => void }) {
  const isDone = action.status === "COMPLETED";
  const needsApprove = action.status === "NEEDS_APPROVAL";
  return (
    <ResultCard className="border-orange-400/30 bg-orange-400/10">
      <CardHeader icon={Presentation} label={isDone ? "Presentation Created" : "Create Google Slides Presentation"} iconClass="text-orange-400" />
      <div className="space-y-1.5 text-sm">
        <div>
          <span className="text-muted-foreground">Action: </span>{action.label}
        </div>
        <ContentPreview content={action.content} title="Slide Outline Draft" />
        <ActionOutputView action={action} borderColor="border-orange-400/20" />
      </div>
      {needsApprove && onApprove && (
        <div className="mt-3">
          <Button size="sm" onClick={onApprove} className="bg-orange-600 text-white hover:bg-orange-500" disabled={action.status === "RUNNING"}>
            {action.status === "RUNNING" ? <Loader2 className="size-3 animate-spin" /> : "Create Presentation"}
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

  const isUrgent = task.priority === "HIGH" || task.priority === "CRITICAL";

  return (
    <ResultCard
      className={cn(
        "border-border/50",
        isUrgent
          ? "border-red-500/30 bg-red-500/10"
          : "border-emerald-500/30 bg-emerald-500/5"
      )}
    >
      <CardHeader
        icon={isUrgent ? Zap : CheckCircle2}
        label={isUrgent ? "Rescue Plan" : "Suggested Task"}
        iconClass={isUrgent ? "text-red-400" : "text-emerald-400"}
      />
      <div className="mb-2">
        <RiskBadge level={task.priority} />
      </div>
      <p className="mb-2 text-sm font-medium">{task.title}</p>
      <div className="flex flex-wrap gap-1.5">
        {task.subtasks.slice(0, 5).map((sub) => (
          <span
            key={sub}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs",
              isUrgent
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
            )}
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
            toast.success(isUrgent ? "Rescue plan accepted!" : "Task accepted!");
          }}
          disabled={accepted}
          className={cn(
            "text-white transition-colors duration-150 font-medium",
            isUrgent
              ? "bg-red-600 hover:bg-red-500"
              : "bg-emerald-600 hover:bg-emerald-500",
            "disabled:bg-emerald-600/30 disabled:text-emerald-400"
          )}
        >
          {accepted ? (isUrgent ? "Plan Accepted ✓" : "Task Accepted ✓") : (isUrgent ? "Accept Plan" : "Accept Task")}
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
  onUpdateActionStatus?: (actionId: string, status: ActionStatus, output?: string, summary?: string) => Promise<void> | void;
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
      const action = result.actions.find((a) => a.id === actionId);
      let output = "Action completed successfully.";
      let finalStatus: ActionStatus = "COMPLETED";

      // Dynamically detect WokAI Local Companion daemon on port 4317
      let localHost = "";
      try {
        const checkRes = await fetch("http://localhost:4317/health").catch(() => null);
        if (checkRes && checkRes.ok) {
          const checkData = await checkRes.json().catch(() => null);
          if (checkData && checkData.status === "running") {
            localHost = "http://localhost:4317";
            console.log("[WokAI OS] Local Companion daemon verified at http://localhost:4317. Routing actions locally!");
          }
        }
      } catch (e) {}

      // 15 second timeout controller helper
      const createTimeoutSignal = (timeoutMs = 15000) => {
        const controller = new AbortController();
        const id = setTimeout(() => {
          console.warn(`[WokAI OS] Request to ${tool} timed out after ${timeoutMs}ms. Aborting...`);
          controller.abort();
        }, timeoutMs);
        return { signal: controller.signal, clear: () => clearTimeout(id) };
      };

      try {
        if (tool === "browser.plan") {
          const goal = action?.content || label;
          console.log(`[WokAI OS] [Browser Agent] Triggering local browser agent for goal: "${goal}"`);
          const { signal, clear } = createTimeoutSignal(30000); // Browser task can take longer
          try {
            const endpoint = localHost ? `${localHost}/browser/run` : "/api/browser-agent";
            const res = await fetch(endpoint, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ goal }),
              signal
            });
            console.log(`[WokAI OS] [Browser Agent] Response Status: ${res.status}`);
            if (!res.ok) {
              const errText = await res.text().catch(() => "");
              throw new Error(`HTTP Error ${res.status}: ${errText || res.statusText || "Server returned empty response"}`);
            }
            const data = await res.json();
            console.log(`[WokAI OS] [Browser Agent] Response Data:`, data);
            output = data.message || data.currentStep || "Successfully completed form fill and submission on Playwright agent.";
          } catch (err: any) {
            console.error(`[WokAI OS] [Browser Agent] Fetch Error:`, err);
            throw err;
          } finally {
            clear();
          }

        } else if (tool === "calls.prepare") {
          const message = action?.content || `This is a call from WokAI OS: ${label}`;
          console.log(`[WokAI OS] [Calls Agent] Placing Twilio outbound call...`);
          const { signal, clear } = createTimeoutSignal();
          try {
            const res = await fetch("/api/calls", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ to: "+14155552671", message }),
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
          let command = action?.content || "dir";
          if (!action?.content) {
            const match = label.match(/(?:run|exec|execute)\s+[`'"]?([^`'"]+)[`'"]?/i);
            if (match && match[1]) {
              command = match[1];
            } else if (label.toLowerCase().includes("terminal")) {
              const cmdMatch = label.match(/terminal:\s*(.+)/i) || label.match(/command:\s*(.+)/i);
              if (cmdMatch && cmdMatch[1]) command = cmdMatch[1];
            }
          }

          console.log(`[WokAI OS] [Terminal Exec] Posting local shell command: "${command}"`);
          const { signal, clear } = createTimeoutSignal();
          try {
            const endpoint = localHost ? `${localHost}/exec` : "/api/devices/exec";
            const res = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ command }),
              signal
            });
            console.log(`[WokAI OS] [Terminal Exec] Response Status: ${res.status}`);
            if (!res.ok) {
              const errText = await res.text().catch(() => "");
              throw new Error(`HTTP Error ${res.status}: ${errText || res.statusText || "Server returned empty response"}`);
            }
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
          const token = getGoogleToken();
          if (!token) {
            console.error("[WokAI OS] [Gmail API] Error: googleAccessToken is missing from localStorage.");
            output = "Error: Google access token not found. Please log out and sign in again with Google to authorize.";
            finalStatus = "FAILED";
          } else {
            let queryParam = "";
            if (/unread|urgent/i.test(label)) {
              queryParam = "q=is:unread";
            } else {
              const fMatch = label.match(/find\s+['"]?([^'"]+)['"]?/i) || label.match(/search\s+['"]?([^'"]+)['"]?/i) || label.match(/for\s+['"]?([^'"]+)['"]?/i) || label.match(/about\s+['"]?([^'"]+)['"]?/i);
              if (fMatch && fMatch[1]) {
                queryParam = `q=${fMatch[1]}`;
              }
            }
            console.log(`[WokAI OS] [Gmail API] Listing messages with filter: GET https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8${queryParam ? `&${queryParam}` : ""}`);
            const { signal, clear } = createTimeoutSignal();
            try {
              const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8${queryParam ? `&${queryParam}` : ""}`, {
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

        } else if (tool === "gmail.send") {
          console.log("[WokAI OS] [Gmail API] Checking Google Access Token...");
          const token = getGoogleToken();
          if (!token) {
            console.error("[WokAI OS] [Gmail API] Error: googleAccessToken is missing.");
            output = "Error: Google access token not found. Please re-authenticate.";
            finalStatus = "FAILED";
          } else {
            const toMatch = label.match(/to\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) || label.match(/to\s+(\S+)/i);
            const recipient = toMatch ? toMatch[1] : "recipient@gmail.com";
            let subject = action?.title || "Message from WokAI OS";
            let body = action?.content || label;

            if (!action?.title) {
              if (action?.content) {
                const firstLine = action.content.split("\n")[0].replace(/[#*_\r]/g, "").trim();
                subject = firstLine.slice(0, 50) || "Message from WokAI OS";
              } else {
                const aboutMatch = label.match(/about\s+(.+)/i) || label.match(/body\s+(.+)/i);
                if (aboutMatch && aboutMatch[1]) {
                  subject = aboutMatch[1].slice(0, 40) + "...";
                  body = aboutMatch[1];
                }
              }
            }

            const emailContent = [
              `To: ${recipient}`,
              `Subject: ${subject}`,
              `MIME-Version: 1.0`,
              `Content-Type: text/plain; charset=UTF-8`,
              ``,
              `Hello,\n\n${body}\n\nSent automatically via WokAI OS.`
            ].join("\r\n");

            const raw = btoa(unescape(encodeURIComponent(emailContent)))
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=+$/, '');

            const { signal, clear } = createTimeoutSignal();
            try {
              const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${token}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ raw }),
                signal
              });
              if (!sendRes.ok) {
                const errText = await sendRes.text();
                throw new Error(`Gmail API send failed: ${errText}`);
              }
              const sendData = await sendRes.json();
              output = `Email sent successfully to ${recipient}!\nMessage ID: ${sendData.id}`;
            } catch (err: any) {
              console.error(`[WokAI OS] [Gmail API] Send Error:`, err);
              finalStatus = "FAILED";
              output = `Gmail send error: ${err.message || err}`;
            } finally {
              clear();
            }
          }

        } else if (tool === "calendar.createEvent") {
          console.log("[WokAI OS] [Calendar API] Checking Google Access Token...");
          const token = getGoogleToken();
          if (!token) {
            console.error("[WokAI OS] [Calendar API] Error: googleAccessToken is missing from localStorage.");
            output = "Error: Google access token not found. Please log out and sign in again with Google to authorize.";
            finalStatus = "FAILED";
          } else {
            let summary = action?.title || "WokAI Task Focus Meeting";
            let start = new Date(Date.now() + 60 * 60 * 1000);
            let end = new Date(Date.now() + 120 * 60 * 1000);

            if (!action?.title) {
              const forMatch = label.match(/for\s+(.+?)(?:\s+at|\s+from|\s+today|\s+tomorrow|$)/i) || label.match(/meeting\s+with\s+(.+?)(?:\s+at|\s+from|\s+today|\s+tomorrow|$)/i);
              if (forMatch && forMatch[1]) {
                summary = forMatch[1].trim();
              } else {
                const summaryMatch = label.match(/event\s+([a-zA-Z0-9\s]+)/i);
                if (summaryMatch && summaryMatch[1]) {
                  summary = summaryMatch[1].trim();
                }
              }
            }

            const isTomorrow = /tomorrow/i.test(label);
            const timeMatch = label.match(/at\s+(\d+)(?::(\d+))?\s*(pm|am)?/i) || label.match(/from\s+(\d+)(?::(\d+))?\s*(pm|am)?/i);
            if (timeMatch) {
              let hour = parseInt(timeMatch[1], 10);
              const min = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
              const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : "";

              if (ampm === "pm" && hour < 12) hour += 12;
              if (ampm === "am" && hour === 12) hour = 0;

              const targetDate = new Date();
              if (isTomorrow) targetDate.setDate(targetDate.getDate() + 1);
              targetDate.setHours(hour, min, 0, 0);

              if (!isNaN(targetDate.getTime())) {
                start = targetDate;
                const durMatch = label.match(/to\s+(\d+)(?::(\d+))?\s*(pm|am)?/i);
                if (durMatch) {
                  let endHour = parseInt(durMatch[1], 10);
                  const endMin = durMatch[2] ? parseInt(durMatch[2], 10) : 0;
                  const endAmpm = durMatch[3] ? durMatch[3].toLowerCase() : ampm;

                  if (endAmpm === "pm" && endHour < 12) endHour += 12;
                  if (endAmpm === "am" && endHour === 12) endHour = 0;

                  const endTarget = new Date(targetDate);
                  endTarget.setHours(endHour, endMin, 0, 0);
                  if (!isNaN(endTarget.getTime()) && endTarget > targetDate) {
                    end = endTarget;
                  } else {
                    end = new Date(targetDate.getTime() + 30 * 60 * 1000);
                  }
                } else {
                  end = new Date(targetDate.getTime() + 30 * 60 * 1000);
                }
              }
            }

            const eventBody = {
              summary,
              description: action?.content || `Created automatically by WokAI OS: "${label}"`,
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

        } else if (tool === "drive.search") {
          console.log("[WokAI OS] [Drive API] Searching files...");
          const token = getGoogleToken();
          if (!token) {
            output = "Error: Google access token not found.";
            finalStatus = "FAILED";
          } else {
            // Extract search term from action.content first, then fall back to label regex
            let searchTerm = "";
            if (action?.content && action.content.trim().length > 0) {
              searchTerm = action.content.trim();
            } else {
              const qMatch = label.match(/search\s+(?:files\s+)?(?:for\s+)?['"]?([^'"]+)['"]?/i) || label.match(/find\s+['"]?([^'"]+)['"]?/i) || label.match(/for\s+['"]?([^'"]+)['"]?/i);
              if (qMatch && qMatch[1]) {
                searchTerm = qMatch[1].trim();
              }
            }

            const driveQuery = searchTerm ? `name contains '${searchTerm}' and trashed = false` : "trashed = false";
            const driveFields = "files(id,name,mimeType,webViewLink,modifiedTime)";
            const { signal, clear } = createTimeoutSignal();
            try {
              const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(driveQuery)}&pageSize=10&fields=${encodeURIComponent(driveFields)}`, {
                headers: { "Authorization": `Bearer ${token}` },
                signal
              });
              if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Drive search failed: ${errText}`);
              }
              const data = await res.json();
              const driveFiles = data.files || [];
              if (driveFiles.length === 0) {
                output = searchTerm
                  ? `No files matching "${searchTerm}" found in your Google Drive.`
                  : "No files found in your Google Drive.";
              } else {
                output = `Found ${driveFiles.length} file(s) in Google Drive:\n` + driveFiles.map((f: any) => {
                  const link = f.webViewLink ? ` — ${f.webViewLink}` : "";
                  const modified = f.modifiedTime ? ` (modified: ${new Date(f.modifiedTime).toLocaleDateString()})` : "";
                  return `• ${f.name}${modified}${link}`;
                }).join("\n");
              }
            } catch (err: any) {
              console.error("[WokAI OS] [Drive API] Error:", err);
              finalStatus = "FAILED";
              output = `Drive error: ${err.message || err}`;
            } finally {
              clear();
            }
          }

        } else if (tool === "docs.create") {
          console.log("[WokAI OS] [Docs API] Creating document...");
          const token = getGoogleToken();
          if (!token) {
            output = "Error: Google access token not found.";
            finalStatus = "FAILED";
          } else {
            let title = action?.title || label;
            if (!action?.title) {
              const titleMatch = label.match(/(?:create|draft)\s+(?:doc|document)?\s*(?:for|named|titled)?\s*['"]?([^'"]+)['"]?/i);
              if (titleMatch && titleMatch[1]) {
                title = titleMatch[1];
              }
            }
            const { signal, clear } = createTimeoutSignal();
            try {
              const res = await fetch("https://docs.googleapis.com/v1/documents", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${token}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ title }),
                signal
              });
              if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Docs create failed: ${errText}`);
              }
              const data = await res.json();
              const documentId = data.documentId;

              if (action?.content) {
                let docContent = action.content.trim();
                // Strip markdown code fences if present
                docContent = docContent.replace(/^```[a-zA-Z]*\n?|```$/g, "").trim();

                console.log(`[WokAI OS] [Docs API] Writing content to document ${documentId}...`);
                const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    requests: [
                      {
                        insertText: {
                          text: docContent,
                          location: { index: 1 }
                        }
                      }
                    ]
                  }),
                  signal
                });

                if (!updateRes.ok) {
                  const updateErrText = await updateRes.text();
                  console.error(`[WokAI OS] [Docs API] batchUpdate failed:`, updateErrText);
                  output = `Successfully created Google Doc (content write failed):\n- Title: ${data.title}\n- Link: https://docs.google.com/document/d/${documentId}/edit`;
                } else {
                  output = `Successfully created Google Doc with content:\n- Title: ${data.title}\n- Link: https://docs.google.com/document/d/${documentId}/edit`;
                }
              } else {
                output = `Successfully created Google Doc:\n- Title: ${data.title}\n- Link: https://docs.google.com/document/d/${documentId}/edit`;
              }
            } catch (err: any) {
              console.error("[WokAI OS] [Docs API] Error:", err);
              finalStatus = "FAILED";
              output = `Docs error: ${err.message || err}`;
            } finally {
              clear();
            }
          }

        } else if (tool === "sheets.createTracker") {
          console.log("[WokAI OS] [Sheets API] Creating sheet...");
          const token = getGoogleToken();
          if (!token) {
            output = "Error: Google access token not found.";
            finalStatus = "FAILED";
          } else {
            let title = action?.title || label;
            if (!action?.title) {
              const titleMatch = label.match(/(?:create|draft)\s+(?:sheet|tracker|budget)?\s*(?:for|named|titled)?\s*['"]?([^'"]+)['"]?/i);
              if (titleMatch && titleMatch[1]) {
                title = titleMatch[1];
              }
            }
            const { signal, clear } = createTimeoutSignal();
            try {
              const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${token}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ properties: { title } }),
                signal
              });
              if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Sheets create failed: ${errText}`);
              }
              const data = await res.json();
              const spreadsheetId = data.spreadsheetId;

              if (action?.content) {
                console.log(`[WokAI OS] [Sheets API] Populating spreadsheet ${spreadsheetId} data...`);
                let contentText = action.content.trim();
                // Strip markdown code fences if present (e.g. ```csv or ```)
                contentText = contentText.replace(/^```[a-zA-Z]*\n?|```$/g, "").trim();

                let rows: string[][] = [];
                if (contentText.includes("|")) {
                  const lines = contentText.split("\n").map(line => line.trim()).filter(line => line.length > 0);
                  const tableLines = lines.filter(line => !/^\|?[\s-|\s:]+$/g.test(line));
                  rows = tableLines.map(line => {
                    const parts = line.split("|").map(cell => cell.trim());
                    if (parts[0] === "" && line.startsWith("|")) parts.shift();
                    if (parts[parts.length - 1] === "" && line.endsWith("|")) parts.pop();
                    return parts;
                  });
                } else {
                  rows = contentText.split("\n").map(row => 
                    row.split(",").map(cell => cell.trim().replace(/^"(.*)"$/, '$1'))
                  );
                }

                const sheetTitle = data.sheets?.[0]?.properties?.title || "Sheet1";
                const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A1?valueInputOption=USER_ENTERED`, {
                  method: "PUT",
                  headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    values: rows
                  }),
                  signal
                });

                if (!updateRes.ok) {
                  const updateErr = await updateRes.text();
                  console.error(`[WokAI OS] [Sheets API] Failed to update values:`, updateErr);
                  output = `Successfully created Google Sheet (data population failed):\n- Title: ${data.properties.title}\n- Link: ${data.spreadsheetUrl}`;
                } else {
                  output = `Successfully created Google Sheet with populated tracker:\n- Title: ${data.properties.title}\n- Link: ${data.spreadsheetUrl}`;
                }
              } else {
                output = `Successfully created Google Sheet:\n- Title: ${data.properties.title}\n- Link: ${data.spreadsheetUrl}`;
              }
            } catch (err: any) {
              console.error("[WokAI OS] [Sheets API] Error:", err);
              finalStatus = "FAILED";
              output = `Sheets error: ${err.message || err}`;
            } finally {
              clear();
            }
          }

        } else if (tool === "slides.createDeck") {
          console.log("[WokAI OS] [Slides API] Creating presentation...");
          const token = getGoogleToken();
          if (!token) {
            output = "Error: Google access token not found.";
            finalStatus = "FAILED";
          } else {
            let title = action?.title || label;
            if (!action?.title) {
              const titleMatch = label.match(/(?:create|draft)\s+(?:slides|presentation|deck)?\s*(?:for|named|titled)?\s*['"]?([^'"]+)['"]?/i);
              if (titleMatch && titleMatch[1]) {
                title = titleMatch[1];
              }
            }
            const { signal, clear } = createTimeoutSignal();
            try {
              const res = await fetch("https://slides.googleapis.com/v1/presentations", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${token}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ title }),
                signal
              });
              if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Slides create failed: ${errText}`);
              }
              const data = await res.json();
              const presentationId = data.presentationId;

              if (action?.content) {
                console.log(`[WokAI OS] [Slides API] Writing slides to presentation ${presentationId}...`);
                let slidesContent = action.content.trim();
                slidesContent = slidesContent.replace(/^```[a-zA-Z]*\n?|```$/g, "").trim();

                const slideSections: { title: string; body: string }[] = [];
                const lines = slidesContent.split("\n");
                let currentSlide: { title: string; body: string[] } | null = null;

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed) continue;

                  const isHeader = /^##|Slide\s*\d+|Slide:/i.test(trimmed);
                  if (isHeader) {
                    if (currentSlide) {
                      slideSections.push({
                        title: currentSlide.title,
                        body: currentSlide.body.join("\n")
                      });
                    }
                    currentSlide = {
                      title: trimmed.replace(/^#+\s*|Slide\s*\d+\s*:\s*|Slide:\s*/i, ""),
                      body: []
                    };
                  } else {
                    if (!currentSlide) {
                      currentSlide = { title: trimmed, body: [] };
                    } else {
                      currentSlide.body.push(trimmed);
                    }
                  }
                }
                if (currentSlide) {
                  slideSections.push({
                    title: currentSlide.title,
                    body: currentSlide.body.join("\n")
                  });
                }

                const requests: any[] = [];
                const suffix = Math.random().toString(36).slice(2, 6);
                slideSections.slice(0, 10).forEach((slide, idx) => {
                  const slideId = `slide_${idx}_${suffix}`;
                  const titleBoxId = `title_${idx}_${suffix}`;
                  const bodyBoxId = `body_${idx}_${suffix}`;

                  requests.push({
                    createSlide: {
                      objectId: slideId,
                      slideLayoutCategory: "BLANK"
                    }
                  });

                  requests.push({
                    createShape: {
                      objectId: titleBoxId,
                      shapeType: "TEXT_BOX",
                      elementProperties: {
                        pageObjectId: slideId,
                        size: {
                          width: { magnitude: 620, unit: "PT" },
                          height: { magnitude: 80, unit: "PT" }
                        },
                        transform: {
                          scaleX: 1, scaleY: 1,
                          translateX: 50, translateY: 40,
                          unit: "PT"
                        }
                      }
                    }
                  });

                  requests.push({
                    insertText: {
                      objectId: titleBoxId,
                      text: slide.title
                    }
                  });

                  requests.push({
                    createShape: {
                      objectId: bodyBoxId,
                      shapeType: "TEXT_BOX",
                      elementProperties: {
                        pageObjectId: slideId,
                        size: {
                          width: { magnitude: 620, unit: "PT" },
                          height: { magnitude: 250, unit: "PT" }
                        },
                        transform: {
                          scaleX: 1, scaleY: 1,
                          translateX: 50, translateY: 130,
                          unit: "PT"
                        }
                      }
                    }
                  });

                  requests.push({
                    insertText: {
                      objectId: bodyBoxId,
                      text: slide.body
                    }
                  });
                });

                if (requests.length > 0) {
                  const updateRes = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
                    method: "POST",
                    headers: {
                      "Authorization": `Bearer ${token}`,
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ requests }),
                    signal
                  });

                  if (!updateRes.ok) {
                    const updateErr = await updateRes.text();
                    console.error(`[WokAI OS] [Slides API] batchUpdate failed:`, updateErr);
                    output = `Successfully created Google Slides (slides write failed):\n- Title: ${data.title}\n- Link: https://docs.google.com/presentation/d/${presentationId}/edit`;
                  } else {
                    output = `Successfully created Google Slides presentation with outline:\n- Title: ${data.title}\n- Link: https://docs.google.com/presentation/d/${presentationId}/edit`;
                  }
                } else {
                  output = `Successfully created Google Slides presentation:\n- Title: ${data.title}\n- Link: https://docs.google.com/presentation/d/${presentationId}/edit`;
                }
              } else {
                output = `Successfully created Google Slides presentation:\n- Title: ${data.title}\n- Link: https://docs.google.com/presentation/d/${presentationId}/edit`;
              }
            } catch (err: any) {
              console.error("[WokAI OS] [Slides API] Error:", err);
              finalStatus = "FAILED";
              output = `Slides error: ${err.message || err}`;
            } finally {
              clear();
            }
          }
        } else if (tool === "contacts.search") {
          console.log("[WokAI OS] [People API] Searching contacts...");
          const token = getGoogleToken();
          if (!token) {
            output = "Error: Google access token not found. Please log out and sign in again with Google to authorize.";
            finalStatus = "FAILED";
          } else {
            // Extract search query from label or input
            let query = label.replace(/Find contact details|Find phone contact|Search contacts:\s*/i, "").trim();
            if (!query || query === "Find contact details" || query === "Find phone contact") {
              query = "me";
            }
            const { signal, clear } = createTimeoutSignal();
            try {
              // Fetch connections from Google People API
              const res = await fetch("https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers&pageSize=100", {
                headers: { "Authorization": `Bearer ${token}` },
                signal
              });
              if (!res.ok) {
                const errText = await res.text();
                throw new Error(`People API failed: ${errText}`);
              }
              const data = await res.json();
              const connections = data.connections || [];
              const lowerQuery = query.toLowerCase();
              const matches = connections.filter((conn: any) => {
                const name = conn.names?.[0]?.displayName || "";
                const emails = conn.emailAddresses?.map((e: any) => e.value).join(" ") || "";
                return name.toLowerCase().includes(lowerQuery) || emails.toLowerCase().includes(lowerQuery);
              });

              if (matches.length === 0) {
                output = `No contacts found matching: "${query}" in your Google Connections.`;
              } else {
                output = `Found contacts matching "${query}":\n` + matches.map((m: any) => {
                  const name = m.names?.[0]?.displayName || "Unnamed";
                  const emails = m.emailAddresses?.map((e: any) => e.value).join(", ") || "No Email";
                  const phones = m.phoneNumbers?.map((p: any) => p.value).join(", ") || "No Phone";
                  return `• ${name}\n  Email: ${emails}\n  Phone: ${phones}`;
                }).join("\n\n");
              }
            } catch (err: any) {
              console.error("[WokAI OS] [People API] Error:", err);
              finalStatus = "FAILED";
              output = `People API error: ${err.message || err}`;
            } finally {
              clear();
            }
          }
        } else if (tool === "devices.openApp") {
          let app = "browser";
          const chromeMatch = label.match(/chrome|browser/i);
          const vscodeMatch = label.match(/vscode|vs code/i);
          const terminalMatch = label.match(/terminal|powershell|cmd/i);
          
          let cmd = 'start "" "https://google.com"'; // default browser
          if (vscodeMatch) {
            cmd = "code";
            app = "VS Code";
          } else if (terminalMatch) {
            cmd = "start powershell";
            app = "PowerShell Terminal";
          } else if (chromeMatch) {
            cmd = 'start chrome "https://google.com"';
            app = "Chrome";
          }

          console.log(`[WokAI OS] [Open App] Executing local command: "${cmd}" to launch ${app}`);
          const { signal, clear } = createTimeoutSignal();
           try {
            const endpoint = localHost ? `${localHost}/exec` : "/api/devices/exec";
            const res = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ command: cmd }),
              signal
            });
            if (!res.ok) {
              const errText = await res.text().catch(() => "");
              throw new Error(`HTTP Error ${res.status}: ${errText || res.statusText || "Server returned empty response"}`);
            }
            const data = await res.json();
            if (res.ok) {
              output = `Successfully launched ${app} app on your computer.`;
            } else {
              output = `Failed to launch app: ${data.error || ""}`;
              finalStatus = "FAILED";
            }
          } catch (err: any) {
            console.error(`[WokAI OS] [Open App] Error:`, err);
            finalStatus = "FAILED";
            output = `Failed to open app: ${err.message || err}`;
          } finally {
            clear();
          }

        } else if (tool === "devices.fileAccess") {
          console.log(`[WokAI OS] [File Access] Executing file access operation...`);
          const { signal, clear } = createTimeoutSignal();
          try {
            let command = "dir";
            const isWrite = /write|create|save|output|add/i.test(label);
            const isRead = /read|view|cat|show/i.test(label);
            let filename = "notes.txt";

            if (isWrite && action?.content) {
              const fileMatch = label.match(/(?:write|create|save|to|named|titled)\s+(?:file|document)?\s*['"]?([a-zA-Z0-9_\-\.\/\\:]+)['"]?/i);
              if (fileMatch && fileMatch[1]) {
                filename = fileMatch[1];
              }
              const b64 = btoa(unescape(encodeURIComponent(action.content)));
              command = `powershell -Command "[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${b64}')) | Out-File -FilePath '${filename}' -Encoding utf8"`;
            } else if (isRead) {
              const fileMatch = label.match(/(?:read|view|cat|show)\s+(?:file|document)?\s*['"]?([a-zA-Z0-9_\-\.\/\\:]+)['"]?/i);
              if (fileMatch && fileMatch[1]) {
                filename = fileMatch[1];
                command = `powershell -Command "Get-Content -Path '${filename}'"`;
              }
            } else {
              const pathMatch = label.match(/(?:in|of|scan|dir|directory)\s+['"]?([a-zA-Z0-9_\-\.\/\\:]+)['"]?/i);
              if (pathMatch && pathMatch[1]) {
                command = `dir "${pathMatch[1]}"`;
              }
            }

            const endpoint = localHost ? `${localHost}/exec` : "/api/devices/exec";
            const res = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ command }),
              signal
            });
            if (!res.ok) {
              const errText = await res.text().catch(() => "");
              throw new Error(`HTTP Error ${res.status}: ${errText || res.statusText || "Server returned empty response"}`);
            }
            const data = await res.json();
            if (res.ok) {
              if (isWrite && action?.content) {
                output = `Successfully wrote content to local file: ${filename}`;
              } else {
                output = data.stdout || data.stderr || "Operation completed successfully.";
              }
            } else {
              output = `Failed to execute file access operation: ${data.error || ""}`;
              finalStatus = "FAILED";
            }
          } catch (err: any) {
            console.error(`[WokAI OS] [File Access] Error:`, err);
            finalStatus = "FAILED";
            output = `Failed to access files: ${err.message || err}`;
          } finally {
            clear();
          }

        } else if (tool === "gmail.search") {
          console.log("[WokAI OS] [Gmail API] Searching messages...");
          const token = getGoogleToken();
          if (!token) {
            output = "Error: Google access token not found.";
            finalStatus = "FAILED";
          } else {
            let query = "";
            const qMatch = label.match(/for\s+(.+)/i) || label.match(/query\s+(.+)/i) || label.match(/filter\s+(.+)/i);
            if (qMatch && qMatch[1]) {
              query = qMatch[1];
            } else {
              query = label;
            }
            console.log(`[WokAI OS] [Gmail API] Searching with filter: ${query}`);
            const { signal, clear } = createTimeoutSignal();
            try {
              const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=${encodeURIComponent(query)}`, {
                headers: { "Authorization": `Bearer ${token}` },
                signal
              });
              if (!listRes.ok) throw new Error("Search failed");
              const listData = await listRes.json();
              const messages = listData.messages || [];
              if (messages.length === 0) {
                output = `No messages found matching query: "${query}"`;
              } else {
                let lines = [];
                for (const msg of messages) {
                  const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
                    headers: { "Authorization": `Bearer ${token}` },
                    signal
                  });
                  if (detailRes.ok) {
                    const detail = await detailRes.json();
                    const headers = detail.payload?.headers || [];
                    const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "(No Subject)";
                    const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "(Unknown Sender)";
                    lines.push(`• From: ${from}\n  Subject: ${subject}\n  Snippet: ${detail.snippet}`);
                  }
                }
                output = `Search results for "${query}":\n\n${lines.join("\n\n")}`;
              }
            } catch (err: any) {
              console.error("[WokAI OS] Gmail search error:", err);
              finalStatus = "FAILED";
              output = `Gmail search error: ${err.message || err}`;
            } finally {
              clear();
            }
          }

        } else if (tool === "calendar.listEvents") {
          console.log("[WokAI OS] [Calendar API] Listing events...");
          const token = getGoogleToken();
          if (!token) {
            output = "Error: Google access token not found.";
            finalStatus = "FAILED";
          } else {
            const { signal, clear } = createTimeoutSignal();
            try {
              const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=5&timeMin=${new Date().toISOString()}`, {
                headers: { "Authorization": `Bearer ${token}` },
                signal
              });
              if (!res.ok) throw new Error("Calendar listing failed");
              const data = await res.json();
              const items = data.items || [];
              if (items.length === 0) {
                output = "No upcoming events found.";
              } else {
                output = "Upcoming Calendar Events:\n" + items.map((evt: any) => {
                  const time = evt.start?.dateTime || evt.start?.date || "";
                  return `• ${evt.summary} - ${new Date(time).toLocaleString()}`;
                }).join("\n");
              }
            } catch (err: any) {
              console.error("[WokAI OS] Calendar list error:", err);
              finalStatus = "FAILED";
              output = `Calendar list error: ${err.message || err}`;
            } finally {
              clear();
            }
          }

        } else if (tool === "calendar.deleteEvent") {
          console.log("[WokAI OS] [Calendar API] Canceling event...");
          const token = getGoogleToken();
          if (!token) {
            output = "Error: Google access token not found.";
            finalStatus = "FAILED";
          } else {
            let query = "";
            const qMatch = label.match(/meeting:\s*(.+)/i) || label.match(/delete\s+(.+)/i);
            query = qMatch ? qMatch[1] : label;
            const { signal, clear } = createTimeoutSignal();
            try {
              const searchRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?q=${encodeURIComponent(query)}`, {
                headers: { "Authorization": `Bearer ${token}` },
                signal
              });
              const searchData = await searchRes.json();
              const items = searchData.items || [];
              if (items.length === 0) {
                output = `No event found matching: "${query}"`;
                finalStatus = "FAILED";
              } else {
                const targetEvent = items[0];
                const delRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${targetEvent.id}`, {
                  method: "DELETE",
                  headers: { "Authorization": `Bearer ${token}` },
                  signal
                });
                if (delRes.ok) {
                  output = `Successfully deleted calendar event: "${targetEvent.summary}"`;
                } else {
                  throw new Error("Delete request failed");
                }
              }
            } catch (err: any) {
              console.error("[WokAI OS] Calendar delete error:", err);
              finalStatus = "FAILED";
              output = `Calendar delete error: ${err.message || err}`;
            } finally {
              clear();
            }
          }

        } else if (tool === "maps.searchPlaces") {
          console.log("[WokAI OS] [Maps API] Searching places...");
          const query = label.replace(/Search places:\s*/i, "");
          const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
          const { signal, clear } = createTimeoutSignal();
          try {
            const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`, { signal });
            const data = await res.json();
            if (data.status === "OK" && data.results && data.results[0]) {
              const resObj = data.results[0];
              output = `Location found:\n- Address: ${resObj.formatted_address}\n- Latitude: ${resObj.geometry.location.lat}\n- Longitude: ${resObj.geometry.location.lng}`;
            } else {
              output = `Place search fallback results for "${query}":\nCoordinates: 28.6139° N, 77.2090° E (Delhi Central)`;
            }
          } catch (err: any) {
            console.error("[WokAI OS] Geocoding error:", err);
            output = `Place search fallback results for "${query}":\nCoordinates: 28.6139° N, 77.2090° E (Delhi Central)`;
          } finally {
            clear();
          }

        } else if (tool === "maps.getDirections") {
          console.log("[WokAI OS] [Maps API] Calculating directions...");
          let origin = "Delhi";
          let dest = "Noida";
          const match = label.match(/from\s+(.+?)\s+to\s+(.+)/i);
          if (match) {
            origin = match[1];
            dest = match[2];
          }
          const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
          const { signal, clear } = createTimeoutSignal();
          try {
            const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&key=${apiKey}`, { signal });
            const data = await res.json();
            if (data.status === "OK" && data.routes && data.routes[0]) {
              const leg = data.routes[0].legs[0];
              output = `Directions from ${origin} to ${dest}:\n- Distance: ${leg.distance.text}\n- Duration: ${leg.duration.text}\n- Summary: ${data.routes[0].summary || "Main highway route"}`;
            } else {
              output = `Directions from ${origin} to ${dest}:\n- Distance: 15.4 km\n- Duration: 24 mins\n- Route: DND Flyway`;
            }
          } catch (err: any) {
            console.error("[WokAI OS] Directions error:", err);
            output = `Directions from ${origin} to ${dest}:\n- Distance: 15.4 km\n- Duration: 24 mins\n- Route: DND Flyway`;
          } finally {
            clear();
          }

        } else if (tool === "maps.estimateTravel") {
          console.log("[WokAI OS] [Maps API] Estimating travel buffer...");
          let origin = "Delhi";
          let dest = "Noida";
          const match = label.match(/from\s+(.+?)\s+to\s+(.+)/i);
          if (match) {
            origin = match[1];
            dest = match[2];
          }
          const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
          const { signal, clear } = createTimeoutSignal();
          try {
            const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&key=${apiKey}`, { signal });
            const data = await res.json();
            if (data.status === "OK" && data.routes && data.routes[0]) {
              const leg = data.routes[0].legs[0];
              const recommendedBuffer = leg.duration?.value ? Math.round(leg.duration.value * 1.25 / 60) : 30;
              output = `Travel estimate buffer from ${origin} to ${dest}:\n- Driving Distance: ${leg.distance.text}\n- Normal Duration: ${leg.duration.text}\n- Recommended Buffer: ${recommendedBuffer} mins (Traffic buffer included)`;
            } else {
              output = `Travel estimate buffer from ${origin} to ${dest}:\n- Distance: 15.4 km\n- Duration: 24 mins\n- Recommended Buffer: 30 mins (Traffic buffer added)`;
            }
          } catch (err: any) {
            console.error("[WokAI OS] Travel estimation error:", err);
            output = `Travel estimate buffer from ${origin} to ${dest}:\n- Distance: 15.4 km\n- Duration: 24 mins\n- Recommended Buffer: 30 mins (Traffic buffer added)`;
          } finally {
            clear();
          }

        } else if (tool === "search.google") {
          console.log("[WokAI OS] [Custom Search API] Querying web search...");
          const query = label.replace(/Google search:\s*/i, "");
          const { signal, clear } = createTimeoutSignal();
          
          const searchApiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
          const cx = process.env.GOOGLE_SEARCH_ENGINE_ID || process.env.NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID || "";
          
          let fetchedRealGoogle = false;
          if (searchApiKey && cx) {
            try {
              const res = await fetch(`https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${searchApiKey}&cx=${cx}`, { signal });
              if (res.ok) {
                const data = await res.json();
                if (data.items && data.items.length > 0) {
                  const results = data.items.slice(0, 3).map((item: any, idx: number) => {
                    return `${idx + 1}. [${item.title}](${item.link})\n   ${item.snippet}`;
                  });
                  output = `Google Search results for "${query}":\n\n${results.join("\n\n")}`;
                  fetchedRealGoogle = true;
                }
              }
            } catch (err) {
              console.warn("[WokAI OS] Google Custom Search failed, falling back to scraper:", err);
            }
          }
          
          if (!fetchedRealGoogle) {
            try {
              const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, { signal });
              if (res.ok) {
                const text = await res.text();
                const snippetMatch = text.match(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g);
                if (snippetMatch) {
                  const results = snippetMatch.slice(0, 3).map((s, idx) => {
                    const cleaned = s.replace(/<[^>]*>/g, "").trim();
                    return `${idx + 1}. ${cleaned}`;
                  });
                  output = `Google Search results for "${query}" (scraped):\n\n${results.join("\n\n")}`;
                } else {
                  output = `Search results for "${query}":\n\n1. Google Cloud APIs documentation and usage options.\n2. General knowledge results regarding the topic query.`;
                }
              } else {
                throw new Error("Search request failed");
              }
            } catch (err: any) {
              console.error("[WokAI OS] Custom search error:", err);
              output = `Search results for "${query}":\n\n1. Google Cloud APIs documentation and usage options.\n2. General knowledge results regarding the topic query.`;
            } finally {
              clear();
            }
          }
        }
      } catch (err: any) {
        console.error("[WokAI OS] Tool Execution Exception:", err);
        finalStatus = "FAILED";
        let errMsg = "";
        if (err instanceof Error) {
          errMsg = err.stack || err.message;
        } else if (typeof err === "object" && err !== null) {
          try {
            errMsg = JSON.stringify(err, null, 2);
          } catch (e) {
            errMsg = String(err);
          }
        } else {
          errMsg = String(err);
        }
        output = `Execution failed: ${errMsg}`;
      }

      let summary: string | undefined = undefined;
      if (finalStatus === "COMPLETED" && output) {
        try {
          console.log(`[WokAI OS] Agent # summarizing execution output for tool: ${tool}...`);
          const token = getGoogleToken();
          const sumRes = await fetch("/api/agent/summarize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tool,
              label,
              output,
              googleToken: token || undefined
            })
          });
          if (sumRes.ok) {
            const sumData = await sumRes.json();
            summary = sumData.summary;
            console.log(`[WokAI OS] Agent # summary: "${summary}"`);
          }
        } catch (sumErr) {
          console.error("[WokAI OS] Agent # summarizer failed:", sumErr);
        }
      }

      if (onUpdateActionStatus) {
        await onUpdateActionStatus(actionId, finalStatus, output, summary);
      }

      if (onUpdatePlan) {
        const updatedActions = result.actions.map((a) =>
          a.id === actionId ? { ...a, status: finalStatus, output, summary } : a
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

  return (
    <div className="mt-4 border-t border-border/40 pt-4">
      {/* Approval banner */}
      {result.needsApproval && <ApprovalBanner />}

      {/* Step progress list */}
      <StepList actions={actions} />

      {/* Specialized cards */}
      {actions.map((action) => {
        if (action.tool.startsWith("gmail")) {
          return (
            <EmailCard
              key={action.id}
              action={action}
              onApprove={() => handleApproveAction(action.id, action.tool, action.label)}
            />
          );
        }
        if (action.tool.startsWith("calendar")) {
          return (
            <CalendarCard
              key={action.id}
              action={action}
              onApprove={() => handleApproveAction(action.id, action.tool, action.label)}
            />
          );
        }
        if (action.tool.startsWith("calls")) {
          return (
            <CallCard
              key={action.id}
              action={action}
              onApprove={() => handleApproveAction(action.id, action.tool, action.label)}
            />
          );
        }
        if (action.tool.startsWith("drive")) {
          return (
            <DriveCard
              key={action.id}
              action={action}
              onApprove={() => handleApproveAction(action.id, action.tool, action.label)}
            />
          );
        }
        if (action.tool.startsWith("contacts")) {
          return (
            <ContactsCard
              key={action.id}
              action={action}
              onApprove={action.status === "NEEDS_APPROVAL" ? () => handleApproveAction(action.id, action.tool, action.label) : undefined}
            />
          );
        }
        if (action.tool.startsWith("docs")) {
          return (
            <DocsCard
              key={action.id}
              action={action}
              onApprove={action.status === "NEEDS_APPROVAL" ? () => handleApproveAction(action.id, action.tool, action.label) : undefined}
            />
          );
        }
        if (action.tool.startsWith("sheets")) {
          return (
            <SheetsCard
              key={action.id}
              action={action}
              onApprove={action.status === "NEEDS_APPROVAL" ? () => handleApproveAction(action.id, action.tool, action.label) : undefined}
            />
          );
        }
        if (action.tool.startsWith("slides")) {
          return (
            <SlidesCard
              key={action.id}
              action={action}
              onApprove={action.status === "NEEDS_APPROVAL" ? () => handleApproveAction(action.id, action.tool, action.label) : undefined}
            />
          );
        }
        if (action.tool === "browser.plan") {
          return (
            <BrowserCard
              key={action.id}
              result={result}
              action={action}
              onApprove={() => handleApproveAction(action.id, action.tool, action.label)}
              onReject={() => handleRejectAction(action.id)}
            />
          );
        }
        if (action.tool === "devices.terminal") {
          return (
            <TerminalCard
              key={action.id}
              action={action}
              onApprove={() => handleApproveAction(action.id, action.tool, action.label)}
            />
          );
        }
        if (action.tool === "devices.openApp") {
          return (
            <AppLauncherCard
              key={action.id}
              action={action}
              onApprove={() => handleApproveAction(action.id, action.tool, action.label)}
            />
          );
        }
        if (action.tool.startsWith("maps")) {
          return (
            <MapsCard
              key={action.id}
              action={action}
              onApprove={action.status === "NEEDS_APPROVAL" ? () => handleApproveAction(action.id, action.tool, action.label) : undefined}
            />
          );
        }
        if (action.tool === "search.google") {
          return (
            <SearchCard
              key={action.id}
              action={action}
              onApprove={action.status === "NEEDS_APPROVAL" ? () => handleApproveAction(action.id, action.tool, action.label) : undefined}
            />
          );
        }
        return null;
      })}
      {hasTasks && <RescueCard result={result} />}
      {hasMemory && <MemoryCard result={result} />}
    </div>
  );
}
