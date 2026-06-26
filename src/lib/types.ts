export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ActionStatus =
  | "PLANNED"
  | "RUNNING"
  | "NEEDS_APPROVAL"
  | "QUEUED"
  | "COMPLETED"
  | "FAILED";

export type IntegrationStatus = "connected" | "demo" | "needs_config";

export type WokaiToolName =
  | "memory.recall"
  | "memory.retain"
  | "task.create"
  | "task.rescuePlan"
  | "gmail.summarize"
  | "gmail.send"
  | "gmail.search"
  | "calendar.findSlots"
  | "calendar.createEvent"
  | "calendar.listEvents"
  | "calendar.deleteEvent"
  | "drive.search"
  | "docs.create"
  | "sheets.createTracker"
  | "slides.createDeck"
  | "contacts.search"
  | "calls.prepare"
  | "browser.plan"
  | "devices.queueCommand"
  | "devices.openApp"
  | "devices.terminal"
  | "devices.fileAccess"
  | "notifications.create"
  | "maps.estimateTravel"
  | "maps.searchPlaces"
  | "maps.getDirections"
  | "search.google";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
}

export interface WokaiTask {
  id: string;
  title: string;
  description: string;
  deadline: string;
  priority: RiskLevel;
  status: "todo" | "in_progress" | "blocked" | "done";
  progress: number;
  subtasks: string[];
  source: "chat" | "email" | "calendar" | "manual" | "demo";
}

export interface WokaiMemory {
  id: string;
  type: "preference" | "habit" | "contact" | "deadline" | "context";
  title: string;
  content: string;
  confidence: number;
  updatedAt: string;
}

export interface WokaiAction {
  id: string;
  tool: WokaiToolName;
  label: string;
  status: ActionStatus;
  sensitive: boolean;
  createdAt: string;
  output?: string;
  content?: string;
}

export interface WokaiDevice {
  id: string;
  name: string;
  kind: "phone" | "laptop" | "tablet" | "desktop";
  online: boolean;
  lastSeen: string;
  queuedCommands: number;
}

export interface WokaiEmail {
  id: string;
  from: string;
  subject: string;
  summary: string;
  urgency: RiskLevel;
  receivedAt: string;
}

export interface WokaiCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  risk?: RiskLevel;
}

export interface BrowserJob {
  id: string;
  goal: string;
  currentStep: string;
  status: ActionStatus;
  steps: Array<{
    label: string;
    status: ActionStatus;
  }>;
  approvalRequired: boolean;
}

export interface WorkspaceSnapshot {
  tasks: WokaiTask[];
  memories: WokaiMemory[];
  actions: WokaiAction[];
  devices: WokaiDevice[];
  emails: WokaiEmail[];
  events: WokaiCalendarEvent[];
  browserJobs: BrowserJob[];
}

export interface AgentPlan {
  intent: string;
  riskLevel: RiskLevel;
  response: string;
  reasoning: string[];
  plan: string[];
  actions: WokaiAction[];
  suggestedTasks: WokaiTask[];
  memoryWrites: WokaiMemory[];
  needsApproval: boolean;
}
