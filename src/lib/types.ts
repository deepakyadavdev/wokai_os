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
  deadline: string | null;
  priority: RiskLevel | null;
  status: "todo" | "in_progress" | "blocked" | "done";
  progress: number;
  subtasks: string[];
  source: "chat" | "email" | "calendar" | "manual" | "demo";
  assignee?: string | null;
}

export interface WokaiMemory {
  id: string;
  type: "preference" | "habit" | "contact" | "deadline" | "context" | "skill" | "relationship";
  title: string;
  content: string;
  confidence: number;
  createdAt?: string;
  updatedAt?: string;
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
  title?: string;
  summary?: string;
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

  // Prompt Architecture Redesign Metadata Fields
  confidence_score: number; // float 0.0 - 1.0
  clarification_required: boolean;
  missing_information: string[];
  unsupported_operation: boolean;
  risk_level: RiskLevel | null;
  dependency_list: string[];
  preconditions: string[];
  postconditions: string[];
  validation_status: "PASS" | "FAIL" | "PENDING";
  failure_reason: string | null;
  voiceData?: {
    originalTranscript: string;
    repairedMessage: string;
    detectedLanguage: string;
  };

  // 8-Agent Workflow Execution Summary
  eightAgentOutput?: {
    yougye: YougyeResult;
    tivere?: TivereResult;
    vichar?: VicharPlan;
    subtasksCompleted?: Array<{
      subtask: VicharSubtask;
      drishthi: DrishthiStatement;
      sahayata: SahayataPayload;
      kriya: KriyaResult;
      mulye: MulyeReport;
    }>;
    samparn?: SamparnSummary;
  };
}

export type EightAgentName =
  | "YOUGYE"
  | "TIVERE"
  | "VICHAR"
  | "DRISTHI"
  | "KRIYA"
  | "SAHAYATA"
  | "MULYE"
  | "SAMPARN";

export interface YougyeMemoryState {
  originalPrompt: string;
  questionsAsked: string[];
  answersReceived: Record<string, string>;
  refinedPrompt?: string;
}

export interface YougyeResult {
  isSufficient: boolean;
  refinedPrompt?: string;
  questions?: string[];
  missingInformation?: string[];
  memoryState?: YougyeMemoryState;
  reasoning: string;
}

export interface TivereResult {
  ackMessage: string;
  dispatchedAt: string;
}

export interface VicharSubtask {
  id: string;
  rank: number;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
}

export interface VicharPlan {
  originalPrompt: string;
  subtasks: VicharSubtask[];
  totalTasks: number;
  completedTasks: number;
}

export interface DrishthiStatement {
  subtaskId: string;
  subtaskTitle: string;
  selectedTools: WokaiToolName[];
  enrichedStatement: string;
  toolParameters: Record<string, any>;
}

export interface SahayataPayload {
  subtaskId: string;
  content: string;
  drafts?: Record<string, string>;
}

export interface KriyaResult {
  subtaskId: string;
  executedApi: string;
  status: "SUCCESS" | "FAILED" | "PENDING_APPROVAL";
  apiResponse: any;
  actionCreated?: WokaiAction;
}

export interface MulyeReport {
  subtaskId: string;
  success: boolean;
  reportSummary: string;
  userUpdateMessage: string;
}

export interface SamparnSummary {
  finalTitle: string;
  comprehensiveSummary: string;
  completedSubtaskSummaries: string[];
  finalOutputPresentation: string;
  recommendedNextSteps?: string[];
}
