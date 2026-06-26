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
      return <WorkspaceHub />;
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
  const [emails, setEmails] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [tokenExists, setTokenExists] = React.useState(false);

  React.useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("googleAccessToken") : null;
    if (!token) {
      setTokenExists(false);
      return;
    }
    setTokenExists(true);
    setLoading(true);
    fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8", {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(r => {
        if (!r.ok) throw new Error("Failed to fetch Gmail list");
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
      })
      .finally(() => setLoading(false));
  }, []);

  const displayedEmails = tokenExists ? emails : snapshot.emails;

  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Urgent Emails</CardTitle>
          <CardDescription>
            {tokenExists ? "Real-time Gmail inbox messages." : "Simulated Demo Emails (Sign in with Google to view live inbox)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-emerald-500" />
            </div>
          ) : displayedEmails.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No emails found in your Gmail inbox.
            </div>
          ) : (
            displayedEmails.map((email) => (
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
          {displayedEmails.length > 0 ? (
            `Regarding: "${displayedEmails[0].subject}"\n\nHi,\n\nI am reviewing your message and will provide the requested details shortly.\n\nBest regards,\nDeepak`
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

  React.useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("googleAccessToken") : null;
    if (!token) {
      setTokenExists(false);
      return;
    }
    setTokenExists(true);
    setLoading(true);
    fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10&timeMin=${new Date().toISOString()}&singleEvents=true&orderBy=startTime`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(r => {
        if (!r.ok) throw new Error("Failed to fetch Calendar events");
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
      })
      .finally(() => setLoading(false));
  }, []);

  const displayedEvents = tokenExists ? events : snapshot.events;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {loading ? (
        <div className="col-span-2 flex h-32 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-emerald-500" />
        </div>
      ) : displayedEvents.length === 0 ? (
        <Card className="col-span-2">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No upcoming events found.
          </CardContent>
        </Card>
      ) : (
        displayedEvents.map((event) => (
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

function DrivePage() {
  const [files, setFiles] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [tokenExists, setTokenExists] = React.useState(false);

  React.useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("googleAccessToken") : null;
    if (!token) {
      setTokenExists(false);
      return;
    }
    setTokenExists(true);
    setLoading(true);
    fetch("https://www.googleapis.com/drive/v3/files?pageSize=12&fields=files(id,name,mimeType,webViewLink)&q=trashed=false", {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(r => {
        if (!r.ok) throw new Error("Failed to fetch Drive files");
        return r.json();
      })
      .then(data => {
        setFiles(data.files || []);
      })
      .catch(e => {
        console.error("Error fetching live Drive files:", e);
      })
      .finally(() => setLoading(false));
  }, []);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("document")) return FileText;
    if (mimeType.includes("spreadsheet")) return Sheet;
    if (mimeType.includes("presentation")) return Presentation;
    return FileText;
  };

  const getFileTypeName = (mimeType: string) => {
    if (mimeType.includes("document")) return "Docs";
    if (mimeType.includes("spreadsheet")) return "Sheets";
    if (mimeType.includes("presentation")) return "Slides";
    if (mimeType.includes("pdf")) return "PDF";
    return "File";
  };

  const demoFiles = [
    { id: "file-chemistry", name: "Chemistry Assignment Notes", mimeType: "application/vnd.google-apps.document", webViewLink: "#" },
    { id: "file-tracker", name: "Q3 Project Planning Tracker", mimeType: "application/vnd.google-apps.spreadsheet", webViewLink: "#" },
    { id: "file-pitch", name: "Investor Pitch Deck - Final", mimeType: "application/vnd.google-apps.presentation", webViewLink: "#" },
    { id: "file-invoice", name: "Broadband Invoice - June", mimeType: "application/pdf", webViewLink: "#" }
  ];

  const displayedFiles = tokenExists ? files : demoFiles;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {loading ? (
        <div className="col-span-full flex h-32 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-emerald-500" />
        </div>
      ) : displayedFiles.length === 0 ? (
        <Card className="col-span-full">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No files found.
          </CardContent>
        </Card>
      ) : (
        displayedFiles.map((file) => {
          const Icon = getFileIcon(file.mimeType);
          return (
            <Card key={file.id}>
              <CardHeader className="pb-3">
                <div className="flex size-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Icon className="size-5" />
                </div>
                <CardTitle className="text-sm truncate mt-2 max-w-[200px]" title={file.name}>
                  {file.name}
                </CardTitle>
                <CardDescription className="text-xs">{getFileTypeName(file.mimeType)}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => {
                    if (file.webViewLink && file.webViewLink !== "#") window.open(file.webViewLink, "_blank");
                  }}
                >
                  <Search className="mr-2 size-3" />
                  View File
                </Button>
              </CardContent>
            </Card>
          );
        })
      )}
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
  firebaseConfigured
}: {
  firebaseConfigured: boolean;
}) {
  const settings = [
    ["Firebase Auth", "Configured"],
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
        </CardContent>
      </Card>
    </div>
  );
}
