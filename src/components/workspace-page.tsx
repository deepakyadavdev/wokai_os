"use client";

import * as React from "react";

import {
  Bell,
  Bot,
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Globe,
  Clock,
  FileText,
  Gauge,
  HardDrive,
  Inbox,
  LifeBuoy,
  Mail,
  Map,
  MessageSquare,
  MonitorSmartphone,
  Phone,
  Presentation,
  Search,
  Settings,
  Sheet,
  ShieldCheck,
  SquareCheckBig,
  Users,
  Loader2
} from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { ChatConsole } from "@/components/chat-console";
import { PageHeader } from "@/components/page-header";
import { RiskBadge } from "@/components/risk-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspaceData } from "@/hooks/use-workspace-data";
import { formatRelativeTime } from "@/lib/utils";
import { highestRisk, riskCopy } from "@/lib/wokai/risk";
import type { ActionStatus, BrowserJob, RiskLevel, WokaiMemory, WorkspaceSnapshot, WokaiTask, WokaiDevice } from "@/lib/types";
import { toast } from "sonner";
import { getGoogleToken, saveGoogleToken, clearGoogleToken, tokenExpiresIn } from "@/lib/google/token";
import { Plus, Trash } from "lucide-react";

type PageKind =
  | "dashboard"
  | "chat"
  | "tasks"
  | "memory"
  | "inbox"
  | "calendar"
  | "drive"
  | "workspace"
  | "devices"
  | "lifesaver"
  | "browser-agent"
  | "settings";

const pageMeta = {
  dashboard: {
    title: "Command Dashboard",
    description: "Urgent work, live actions, memory, devices, and fast AI input in one operating surface.",
    icon: Gauge
  },
  chat: {
    title: "AI Assistant",
    description: "A conductor-style interface that shows reasoning, action status, tools, and approval points.",
    icon: MessageSquare
  },
  tasks: {
    title: "Task Engine",
    description: "Deadline-aware tasks with risk score, subtasks, progress, and next actions.",
    icon: SquareCheckBig
  },
  memory: {
    title: "Memory Engine",
    description: "Preferences, habits, contacts, and context that personalize future plans.",
    icon: Brain
  },
  inbox: {
    title: "Gmail Assistant",
    description: "Urgent email detection, summaries, commitments, deadlines, and approval-first replies.",
    icon: Inbox
  },
  calendar: {
    title: "Calendar Assistant",
    description: "Free-slot search, meeting creation scaffolding, focus blocks, and conflict detection.",
    icon: CalendarDays
  },
  drive: {
    title: "Drive Assistant",
    description: "Find relevant files, create Docs, Sheets, Slides, and attach source material to work plans.",
    icon: HardDrive
  },
  workspace: {
    title: "Workspace Hub",
    description: "One hub for Gmail, Calendar, Drive, Docs, Sheets, Slides, Contacts, Calls, Browser, and Devices.",
    icon: BriefcaseBusiness
  },
  devices: {
    title: "Device Manager",
    description: "Connected devices, online status, queued commands, and phone-to-laptop handoff.",
    icon: MonitorSmartphone
  },
  lifesaver: {
    title: "Life Saver Mode",
    description: "Last-minute rescue plans for work that is close to slipping.",
    icon: LifeBuoy
  },
  "browser-agent": {
    title: "Browser Agent",
    description: "Playwright-ready browser workflows that pause before sensitive actions.",
    icon: Globe
  },
  settings: {
    title: "Settings",
    description: "Integrations, memory preferences, theme, safety rules, and deployment readiness.",
    icon: Settings
  }
} satisfies Record<PageKind, { title: string; description: string; icon: typeof Gauge }>;

export function WorkspacePage({ page }: { page: PageKind }) {
  const { user, firebaseConfigured } = useAuth();
  const workspace = useWorkspaceData(user);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !workspace.hydrated) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const meta = pageMeta[page];
  const risk = highestRisk(workspace.snapshot.tasks);

  return (
    <>
      <PageHeader
        title={meta.title}
        description={meta.description}
        icon={meta.icon}
        status={riskCopy(risk)}
      />
      {renderPage(page, workspace.snapshot, workspace.mergeAgentResult, firebaseConfigured)}
    </>
  );
}

function renderPage(
  page: PageKind,
  snapshot: WorkspaceSnapshot,
  mergeAgentResult: ReturnType<typeof useWorkspaceData>["mergeAgentResult"],
  firebaseConfigured: boolean
) {
  switch (page) {
    case "dashboard":
      return <Dashboard snapshot={snapshot} mergeAgentResult={mergeAgentResult} />;
    case "chat":
      return <ChatConsole onAgentResult={mergeAgentResult} />;
    case "tasks":
      return <TasksPage snapshot={snapshot} />;
    case "memory":
      return <MemoryPage snapshot={snapshot} />;
    case "inbox":
      return <InboxPage snapshot={snapshot} />;
    case "calendar":
      return <CalendarPage snapshot={snapshot} />;
    case "drive":
      return <DrivePage />;
    case "workspace":
      return <WorkspaceHub snapshot={snapshot} />;
    case "devices":
      return <DevicesPage snapshot={snapshot} />;
    case "lifesaver":
      return <LifeSaverPage snapshot={snapshot} />;
    case "browser-agent":
      return <BrowserAgentPage snapshot={snapshot} />;
    case "settings":
      return <SettingsPage firebaseConfigured={firebaseConfigured} />;
  }
}

function Dashboard({
  snapshot,
  mergeAgentResult
}: {
  snapshot: WorkspaceSnapshot;
  mergeAgentResult: ReturnType<typeof useWorkspaceData>["mergeAgentResult"];
}) {
  const urgent = snapshot.tasks.filter((task) => task.priority === "HIGH" || task.priority === "CRITICAL");
  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="flex flex-col gap-5">
        <MetricGrid snapshot={snapshot} />
        <Card>
          <CardHeader>
            <CardTitle>Urgent Work</CardTitle>
            <CardDescription>WokAI prioritizes what can still be saved.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {urgent.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </CardContent>
        </Card>
        <ActionFeed snapshot={snapshot} />
      </div>
      <div className="flex flex-col gap-5">
        <ChatConsole compact onAgentResult={mergeAgentResult} />
        <QuickActions />
        <DeviceStrip snapshot={snapshot} />
      </div>
    </div>
  );
}

function MetricGrid({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  const done = snapshot.tasks.filter((task) => task.status === "done").length;
  const urgent = snapshot.tasks.filter((task) => task.priority === "HIGH" || task.priority === "CRITICAL").length;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric title="Risk Level" value={highestRisk(snapshot.tasks)} icon={LifeBuoy} level={highestRisk(snapshot.tasks)} />
      <Metric title="Urgent Tasks" value={String(urgent)} icon={Clock} level={urgent ? "HIGH" : "LOW"} />
      <Metric title="Completed" value={String(done)} icon={CheckCircle2} level="LOW" />
      <Metric title="Devices Online" value={`${snapshot.devices.filter((device) => device.online).length}/${snapshot.devices.length}`} icon={MonitorSmartphone} level="MEDIUM" />
    </div>
  );
}

function Metric({
  title,
  value,
  icon: Icon,
  level
}: {
  title: string;
  value: string;
  icon: typeof Gauge;
  level: RiskLevel;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-5">
        <div>
          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{title}</div>
          <div className="mt-2 text-2xl font-semibold">{value}</div>
        </div>
        <div className="flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <Icon />
        </div>
      </CardContent>
      <div className="px-5 pb-5">
        <RiskBadge level={level} />
      </div>
    </Card>
  );
}

function TaskCard({ task }: { task: WokaiTask }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{task.title}</h3>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{task.description}</p>
        </div>
        <RiskBadge level={task.priority || "LOW"} />
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{task.deadline ? `Due ${formatRelativeTime(task.deadline)}` : "No deadline"}</span>
        <span>{task.progress}%</span>
      </div>
      <Progress className="mt-2" value={task.progress} />
      <div className="mt-3 flex flex-wrap gap-2">
        {task.subtasks.slice(0, 3).map((subtask) => (
          <Badge key={subtask} variant="outline">
            {subtask}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function ActionFeed({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Actions</CardTitle>
        <CardDescription>Tool execution status with approval gates and audit-friendly labels.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {snapshot.actions.slice(0, 6).map((action) => (
          <div key={action.id} className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-3">
            <StatusDot status={action.status} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{action.label}</div>
              <div className="text-xs text-muted-foreground">{action.tool}</div>
            </div>
            <Badge variant={action.status === "NEEDS_APPROVAL" ? "warning" : action.status === "COMPLETED" ? "success" : "outline"}>
              {action.status.replace("_", " ")}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function StatusDot({ status }: { status: ActionStatus }) {
  const color =
    status === "COMPLETED"
      ? "bg-success"
      : status === "NEEDS_APPROVAL"
        ? "bg-warning"
        : status === "FAILED"
          ? "bg-danger"
          : "bg-signal";
  return <span className={`size-2.5 rounded-full ${color}`} />;
}

function QuickActions() {
  const actions = [
    { label: "Call", icon: Phone },
    { label: "Email", icon: Mail },
    { label: "Meeting", icon: CalendarDays },
    { label: "Browser", icon: Globe },
    { label: "Files", icon: Search }
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-5 gap-2">
        {actions.map((action) => (
          <Button key={action.label} variant="outline" className="h-16 flex-col text-xs">
            <action.icon />
            {action.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

function DeviceStrip({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Device Status</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {snapshot.devices.map((device) => (
          <div key={device.id} className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">{device.name}</div>
              <div className="text-xs text-muted-foreground">Seen {formatRelativeTime(device.lastSeen)}</div>
            </div>
            <Badge variant={device.online ? "success" : "outline"}>
              {device.online ? "Online" : `${device.queuedCommands} queued`}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TasksPage({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {snapshot.tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}

function MemoryPage({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  const [memories, setMemories] = React.useState<WorkspaceSnapshot["memories"]>(snapshot.memories);
  const [activeTab, setActiveTab] = React.useState("all");
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [type, setType] = React.useState<WokaiMemory["type"]>("context");
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMemories(snapshot.memories);
  }, [snapshot.memories]);

  const filtered = activeTab === "all"
    ? memories
    : memories.filter((m) => {
        if (activeTab === "preferences") return m.type === "preference" || m.type === "context" || m.type === "skill";
        if (activeTab === "habits") return m.type === "habit" || m.type === "relationship";
        return m.type === activeTab;
      });

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const { getGoogleToken } = await import("@/lib/google/token");
      const token = getGoogleToken();
      if (!token) {
        toast.error("Please sign in to save memories");
        return;
      }
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ type, title: title.trim(), content: content.trim() })
      });
      if (res.ok) {
        const { memory } = await res.json();
        setMemories((prev) => [memory, ...prev]);
        setTitle("");
        setContent("");
        setShowAddForm(false);
        toast.success("Memory saved");
      } else {
        toast.error("Failed to save memory");
      }
    } catch {
      toast.error("Failed to save memory");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const { getGoogleToken } = await import("@/lib/google/token");
      const token = getGoogleToken();
      if (!token) return;
      await fetch(`/api/memory?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      setMemories((prev) => prev.filter((m) => m.id !== id));
      toast.success("Memory deleted");
    } catch {
      toast.error("Failed to delete memory");
    } finally {
      setDeleting(null);
    }
  };

  const typeLabels: Record<string, { label: string; color: string }> = {
    preference: { label: "Preference", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    habit: { label: "Habit", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    contact: { label: "Contact", color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
    deadline: { label: "Deadline", color: "bg-red-500/10 text-red-400 border-red-500/20" },
    context: { label: "Context", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    skill: { label: "Skill", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
    relationship: { label: "Relationship", color: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
  };

  const tabs = [
    { id: "all", label: "All" },
    { id: "preferences", label: "Preferences" },
    { id: "habits", label: "Habits" },
    { id: "contacts", label: "Contacts" },
    { id: "deadline", label: "Deadlines" },
    { id: "context", label: "Context" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Memory Engine</h2>
          <p className="text-sm text-muted-foreground">{memories.length} memories stored</p>
        </div>
        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)} className="gap-1.5">
          <Plus className="size-3.5" />
          Add Memory
        </Button>
      </div>

      {showAddForm && (
        <Card className="border-dashed">
          <CardContent className="pt-4 space-y-3">
            <div className="flex gap-3">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as WokaiMemory["type"])}
                className="text-xs rounded-md border border-border bg-background px-2 py-1.5"
              >
                <option value="preference">Preference</option>
                <option value="habit">Habit</option>
                <option value="contact">Contact</option>
                <option value="deadline">Deadline</option>
                <option value="context">Context</option>
                <option value="skill">Skill</option>
                <option value="relationship">Relationship</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="Memory title (e.g. &quot;Prefers morning meetings&quot;)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 placeholder:text-muted-foreground/50"
              maxLength={80}
            />
            <textarea
              placeholder="Detailed memory content..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 placeholder:text-muted-foreground/50 min-h-[80px]"
              maxLength={500}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !title.trim() || !content.trim()}>
                {saving ? "Saving..." : "Save Memory"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className="text-xs"
          >
            {tab.label}
            {tab.id !== "all" && (
              <span className="ml-1.5 text-muted-foreground">
                {memories.filter((m) => {
                  if (tab.id === "preferences") return m.type === "preference" || m.type === "context" || m.type === "skill";
                  if (tab.id === "habits") return m.type === "habit" || m.type === "relationship";
                  return m.type === tab.id;
                }).length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <Brain className="size-8 mx-auto mb-3 opacity-30" />
          No memories yet. WokAI automatically saves useful information from your conversations.
          <br />You can also add memories manually.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((memory) => {
            const meta = typeLabels[memory.type] || typeLabels.context;
            return (
              <Card key={memory.id} className="group relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-medium leading-tight">{memory.title}</CardTitle>
                    <button
                      onClick={() => handleDelete(memory.id)}
                      disabled={deleting === memory.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400 shrink-0"
                    >
                      {deleting === memory.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash className="size-3.5" />
                      )}
                    </button>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${meta.color}`}>
                    {meta.label}
                  </span>
                </CardHeader>
                <CardContent>
                  <p className="text-xs leading-5 text-muted-foreground">{memory.content}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <Progress value={memory.confidence * 100} className="h-1" />
                    <span className="text-[10px] text-muted-foreground ml-2">
                      {memory.updatedAt ? new Date(memory.updatedAt).toLocaleDateString() : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InboxPage({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  const [emails, setEmails] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [tokenExists, setTokenExists] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const token = getGoogleToken();
    if (!token) {
      setTokenExists(false);
      return;
    }
    setTokenExists(true);
    setLoading(true);
    setError(null);
    fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8", {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(r => {
        if (!r.ok) throw new Error("Failed to fetch Gmail list (status: " + r.status + ")");
        return r.json();
      })
      .then(async (data) => {
        const msgs = data.messages || [];
        const details = await Promise.all(
          msgs.map(async (m: any) => {
            try {
              const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`, {
                headers: { "Authorization": `Bearer ${token}` }
              });
              if (res.ok) return res.json();
            } catch (e) {
              console.error(e);
            }
            return null;
          })
        );
        const validDetails = details.filter(Boolean);
        setEmails(validDetails.map((d: any) => {
          const headers = d.payload?.headers || [];
          const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "(No Subject)";
          const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "(Unknown Sender)";
          return {
            id: d.id,
            from,
            subject,
            summary: d.snippet || "",
            urgency: /urgent|important/i.test(d.snippet + subject) ? "HIGH" : "LOW",
            receivedAt: d.internalDate ? new Date(parseInt(d.internalDate)).toISOString() : new Date().toISOString()
          };
        }));
      })
      .catch(e => {
        console.error("Error fetching live emails:", e);
        setError(e.message || "Failed to fetch emails");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Urgent Emails</CardTitle>
          <CardDescription>
            {tokenExists ? "Real-time Gmail inbox messages." : "Google Account required."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-emerald-500" />
            </div>
          ) : error ? (
            <div className="p-4 text-center text-sm text-red-400">
              Error: {error}. Please verify or refresh your Google Access Token in Settings.
            </div>
          ) : !tokenExists ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Please sign in with Google to view and sync your actual emails.
            </div>
          ) : emails.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No emails found in your Gmail inbox.
            </div>
          ) : (
            emails.map((email) => (
              <div key={email.id} className="rounded-lg border border-border bg-background/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-sm truncate max-w-[200px]">{email.subject}</div>
                  <RiskBadge level={email.urgency} />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-2">{email.summary}</p>
                <div className="mt-3 text-[10px] text-muted-foreground/80">
                  From: {email.from} · {formatRelativeTime(email.receivedAt)}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Suggested Draft Reply</CardTitle>
          <CardDescription>Generated for your most urgent thread.</CardDescription>
        </CardHeader>
        <CardContent className="rounded-lg border border-border bg-background/50 p-4 text-sm leading-6 text-muted-foreground">
          {emails.length > 0 ? (
            `Regarding: "${emails[0].subject}"\n\nHi,\n\nI am reviewing your message and will provide the requested details shortly.\n\nBest regards,\nDeepak`
          ) : (
            "No active threads. When you receive a message, WokAI will automatically prepare proposed drafts here."
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CalendarPage({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  const [events, setEvents] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [tokenExists, setTokenExists] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const token = getGoogleToken();
    if (!token) {
      setTokenExists(false);
      return;
    }
    setTokenExists(true);
    setLoading(true);
    setError(null);
    fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10&timeMin=${new Date().toISOString()}&singleEvents=true&orderBy=startTime`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(r => {
        if (!r.ok) throw new Error("Failed to fetch Calendar events (status: " + r.status + ")");
        return r.json();
      })
      .then(data => {
        const items = data.items || [];
        setEvents(items.map((evt: any) => ({
          id: evt.id,
          title: evt.summary || "(No Title)",
          start: evt.start?.dateTime || evt.start?.date || new Date().toISOString(),
          end: evt.end?.dateTime || evt.end?.date || new Date().toISOString(),
          risk: /deadline|critical|due|exam/i.test(evt.summary + (evt.description || "")) ? "HIGH" : "LOW"
        })));
      })
      .catch(e => {
        console.error("Error fetching live calendar:", e);
        setError(e.message || "Failed to fetch calendar events");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {loading ? (
        <div className="col-span-2 flex h-32 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-emerald-500" />
        </div>
      ) : error ? (
        <Card className="col-span-2 border-red-500/20 bg-red-500/5">
          <CardContent className="p-8 text-center text-sm text-red-400">
            Error: {error}. Please verify or refresh your Google Access Token in Settings.
          </CardContent>
        </Card>
      ) : !tokenExists ? (
        <Card className="col-span-2">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Please sign in with Google to view your actual calendar events.
          </CardContent>
        </Card>
      ) : events.length === 0 ? (
        <Card className="col-span-2">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No upcoming events found on your primary Google Calendar.
          </CardContent>
        </Card>
      ) : (
        events.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{event.title}</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {new Date(event.start).toLocaleString()} - {new Date(event.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </CardDescription>
                </div>
                {event.risk ? <RiskBadge level={event.risk} /> : null}
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">Conflict check ready</Badge>
              <Badge variant="outline">Travel buffer optional</Badge>
              <Badge variant="outline">Prep plan available</Badge>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function GoogleFilesGrid({
  mimeFilter,
  pageTitle,
  emptyMessage,
  icon: Icon,
  iconColorClass,
  buttonLabel
}: {
  mimeFilter?: string;
  pageTitle: string;
  emptyMessage: string;
  icon: typeof FileText;
  iconColorClass: string;
  buttonLabel: string;
}) {
  const [files, setFiles] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [tokenExists, setTokenExists] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const token = getGoogleToken();
    if (!token) {
      setTokenExists(false);
      return;
    }
    setTokenExists(true);
    setLoading(true);
    setError(null);

    const query = mimeFilter
      ? `mimeType='${mimeFilter}' and trashed=false`
      : "trashed=false";
    const fields = mimeFilter
      ? "files(id,name,webViewLink)"
      : "files(id,name,mimeType,webViewLink)";

    fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=12&fields=${fields}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch ${pageTitle} (status: ${r.status})`);
        return r.json();
      })
      .then((data) => setFiles(data.files || []))
      .catch((e) => {
        console.error(`Error fetching ${pageTitle}:`, e);
        setError(e.message || `Failed to fetch ${pageTitle}`);
      })
      .finally(() => setLoading(false));
  }, [mimeFilter, pageTitle]);

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return Icon;
    if (mimeType.includes("document")) return FileText;
    if (mimeType.includes("spreadsheet")) return Sheet;
    if (mimeType.includes("presentation")) return Presentation;
    return FileText;
  };

  const getFileTypeName = (mimeType?: string) => {
    if (!mimeType) return pageTitle;
    if (mimeType.includes("document")) return "Docs";
    if (mimeType.includes("spreadsheet")) return "Sheets";
    if (mimeType.includes("presentation")) return "Slides";
    if (mimeType.includes("pdf")) return "PDF";
    return "File";
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {loading ? (
        <div className="col-span-full flex h-32 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-emerald-500" />
        </div>
      ) : error ? (
        <Card className="col-span-full border-red-500/20 bg-red-500/5">
          <CardContent className="p-8 text-center text-sm text-red-400">
            Error: {error}. Please verify or refresh your Google Access Token in Settings.
          </CardContent>
        </Card>
      ) : !tokenExists ? (
        <Card className="col-span-full">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Please sign in with Google to view your {pageTitle}.
          </CardContent>
        </Card>
      ) : files.length === 0 ? (
        <Card className="col-span-full">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </CardContent>
        </Card>
      ) : (
        files.map((file) => {
          const FileIcon = mimeFilter ? Icon : getFileIcon(file.mimeType);
          return (
            <Card key={file.id}>
              <CardHeader className="pb-3">
                <div className={`flex size-11 items-center justify-center rounded-lg ${iconColorClass}`}>
                  <FileIcon className="size-5" />
                </div>
                <CardTitle className="text-sm truncate mt-2 max-w-[200px]" title={file.name}>
                  {file.name}
                </CardTitle>
                {!mimeFilter && (
                  <CardDescription className="text-xs">{getFileTypeName(file.mimeType)}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => {
                    if (file.webViewLink) window.open(file.webViewLink, "_blank");
                  }}
                >
                  <Search className="mr-2 size-3" />
                  {buttonLabel}
                </Button>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

function DrivePage() {
  return (
    <GoogleFilesGrid
      pageTitle="Drive Files"
      emptyMessage="No files found in your Google Drive."
      icon={FileText}
      iconColorClass="bg-emerald-500/10 text-emerald-400"
      buttonLabel="View File"
    />
  );
}

function GoogleTokenManager() {
  const [token, setToken] = React.useState("");
  const [expiryMs, setExpiryMs] = React.useState(0);
  const [authUrl, setAuthUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    setToken(getGoogleToken() || "");
    setExpiryMs(tokenExpiresIn());
    const interval = setInterval(() => setExpiryMs(tokenExpiresIn()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Google OAuth url
  React.useEffect(() => {
    fetch("/api/google/auth-url")
      .then((r) => r.json())
      .then((data) => {
        if (data.configured && data.url) {
          setAuthUrl(data.url);
        }
      })
      .catch((err) => console.error("Error loading auth URL:", err));
  }, []);

  // Pick up token from OAuth callback redirect
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("access_token");
    const expiresIn = params.get("expires_in");
    if (accessToken) {
      saveGoogleToken(accessToken, expiresIn ? Number(expiresIn) : 3600);
      setToken(accessToken);
      setExpiryMs(tokenExpiresIn());
      toast.success("Google Access Token saved from OAuth callback!");
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleSave = () => {
    if (token.trim()) {
      saveGoogleToken(token.trim());
      setExpiryMs(tokenExpiresIn());
      toast.success("Google Access Token saved successfully!");
      setTimeout(() => window.location.reload(), 800);
    } else {
      clearGoogleToken();
      setExpiryMs(0);
      toast.error("Google Access Token removed.");
      setTimeout(() => window.location.reload(), 800);
    }
  };

  const expiryMinutes = Math.round(expiryMs / 60000);

  return (
    <Card className="border-emerald-500/20 bg-emerald-500/5 mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-400">
          <ShieldCheck className="size-4" />
          Google API Authorization Token
        </CardTitle>
        <CardDescription className="text-xs">
          {expiryMs > 0
            ? `Token active — expires in ~${expiryMinutes} min.`
            : "Input a Google OAuth Access Token or authorize via Google Cloud Console to enable live API access."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ya29.a0Acv..."
          className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="flex gap-2 shrink-0">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4" onClick={handleSave}>
            Save Token
          </Button>
          {authUrl && (
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs gap-1.5"
              onClick={() => {
                window.location.href = authUrl;
              }}
            >
              <Globe className="size-3.5" />
              Authorize via Cloud Console
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DocsPage() {
  return (
    <GoogleFilesGrid
      mimeFilter="application/vnd.google-apps.document"
      pageTitle="Google Docs"
      emptyMessage="No Google Docs found in your drive."
      icon={FileText}
      iconColorClass="bg-blue-500/10 text-blue-400"
      buttonLabel="Open Doc"
    />
  );
}

function SheetsPage() {
  return (
    <GoogleFilesGrid
      mimeFilter="application/vnd.google-apps.spreadsheet"
      pageTitle="Google Sheets"
      emptyMessage="No Google Sheets found in your drive."
      icon={Sheet}
      iconColorClass="bg-emerald-500/10 text-emerald-400"
      buttonLabel="Open Sheet"
    />
  );
}

function SlidesPage() {
  return (
    <GoogleFilesGrid
      mimeFilter="application/vnd.google-apps.presentation"
      pageTitle="Google Slides"
      emptyMessage="No Google Slides presentations found in your drive."
      icon={Presentation}
      iconColorClass="bg-orange-500/10 text-orange-400"
      buttonLabel="Open Presentation"
    />
  );
}

function ContactsPage() {
  const [contacts, setContacts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [tokenExists, setTokenExists] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const token = getGoogleToken();
    if (!token) {
      setTokenExists(false);
      return;
    }
    setTokenExists(true);
    setLoading(true);
    setError(null);
    fetch("https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers&pageSize=50", {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(r => {
        if (!r.ok) throw new Error("Failed to fetch Google Contacts (status: " + r.status + ")");
        return r.json();
      })
      .then(data => {
        const list = data.connections || [];
        setContacts(list.map((c: any) => {
          const name = c.names?.[0]?.displayName || "Unnamed Contact";
          const email = c.emailAddresses?.[0]?.value || "No Email";
          const phone = c.phoneNumbers?.[0]?.value || "No Phone";
          return { id: c.resourceName, name, email, phone };
        }));
      })
      .catch(e => {
        console.error("Error fetching live contacts:", e);
        setError(e.message || "Failed to fetch Google Contacts");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {loading ? (
        <div className="col-span-full flex h-32 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-emerald-500" />
        </div>
      ) : error ? (
        <Card className="col-span-full border-red-500/20 bg-red-500/5">
          <CardContent className="p-8 text-center text-sm text-red-400">
            Error: {error}. Please verify or refresh your Google Access Token in Settings.
          </CardContent>
        </Card>
      ) : !tokenExists ? (
        <Card className="col-span-full">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Please sign in with Google or save a token to view your Google Contacts connections.
          </CardContent>
        </Card>
      ) : contacts.length === 0 ? (
        <Card className="col-span-full">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No contacts found in your Google connection list.
          </CardContent>
        </Card>
      ) : (
        contacts.map((contact) => (
          <Card key={contact.id}>
            <CardHeader className="pb-2">
              <div className="flex size-10 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 text-sm font-semibold">
                {contact.name.slice(0, 2).toUpperCase()}
              </div>
              <CardTitle className="text-sm mt-2">{contact.name}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1.5 text-muted-foreground">
              <div><span className="font-semibold text-foreground/80">Email:</span> {contact.email}</div>
              <div><span className="font-semibold text-foreground/80">Phone:</span> {contact.phone}</div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function WorkspaceHub({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  const [selectedApp, setSelectedApp] = React.useState<string | null>(null);

  if (selectedApp === "Gmail") {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="outline" size="sm" onClick={() => setSelectedApp(null)} className="w-fit border-border/50 text-xs">
          ← Back to Workspace
        </Button>
        <InboxPage snapshot={snapshot} />
      </div>
    );
  }
  if (selectedApp === "Calendar") {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="outline" size="sm" onClick={() => setSelectedApp(null)} className="w-fit border-border/50 text-xs">
          ← Back to Workspace
        </Button>
        <CalendarPage snapshot={snapshot} />
      </div>
    );
  }
  if (selectedApp === "Drive") {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="outline" size="sm" onClick={() => setSelectedApp(null)} className="w-fit border-border/50 text-xs">
          ← Back to Workspace
        </Button>
        <DrivePage />
      </div>
    );
  }
  if (selectedApp === "Docs") {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="outline" size="sm" onClick={() => setSelectedApp(null)} className="w-fit border-border/50 text-xs">
          ← Back to Workspace
        </Button>
        <DocsPage />
      </div>
    );
  }
  if (selectedApp === "Sheets") {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="outline" size="sm" onClick={() => setSelectedApp(null)} className="w-fit border-border/50 text-xs">
          ← Back to Workspace
        </Button>
        <SheetsPage />
      </div>
    );
  }
  if (selectedApp === "Slides") {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="outline" size="sm" onClick={() => setSelectedApp(null)} className="w-fit border-border/50 text-xs">
          ← Back to Workspace
        </Button>
        <SlidesPage />
      </div>
    );
  }
  if (selectedApp === "Contacts") {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="outline" size="sm" onClick={() => setSelectedApp(null)} className="w-fit border-border/50 text-xs">
          ← Back to Workspace
        </Button>
        <ContactsPage />
      </div>
    );
  }

  const apps = [
    { title: "Gmail", icon: Mail, state: "Summaries + drafts", color: "bg-blue-500/10 text-blue-400" },
    { title: "Calendar", icon: CalendarDays, state: "Slots + events", color: "bg-violet-500/10 text-violet-400" },
    { title: "Drive", icon: HardDrive, state: "Search + relevance", color: "bg-orange-500/10 text-orange-400" },
    { title: "Docs", icon: FileText, state: "Draft reports", color: "bg-blue-400/10 text-blue-300" },
    { title: "Sheets", icon: Sheet, state: "Trackers", color: "bg-emerald-500/10 text-emerald-400" },
    { title: "Slides", icon: Presentation, state: "Pitch decks", color: "bg-orange-400/10 text-orange-300" },
    { title: "Contacts", icon: Users, state: "People API", color: "bg-indigo-500/10 text-indigo-400" },
    { title: "Calls", icon: Phone, state: "Dialer + Twilio", color: "bg-green-500/10 text-green-400" },
    { title: "Browser", icon: Globe, state: "Playwright adapter", color: "bg-yellow-500/10 text-yellow-400" },
    { title: "Devices", icon: MonitorSmartphone, state: "Command queue", color: "bg-cyan-500/10 text-cyan-400" },
    { title: "Maps", icon: Map, state: "Travel buffers", color: "bg-rose-500/10 text-rose-400" },
    { title: "Notifications", icon: Bell, state: "Escalation", color: "bg-pink-500/10 text-pink-400" }
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Workspace Directory</h2>
          <p className="text-sm text-muted-foreground">Select a Google integration to view real-time synchronized data.</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {apps.map((app) => (
          <Card
            key={app.title}
            className="cursor-pointer hover:bg-accent/40 hover:scale-[1.02] active:scale-[0.99] transition duration-200"
            onClick={() => {
              if (["Gmail", "Calendar", "Drive", "Docs", "Sheets", "Slides", "Contacts"].includes(app.title)) {
                setSelectedApp(app.title);
              } else {
                toast.info(`${app.title} integration is fully operational via chat commands.`);
              }
            }}
          >
            <CardContent className="flex items-center gap-3 p-5">
              <div className={`flex size-11 items-center justify-center rounded-lg ${app.color}`}>
                <app.icon className="size-5" />
              </div>
              <div>
                <div className="font-medium text-foreground">{app.title}</div>
                <div className="text-xs text-muted-foreground">{app.state}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DevicesPage({ snapshot: initialSnapshot }: { snapshot: WorkspaceSnapshot }) {
  const [devices, setDevices] = React.useState<WokaiDevice[]>(initialSnapshot.devices);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    async function loadDevices() {
      try {
        const res = await fetch("/api/devices");
        if (res.ok) {
          const data = await res.json();
          if (data.devices) {
            setDevices(data.devices);
          }
        }
      } catch (err) {
        console.error("Failed to fetch devices", err);
      }
    }
    loadDevices();
  }, []);

  async function handleQueueCommand(deviceId: string) {
    const cmd = prompt("Enter command to queue (e.g., 'Open VS Code', 'run system-check'):");
    if (!cmd) return;

    setLoading(true);
    try {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deviceId, command: cmd })
      });
      if (res.ok) {
        toast.success(`Queued command: "${cmd}"`);
        // Re-load list
        const refresh = await fetch("/api/devices");
        const data = await refresh.json();
        if (data.devices) {
          setDevices(data.devices);
        }
      }
    } catch (err) {
      toast.error("Failed to queue command");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterNew() {
    const name = prompt("Enter device name (e.g., 'Deepak\\'s Phone', 'Living Room TV'):");
    if (!name) return;
    const kind = prompt("Enter device kind (phone, laptop, tablet, desktop):") as any;
    if (!["phone", "laptop", "tablet", "desktop"].includes(kind)) {
      alert("Invalid kind. Must be phone, laptop, tablet, or desktop.");
      return;
    }

    const deviceId = `dev-${Math.random().toString(36).slice(2, 7)}`;
    setLoading(true);
    try {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: deviceId, name, kind, online: true })
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Successfully registered ${name}! ID: ${deviceId}`);
        if (data.devices) {
          setDevices(data.devices);
        }
      }
    } catch (err) {
      toast.error("Failed to register device");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Registered Devices</h2>
          <p className="text-sm text-muted-foreground">Manage connected agents and push commands.</p>
        </div>
        <Button onClick={handleRegisterNew} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white border-0">
          <Plus className="mr-2 h-4 w-4" />
          Install WokAgent
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {devices.map((device) => (
          <Card key={device.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{device.name}</span>
                <span className="text-[10px] font-mono text-muted-foreground">ID: {device.id}</span>
              </CardTitle>
              <CardDescription className="capitalize text-xs">{device.kind}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Badge className="w-fit" variant={device.online ? "success" : "warning"}>
                {device.online ? "Online" : "Offline"}
              </Badge>
              <div className="text-xs text-muted-foreground">
                Last seen {formatRelativeTime(device.lastSeen)}
              </div>
              <Separator />
              <div className="text-xs font-medium text-foreground">
                {device.queuedCommands} commands in queue
              </div>
              <Button onClick={() => handleQueueCommand(device.id)} disabled={loading} variant="outline" className="w-full text-xs">
                Queue command
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function LifeSaverPage({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  const tasks = snapshot.tasks
    .filter((task) => task.priority === "HIGH" || task.priority === "CRITICAL")
    .sort((a, b) => {
      const timeA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const timeB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return timeA - timeB;
    });
  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <Card className="border-danger/40 bg-danger/10">
        <CardHeader>
          <CardTitle>Rescue Status</CardTitle>
          <CardDescription>WokAI looks for the fastest responsible path to completion.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="text-5xl font-semibold">{highestRisk(snapshot.tasks)}</div>
          <p className="text-sm leading-6 text-muted-foreground">
            Focus only on the highest-leverage work. Defer nonessential steps, block time, and pause distractions.
          </p>
          <Button>
            <LifeBuoy data-icon="inline-start" />
            Generate rescue plan
          </Button>
        </CardContent>
      </Card>
      <div className="grid gap-4">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

function BrowserAgentPage({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {snapshot.browserJobs.map((job) => (
        <BrowserJobCard key={job.id} job={job} />
      ))}
      <Card>
        <CardHeader>
          <CardTitle>Local Agent Adapter</CardTitle>
          <CardDescription>Use `BROWSER_AGENT_MODE=local` and `LOCAL_BROWSER_AGENT_URL` for a Playwright worker.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>Vercel serverless cannot safely run full browser sessions long term, so WokAI keeps a job model and can hand off to a local worker.</p>
          <Badge variant="warning">Pause before submit/pay/send/upload</Badge>
        </CardContent>
      </Card>
    </div>
  );
}

function BrowserJobCard({ job }: { job: BrowserJob }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{job.goal}</CardTitle>
            <CardDescription>{job.currentStep}</CardDescription>
          </div>
          <Badge variant={job.approvalRequired ? "warning" : "signal"}>{job.status.replace("_", " ")}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {job.steps.map((step) => (
          <div key={step.label} className="flex items-center gap-3">
            <StatusDot status={step.status} />
            <span className="text-sm">{step.label}</span>
            <span className="ml-auto text-xs text-muted-foreground">{step.status.replace("_", " ")}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SettingsPage({
  firebaseConfigured
}: {
  firebaseConfigured: boolean;
}) {
  const settings = [
    ["Firebase Auth", "Configured"],
    ["LLM API / Gateway", "Server route uses LLM_API_KEY or OPENROUTER_API_KEY when present"],
    ["Google APIs", "OAuth scaffold ready for Gmail, Calendar, Drive, Docs, Sheets, Slides, People"],
    ["Twilio", "Optional outbound call adapter"],
    ["OMP", "Installed as dev dependency and documented in docs/omp-setup.md"]
  ];

  return (
    <div className="flex flex-col gap-5">
      <GoogleTokenManager />
      <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Integration Readiness</CardTitle>
            <CardDescription>Connect env vars, deploy to Vercel, and keep approval gates on.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {settings.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 p-3">
                <div className="font-medium">{label}</div>
                <div className="text-right text-sm text-muted-foreground">{value}</div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Safety Rules</CardTitle>
            <CardDescription>WokAI can help finish work without taking risky actions silently.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {["Send email", "Create calendar event", "Place call", "Submit form", "Payment or upload"].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm">
                <ShieldCheck className="text-success" />
                {item} requires approval
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
