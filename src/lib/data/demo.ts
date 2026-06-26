import type {
  BrowserJob,
  WokaiAction,
  WokaiCalendarEvent,
  WokaiDevice,
  WokaiEmail,
  WokaiMemory,
  WokaiTask,
  WorkspaceSnapshot
} from "@/lib/types";

const now = Date.now();

export const demoTasks: WokaiTask[] = [
  {
    id: "task-investor",
    title: "Investor pitch deck",
    description: "Prepare 10-slide founder update for Friday.",
    deadline: new Date(now + 3 * 864e5).toISOString(),
    priority: "MEDIUM",
    status: "todo",
    progress: 18,
    subtasks: ["Storyline", "Market slide", "Traction slide", "Ask slide"],
    source: "demo"
  },
  {
    id: "task-bill",
    title: "Pay broadband bill",
    description: "Due tonight. Needs payment confirmation.",
    deadline: new Date(now + 6 * 36e5).toISOString(),
    priority: "CRITICAL",
    status: "todo",
    progress: 0,
    subtasks: ["Open bill", "Verify amount", "Pay after approval"],
    source: "email"
  }
];

export const demoMemories: WokaiMemory[] = [
  {
    id: "mem-night",
    type: "habit",
    title: "Studies better at night",
    content: "Prefer deep study blocks after 8 PM with 10-minute breaks every hour.",
    confidence: 0.92,
    updatedAt: new Date(now - 2 * 864e5).toISOString()
  },
  {
    id: "mem-style",
    type: "preference",
    title: "Communication style",
    content: "Prefers concise, friendly email drafts with clear next steps.",
    confidence: 0.88,
    updatedAt: new Date(now - 5 * 36e5).toISOString()
  }
];

export const demoActions: WokaiAction[] = [
  {
    id: "act-calendar",
    tool: "calendar.findSlots",
    label: "Checked calendar for focus blocks",
    status: "COMPLETED",
    sensitive: false,
    createdAt: new Date(now - 20 * 60e3).toISOString(),
    output: "Two blocks found tonight: 8:00 PM and 10:15 PM."
  },
  {
    id: "act-email",
    tool: "gmail.summarize",
    label: "Summarized urgent inbox",
    status: "NEEDS_APPROVAL",
    sensitive: true,
    createdAt: new Date(now - 14 * 60e3).toISOString(),
    output: "3 urgent threads detected. Draft replies are ready."
  },
  {
    id: "act-browser",
    tool: "browser.plan",
    label: "Prepared internship browser workflow",
    status: "QUEUED",
    sensitive: true,
    createdAt: new Date(now - 6 * 60e3).toISOString(),
    output: "Paused before final submit."
  }
];

export const demoDevices: WokaiDevice[] = [
  {
    id: "dev-phone",
    name: "Deepak's Phone",
    kind: "phone",
    online: true,
    lastSeen: new Date(now - 2 * 60e3).toISOString(),
    queuedCommands: 0
  },
  {
    id: "dev-laptop",
    name: "WokAI Laptop",
    kind: "laptop",
    online: true,
    lastSeen: new Date(now - 20 * 1000).toISOString(),
    queuedCommands: 1
  },
  {
    id: "dev-tablet",
    name: "Study Tablet",
    kind: "tablet",
    online: false,
    lastSeen: new Date(now - 7 * 36e5).toISOString(),
    queuedCommands: 3
  }
];

export const demoEmails: WokaiEmail[] = [
  {
    id: "mail-review",
    from: "Project Review",
    subject: "Review deck due Friday",
    summary: "Needs final deck and one-page summary before Friday standup.",
    urgency: "HIGH",
    receivedAt: new Date(now - 90 * 60e3).toISOString()
  },
  {
    id: "mail-bill",
    from: "Broadband Billing",
    subject: "Payment due today",
    summary: "Bill payment is due tonight. WokAI can open payment link after approval.",
    urgency: "CRITICAL",
    receivedAt: new Date(now - 5 * 36e5).toISOString()
  }
];

export const demoEvents: WokaiCalendarEvent[] = [
  {
    id: "evt-standup",
    title: "Team standup",
    start: new Date(now + 2 * 36e5).toISOString(),
    end: new Date(now + 2.5 * 36e5).toISOString(),
    risk: "LOW"
  }
];

export const demoBrowserJobs: BrowserJob[] = [
  {
    id: "browser-internship",
    goal: "Apply for internship",
    currentStep: "Reviewing form fields before upload",
    status: "NEEDS_APPROVAL",
    approvalRequired: true,
    steps: [
      { label: "Open career page", status: "COMPLETED" },
      { label: "Fill profile fields", status: "COMPLETED" },
      { label: "Upload resume", status: "RUNNING" },
      { label: "Pause before final submit", status: "NEEDS_APPROVAL" }
    ]
  }
];

export const demoSnapshot: WorkspaceSnapshot = {
  tasks: demoTasks,
  memories: demoMemories,
  actions: demoActions,
  devices: demoDevices,
  emails: demoEmails,
  events: demoEvents,
  browserJobs: demoBrowserJobs
};
