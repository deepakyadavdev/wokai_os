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
  Users
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
import type { ActionStatus, BrowserJob, RiskLevel, WorkspaceSnapshot, WokaiTask, WokaiDevice } from "@/lib/types";
import { toast } from "sonner";
import { Plus } from "lucide-react";

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
  const meta = pageMeta[page];
  const risk = highestRisk(workspace.snapshot.tasks);

  return (
    <>
      <PageHeader
        title={meta.title}
        description={meta.description}
        icon={meta.icon}
        status={`${firebaseConfigured ? "Live-ready" : "Demo mode"} / ${riskCopy(risk)}`}
      />
      {renderPage(page, workspace.snapshot, workspace.mergeAgentResult, workspace.resetDemo, firebaseConfigured)}
    </>
  );
}

function renderPage(
  page: PageKind,
  snapshot: WorkspaceSnapshot,
  mergeAgentResult: ReturnType<typeof useWorkspaceData>["mergeAgentResult"],
  resetDemo: () => void,
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
      return <WorkspaceHub />;
    case "devices":
      return <DevicesPage snapshot={snapshot} />;
    case "lifesaver":
      return <LifeSaverPage snapshot={snapshot} />;
    case "browser-agent":
      return <BrowserAgentPage snapshot={snapshot} />;
    case "settings":
      return <SettingsPage resetDemo={resetDemo} firebaseConfigured={firebaseConfigured} />;
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
        <RiskBadge level={task.priority} />
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>Due {formatRelativeTime(task.deadline)}</span>
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
  return (
    <Tabs defaultValue="preferences">
      <TabsList className="w-fit">
        <TabsTrigger value="preferences">Preferences</TabsTrigger>
        <TabsTrigger value="habits">Habits</TabsTrigger>
        <TabsTrigger value="contacts">Contacts</TabsTrigger>
      </TabsList>
      {["preferences", "habits", "contacts"].map((tab) => (
        <TabsContent key={tab} value={tab}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {snapshot.memories
              .filter((memory) => {
                if (tab === "preferences") return memory.type === "preference" || memory.type === "context";
                if (tab === "habits") return memory.type === "habit";
                return memory.type === "contact";
              })
              .map((memory) => (
                <Card key={memory.id}>
                  <CardHeader>
                    <CardTitle>{memory.title}</CardTitle>
                    <CardDescription>{memory.type}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <p className="text-sm leading-6 text-muted-foreground">{memory.content}</p>
                    <Progress value={memory.confidence * 100} />
                    <div className="text-xs text-muted-foreground">Confidence {Math.round(memory.confidence * 100)}%</div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

function InboxPage({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Urgent Emails</CardTitle>
          <CardDescription>Gmail API scaffold reads metadata, summarizes, and waits before sending.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {snapshot.emails.map((email) => (
            <div key={email.id} className="rounded-lg border border-border bg-background/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{email.subject}</div>
                <RiskBadge level={email.urgency} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{email.summary}</p>
              <div className="mt-3 text-xs text-muted-foreground">
                From {email.from} - {formatRelativeTime(email.receivedAt)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Suggested Reply</CardTitle>
          <CardDescription>Approval-first draft; no email is sent automatically.</CardDescription>
        </CardHeader>
        <CardContent className="rounded-lg border border-border bg-background/50 p-4 text-sm leading-6 text-muted-foreground">
          Thanks for the reminder. I am finishing the review package and will share the final deck before the Friday
          standup. I will include the one-page summary and highlight the open decisions clearly.
        </CardContent>
      </Card>
    </div>
  );
}

function CalendarPage({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {snapshot.events.map((event) => (
        <Card key={event.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{event.title}</CardTitle>
                <CardDescription>
                  {new Date(event.start).toLocaleString()} - {new Date(event.end).toLocaleTimeString()}
                </CardDescription>
              </div>
              {event.risk ? <RiskBadge level={event.risk} /> : null}
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="outline">Conflict check ready</Badge>
            <Badge variant="outline">Travel buffer optional</Badge>
            <Badge variant="outline">Prep plan available</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DrivePage() {
  const files = [
    { title: "Chemistry Notes.pdf", type: "PDF", icon: FileText },
    { title: "Investor Pitch Outline", type: "Docs", icon: FileText },
    { title: "Deadline Tracker", type: "Sheets", icon: Sheet },
    { title: "Founder Update Deck", type: "Slides", icon: Presentation }
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {files.map((file) => (
        <Card key={file.title}>
          <CardHeader>
            <div className="flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <file.icon />
            </div>
            <CardTitle>{file.title}</CardTitle>
            <CardDescription>{file.type} integration scaffold</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <Search data-icon="inline-start" />
              Find related work
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function WorkspaceHub() {
  const apps = [
    { title: "Gmail", icon: Mail, state: "Summaries + drafts" },
    { title: "Calendar", icon: CalendarDays, state: "Slots + events" },
    { title: "Drive", icon: HardDrive, state: "Search + relevance" },
    { title: "Docs", icon: FileText, state: "Draft reports" },
    { title: "Sheets", icon: Sheet, state: "Trackers" },
    { title: "Slides", icon: Presentation, state: "Pitch decks" },
    { title: "Contacts", icon: Users, state: "People API" },
    { title: "Calls", icon: Phone, state: "Dialer + Twilio" },
    { title: "Browser", icon: Globe, state: "Playwright adapter" },
    { title: "Devices", icon: MonitorSmartphone, state: "Command queue" },
    { title: "Maps", icon: Map, state: "Travel buffers" },
    { title: "Notifications", icon: Bell, state: "Escalation" }
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {apps.map((app) => (
        <Card key={app.title}>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <app.icon />
            </div>
            <div>
              <div className="font-medium">{app.title}</div>
              <div className="text-sm text-muted-foreground">{app.state}</div>
            </div>
          </CardContent>
        </Card>
      ))}
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
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
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
  resetDemo,
  firebaseConfigured
}: {
  resetDemo: () => void;
  firebaseConfigured: boolean;
}) {
  const settings = [
    ["Firebase Auth", firebaseConfigured ? "Configured" : "Demo fallback"],
    ["Gemini API", "Server route uses GEMINI_API_KEY when present"],
    ["Google APIs", "OAuth scaffold ready for Gmail, Calendar, Drive, Docs, Sheets, Slides, People"],
    ["Twilio", "Optional outbound call adapter"],
    ["OMP", "Installed as dev dependency and documented in docs/omp-setup.md"]
  ];

  return (
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
          <Separator />
          <Button variant="outline" onClick={resetDemo}>
            Reset demo workspace
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
