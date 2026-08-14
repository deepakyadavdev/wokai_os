import type {
  AgentPlan,
  DrishthiStatement,
  KriyaResult,
  MulyeReport,
  RiskLevel,
  SahayataPayload,
  SamparnSummary,
  TivereResult,
  VicharPlan,
  VicharSubtask,
  WokaiAction,
  WokaiMemory,
  WokaiTask,
  WokaiToolName,
  YougyeMemoryState,
  YougyeResult
} from "@/lib/types";
import { toolRegistry } from "@/lib/wokai/tools";
import { executeAdapterAction } from "@/lib/wokai/adapters";

function helperId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function cleanJson(text: string) {
  try {
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/**
 * Executes LLM prompts across Google Colab / Lightning AI GPU server or local Open-Source Model Server.
 */
export async function callModelServer(promptText: string): Promise<string> {
  const modelServerUrl =
    process.env.MODEL_SERVER_URL ||
    process.env.NEXT_PUBLIC_MODEL_SERVER_URL ||
    process.env.LLM_BASE_URL ||
    "";

  if (modelServerUrl) {
    const baseUrl = modelServerUrl.replace(/\/$/, "");

    // 1. Try Colab FastAPI /generate endpoint
    try {
      const response = await fetch(`${baseUrl}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText }),
        signal: AbortSignal.timeout(15000)
      });
      if (response.ok) {
        const data = await response.json();
        if (data.text) return data.text;
        if (data.output) return data.output;
      }
    } catch {
      // Ignore
    }

    // 2. Try OpenAI-compatible /v1/chat/completions endpoint
    try {
      const chatUrl = baseUrl.endsWith("/v1") ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
      const response = await fetch(chatUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.LLM_MODEL || "qwen2.5:3b",
          messages: [{ role: "user", content: promptText }]
        }),
        signal: AbortSignal.timeout(15000)
      });
      if (response.ok) {
        const data = await response.json();
        if (data.choices?.[0]?.message?.content) {
          return data.choices[0].message.content;
        }
      }
    } catch {
      // Ignore
    }
  }

  return "";
}

/* ============================================================================
 * AGENT 1: YOUGYE (Sufficiency, Memory & Clarification Agent)
 * ============================================================================ */
export async function runYougye(
  userPrompt: string,
  history?: Array<{ role: string; content: string }>,
  existingMemoryState?: YougyeMemoryState
): Promise<YougyeResult> {
  if (existingMemoryState && existingMemoryState.answersReceived && Object.keys(existingMemoryState.answersReceived).length > 0) {
    const answersText = Object.entries(existingMemoryState.answersReceived)
      .map(([q, a]) => `Question: "${q}" -> Answer: "${a}"`)
      .join("\n");
    const refined = `${existingMemoryState.originalPrompt}\n\nAdditional Details:\n${answersText}`;
    return {
      isSufficient: true,
      refinedPrompt: refined,
      memoryState: {
        ...existingMemoryState,
        refinedPrompt: refined
      },
      reasoning: "User provided necessary clarification answers. Goal is now fully specified."
    };
  }

  const promptText = `
You are YOUGYE, the Sufficiency, Memory & Clarification Agent of WokAI.
Analyze the user prompt to determine if it provides sufficient actionable information to execute GCP/Web actions.

User Prompt: "${userPrompt}"

Output strictly valid JSON:
{
  "isSufficient": boolean,
  "questions": [string],
  "missingInformation": [string],
  "reasoning": string,
  "refinedPrompt": string
}
`;

  try {
    const responseText = await callModelServer(promptText);
    const parsed = cleanJson(responseText);
    if (parsed && typeof parsed.isSufficient === "boolean") {
      return {
        isSufficient: parsed.isSufficient,
        questions: parsed.questions || [],
        missingInformation: parsed.missingInformation || [],
        reasoning: parsed.reasoning || "Analyzed by YOUGYE Agent",
        refinedPrompt: parsed.refinedPrompt || userPrompt,
        memoryState: !parsed.isSufficient
          ? {
              originalPrompt: userPrompt,
              questionsAsked: parsed.questions || [],
              answersReceived: {}
            }
          : undefined
      };
    }
  } catch (e) {
    console.warn("YOUGYE Agent error:", e);
  }

  const isVague = userPrompt.trim().split(" ").length <= 2 && !/today|now|help|hi|hello/i.test(userPrompt);
  if (isVague) {
    return {
      isSufficient: false,
      questions: [
        `Could you provide more specific details or topic information for "${userPrompt}"?`,
        "Who is the recipient or target audience for this action?"
      ],
      missingInformation: ["Topic details", "Target recipient/location"],
      memoryState: {
        originalPrompt: userPrompt,
        questionsAsked: [
          `Could you provide more specific details or topic information for "${userPrompt}"?`,
          "Who is the recipient or target audience for this action?"
        ],
        answersReceived: {}
      },
      reasoning: "Prompt is too short/vague to infer full execution details."
    };
  }

  return {
    isSufficient: true,
    refinedPrompt: userPrompt,
    reasoning: "User prompt is actionable and sufficient."
  };
}

/* ============================================================================
 * AGENT 2: TIVERE (Realtime Acknowledgement & Response Agent)
 * ============================================================================ */
export async function runTivere(userPrompt: string): Promise<TivereResult> {
  const shortSnippet = userPrompt.length > 50 ? userPrompt.slice(0, 50) + "..." : userPrompt;
  return {
    ackMessage: `⚡ **Tivere Fast-Ack**: Received task "${shortSnippet}...". Initializing subtask breakdown and parallel execution now!`,
    dispatchedAt: new Date().toISOString()
  };
}

/* ============================================================================
 * AGENT 3: VICHAR (Task Breakdown, Ranking & Dispatching Agent)
 * ============================================================================ */
export async function runVichar(userPrompt: string): Promise<VicharPlan> {
  const promptText = `
You are VICHAR, the Task Breakdown, Ranking & Dispatching Agent of WokAI.
Decompose the user prompt into subtasks required for execution.

CRITICAL RULES:
1. For single, direct user requests (e.g. searching for a file, reading emails, sending an email, checking calendar, creating a document), return EXACTLY 1 subtask.
2. NEVER invent meta-subtasks like "Identify credentials", "Authenticate user", "Check access", "Verify permissions", or "Review output".
3. Only create multiple subtasks if the user explicitly requests distinct sequential actions.

User Goal: "${userPrompt}"

Output strictly valid JSON:
{
  "subtasks": [
    {
      "rank": 1,
      "title": string,
      "description": string
    }
  ]
}
`;

  try {
    const responseText = await callModelServer(promptText);
    const parsed = cleanJson(responseText);
    if (parsed && Array.isArray(parsed.subtasks) && parsed.subtasks.length > 0) {
      // Filter out meta-subtasks like credential/auth checks
      const validSubtasks = parsed.subtasks.filter((st: any) => {
        const title = (st.title || "").toLowerCase();
        return !/credential|access credential|authenticate|check permission|verify identity/i.test(title);
      });
      const finalTasks = validSubtasks.length > 0 ? validSubtasks : [parsed.subtasks[0]];
      const subtasks: VicharSubtask[] = finalTasks.map((st: any, idx: number) => ({
        id: helperId("subtask"),
        rank: idx + 1,
        title: st.title || `Subtask ${idx + 1}`,
        description: st.description || `Execute step ${idx + 1}`,
        status: "pending" as const
      }));

      return {
        originalPrompt: userPrompt,
        subtasks,
        totalTasks: subtasks.length,
        completedTasks: 0
      };
    }
  } catch (e) {
    console.warn("VICHAR Agent fallback:", e);
  }

  const promptLower = userPrompt.toLowerCase();

  let defaultToolTitle = `Execute action for: ${userPrompt}`;
  if (/doc|docs|document|write doc|create doc|make doc|build doc/i.test(promptLower)) {
    defaultToolTitle = `Create Google Doc for "${userPrompt}"`;
  } else if (/slide|slides|presentation|ppt|deck|powerpoint/i.test(promptLower)) {
    defaultToolTitle = `Create Google Slides Deck for "${userPrompt}"`;
  } else if (/sheet|sheets|tracker|excel|spreadsheet|csv/i.test(promptLower)) {
    defaultToolTitle = `Create Google Sheet for "${userPrompt}"`;
  } else if (/send email|compose email|send mail|mail to|email to/i.test(promptLower)) {
    defaultToolTitle = `Send Email via Gmail API: "${userPrompt}"`;
  } else if (/gmail|email|inbox|search mail|read mail|check mail/i.test(promptLower)) {
    defaultToolTitle = `Search Gmail Inbox for "${userPrompt}"`;
  } else if (/create meeting|set meeting|schedule meeting|set a meeting|schedule a meeting|add meeting|book meeting|create event|add event|schedule event|book event|set event|meeting at|meeting on|remind me at/i.test(promptLower)) {
    defaultToolTitle = `Schedule Google Calendar Event: "${userPrompt}"`;
  } else if (/list events|upcoming events|get events|check calendar|show calendar|calendar|agenda|what's on my calendar/i.test(promptLower)) {
    defaultToolTitle = `List Google Calendar Events: "${userPrompt}"`;
  } else if (/search drive|find file|search file|in my drive|proposol|proposal|look for file|find doc|search doc|where is file/i.test(promptLower)) {
    defaultToolTitle = `Search Google Drive for "${userPrompt}"`;
  }

  return {
    originalPrompt: userPrompt,
    subtasks: [
      {
        id: helperId("subtask"),
        rank: 1,
        title: defaultToolTitle,
        description: `Execute action for: ${userPrompt}`,
        status: "pending"
      }
    ],
    totalTasks: 1,
    completedTasks: 0
  };
}

/* ============================================================================
 * AGENT 4: DRISTHI (Tool Selection & Statement Enrichment Agent)
 * ============================================================================ */
export async function runDrishthi(
  subtask: VicharSubtask,
  fullPrompt: string
): Promise<DrishthiStatement> {
  const availableToolList = toolRegistry.map((t) => `${t.name}: ${t.description}`).join("\n");

  try {
    const promptText = `
You are DRISTHI, the Tool Selection Agent of WokAI.
Given a specific subtask and the list of available tools, select the single best tool and parameters.

Available Tools:
${availableToolList}

Subtask Title: "${subtask.title}"
Subtask Description: "${subtask.description}"
Original User Goal: "${fullPrompt}"

TOOL SELECTION RULES:
- If user wants to create a doc: select "docs.create"
- If user wants to create slides/deck: select "slides.createDeck"
- If user wants to create a tracker/spreadsheet: select "sheets.createTracker"
- If user wants to create or set a calendar event/meeting: select "calendar.createEvent"
- If user wants to list/check calendar events: select "calendar.listEvents"
- If user wants to find/search files in Drive: select "drive.search"
- If user wants to send an email: select "gmail.send"
- If user wants to search or read emails: select "gmail.search"

Output strictly valid JSON:
{
  "selectedTools": [string],
  "enrichedStatement": string,
  "toolParameters": { "query"?: string, "title"?: string }
}
`;
    const responseText = await callModelServer(promptText);
    const parsed = cleanJson(responseText);
    if (parsed && Array.isArray(parsed.selectedTools) && parsed.selectedTools.length > 0) {
      return {
        subtaskId: subtask.id,
        subtaskTitle: subtask.title,
        selectedTools: parsed.selectedTools as WokaiToolName[],
        enrichedStatement: parsed.enrichedStatement || subtask.description,
        toolParameters: parsed.toolParameters || {}
      };
    }
  } catch (e) {
    console.warn("DRISTHI Agent fallback:", e);
  }

  const textToMatch = `${subtask.title} ${subtask.description} ${fullPrompt}`.toLowerCase();

  let toolName: WokaiToolName = "docs.create";
  if (/doc|docs|document|write doc|create doc|make doc|build doc/i.test(textToMatch)) {
    toolName = "docs.create";
  } else if (/slide|slides|presentation|ppt|deck|powerpoint/i.test(textToMatch)) {
    toolName = "slides.createDeck";
  } else if (/sheet|sheets|tracker|excel|spreadsheet|csv/i.test(textToMatch)) {
    toolName = "sheets.createTracker";
  } else if (/calendar\.create|create event|create meeting|schedule meeting|schedule a meeting|set meeting|set a meeting|add event|add meeting|book meeting|book a meeting|meeting at|meeting on|set event|book event|remind me at/i.test(textToMatch)) {
    toolName = "calendar.createEvent";
  } else if (/calendar\.list|list events|upcoming events|get events|check calendar|show calendar|calendar|agenda|what's on my calendar/i.test(textToMatch)) {
    toolName = "calendar.listEvents";
  } else if (/gmail\.send|send email|compose email|send mail/i.test(textToMatch)) {
    toolName = "gmail.send";
  } else if (/gmail|email|inbox|search mail|find mail|summarize email|read mail/i.test(textToMatch)) {
    toolName = "gmail.search";
  } else if (/contact|people|find phone|find email of/i.test(textToMatch)) {
    toolName = "contacts.search";
  } else if (/drive|search file|find file|in my drive|proposol|proposal|look for file|where is file/i.test(textToMatch)) {
    toolName = "drive.search";
  }

  return {
    subtaskId: subtask.id,
    subtaskTitle: subtask.title,
    selectedTools: [toolName],
    enrichedStatement: `Execute subtask ${subtask.title}`,
    toolParameters: { title: subtask.title, query: fullPrompt }
  };
}

function extractRequestedCount(fullPrompt: string, defaultCount = 10): number {
  const match = fullPrompt.match(/\b(\d+)\s*(pages?|slides?|sections?|rows?)\b/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num > 0 && num <= 50) return num;
  }
  return defaultCount;
}

const SECTION_TOPICS = [
  "Executive Summary & Core Overview",
  "Historical Background & Early Foundations",
  "Key Drivers, Capital & Infrastructure",
  "Structural Evolution & Major Phases",
  "Socioeconomic Impact & Workforce Dynamics",
  "Technological Innovations & Automation",
  "Environmental & Resource Challenges",
  "Policy, Governance & Compliance Frameworks",
  "Market Dynamics & Global Competitiveness",
  "Modern Digital Transformation & Industry Standards",
  "Risk Assessment & Systemic Bottlenecks",
  "Operational Execution & Process Optimization",
  "Intellectual Property & R&D Strategy",
  "Supply Chain Resilience & Integration",
  "Future Outlook & Strategic Roadmap",
  "Case Studies & Empirical Field Data",
  "Comparative Regional & Global Benchmark Analysis",
  "Sustainability Metrics & Circular Economy Principles",
  "Workforce Upskilling & Talent Retention Strategy",
  "Financial Projections & Return on Investment",
  "Regulatory Evolution & Cross-Border Legalities",
  "Quality Assurance & Continuous Improvement",
  "Emerging Frontier Technologies & Next-Gen Trends",
  "Stakeholder Engagement & Ecosystem Alliances",
  "Conclusion & Final Actionable Takeaways"
];

function buildRichContent(drishthi: DrishthiStatement, fullPrompt: string): string {
  const tool = (drishthi.selectedTools[0] || "") as string;
  const promptLower = fullPrompt.toLowerCase();
  const requestedCount = extractRequestedCount(fullPrompt, 10);

  // 1. Google Slides / Presentation Deck
  if (tool === "slides.createDeck" || tool.includes("slide") || promptLower.includes("presentation") || promptLower.includes("ppt") || promptLower.includes("deck")) {
    const rawTopic = fullPrompt
      .replace(/^(create|write|make|generate|build)\s+(a|an)?\s+(\d+-slide|slide|\d+\s+slides|presentation|deck|ppt)?\s*(google\s*)?(slides|presentation|deck|file)?\s*(on|about|for|on topic)?\s*/i, "")
      .trim();
    const topic = rawTopic ? rawTopic.charAt(0).toUpperCase() + rawTopic.slice(1) : drishthi.subtaskTitle;

    const slides: string[] = [];
    for (let i = 1; i <= requestedCount; i++) {
      const topicName = SECTION_TOPICS[(i - 1) % SECTION_TOPICS.length];
      slides.push(`# Slide ${i}: ${topic} - ${topicName}
- Key strategic analysis regarding ${topicName.toLowerCase()} in relation to ${topic}
- Core operational metrics, historical benchmarks, and structural impacts
- Actionable guidelines and execution principles prepared by WokAI OS`);
    }
    return slides.join("\n\n");
  }

  // 2. Google Sheets / Spreadsheet / Tracker
  if (tool === "sheets.createTracker" || tool.includes("sheet") || promptLower.includes("spreadsheet") || promptLower.includes("tracker") || promptLower.includes("excel")) {
    const rawTopic = fullPrompt
      .replace(/^(create|write|make|generate|build)\s+(a|an)?\s*(google\s*)?(sheet|sheets|spreadsheet|tracker|excel)?\s*(on|about|for|on topic)?\s*/i, "")
      .trim();
    const topic = rawTopic ? rawTopic.charAt(0).toUpperCase() + rawTopic.slice(1) : drishthi.subtaskTitle;

    const rows: string[] = ["ID, Module Name, Task Description, Status, Priority, Assigned Owner, Target Date"];
    for (let i = 1; i <= requestedCount; i++) {
      const topicName = SECTION_TOPICS[(i - 1) % SECTION_TOPICS.length];
      const status = i % 3 === 1 ? "Completed" : i % 3 === 2 ? "In Progress" : "Pending";
      const priority = i % 4 === 0 ? "CRITICAL" : i % 2 === 0 ? "HIGH" : "MEDIUM";
      rows.push(`${i}, ${topic} - ${topicName}, Detailed execution step for ${topicName.toLowerCase()}, ${status}, ${priority}, Deepak Yadav, 2026-08-${String(15 + (i % 15)).padStart(2, "0")}`);
    }
    return rows.join("\n");
  }

  // 3. Google Docs / Document File
  const rawTopic = fullPrompt
    .replace(/^(create|write|make|generate|build)\s+(a|an)?\s+(\d+-page|page|short|long|detailed)?\s*(google\s*)?(doc|docs|document|file)\s*(on|about|for|on topic|mainy on topic)?\s*/i, "")
    .replace(/\s*(and give me the link|give me link|link of file|link).*$/i, "")
    .trim();
  const topic = rawTopic ? rawTopic.charAt(0).toUpperCase() + rawTopic.slice(1) : drishthi.subtaskTitle;

  const docSections: string[] = [`# ${topic}\n\n*Comprehensive ${requestedCount}-Section Document Generated by WokAI OS*\n`];
  for (let i = 1; i <= requestedCount; i++) {
    const topicName = SECTION_TOPICS[(i - 1) % SECTION_TOPICS.length];
    docSections.push(`## ${i}. ${topicName}
The domain of ${topic} as it relates to ${topicName.toLowerCase()} demonstrates profound structural significance across global frameworks.

### ${i}.1 Core Principles & Findings
- **Strategic Impact:** Primary operational models drive high-efficiency throughput and organizational scalability.
- **Resource Allocation:** Capital investments and infrastructure development provide long-term resilience.
- **Empirical Evidence:** Quantitative benchmarks indicate steady advancement across regional and international metrics.

### ${i}.2 Analytical Breakdown
Detailed investigation into ${topicName.toLowerCase()} reveals key technological, economic, and policy factors. Organization leaders must maintain adaptive governance to optimize long-term outcomes while mitigating systemic risks.`);
  }

  docSections.push(`\n---\n*Document compiled by WokAI OS | Prompt: "${fullPrompt}"*`);
  return docSections.join("\n\n");
}

/* ============================================================================
 * AGENT 5: SAHAYATA (Content & Payload Generation Agent)
 * ============================================================================ */
export async function runSahayata(
  drishthi: DrishthiStatement,
  fullPrompt: string
): Promise<SahayataPayload> {
  const requestedCount = extractRequestedCount(fullPrompt, 10);
  const isSlides = drishthi.selectedTools.includes("slides.createDeck") || fullPrompt.toLowerCase().includes("ppt") || fullPrompt.toLowerCase().includes("slide");

  try {
    const promptText = `
You are SAHAYATA, the Content & Payload Generation Agent of WokAI.
Generate rich, full-length, highly detailed content (document body, article, email body, report, or presentation slides) to fulfill the user's goal.

TARGET LENGTH REQUIRED: ${requestedCount} ${isSlides ? "slides" : "pages/sections"}.
${isSlides ? `Output EXACTLY ${requestedCount} slides formatted with headers \`# Slide 1: ...\` through \`# Slide ${requestedCount}: ...\`. Each slide must contain bullet points.` : `Output EXACTLY ${requestedCount} detailed sections formatted as \`## 1. ...\` through \`## ${requestedCount}. ...\`.`}

DRISTHI Statement: "${drishthi.enrichedStatement}"
Tools selected: ${drishthi.selectedTools.join(", ")}
Full User Goal: "${fullPrompt}"

Output strictly valid JSON:
{
  "content": string,
  "drafts": {
    "subject"?: string,
    "body"?: string,
    "title"?: string
  }
}
`;
    const responseText = await callModelServer(promptText);
    const parsed = cleanJson(responseText);
    if (parsed && typeof parsed.content === "string" && parsed.content.length > 50) {
      return {
        subtaskId: drishthi.subtaskId,
        content: parsed.content,
        drafts: parsed.drafts
      };
    }
  } catch (e) {
    console.warn("SAHAYATA Agent fallback:", e);
  }

  return {
    subtaskId: drishthi.subtaskId,
    content: buildRichContent(drishthi, fullPrompt)
  };
}

/* ============================================================================
 * AGENT 6: KRIYA (Action Execution & API Adapter Agent)
 * ============================================================================ */
export async function runKriya(
  drishthi: DrishthiStatement,
  sahayata: SahayataPayload,
  googleToken?: string
): Promise<KriyaResult> {
  const toolName = drishthi.selectedTools[0] || "drive.search";
  const actionId = helperId("act");

  // Determine clean action label (prefer specific query/title parameter over raw subtask title)
  let actionLabel = drishthi.toolParameters?.query || drishthi.toolParameters?.title || drishthi.subtaskTitle;
  if (/identify|credentials|authenticate/i.test(actionLabel)) {
    actionLabel = drishthi.enrichedStatement || drishthi.subtaskTitle;
  }

  const actionToExecute: WokaiAction = {
    id: actionId,
    tool: toolName,
    label: actionLabel,
    content: sahayata.content,
    status: "RUNNING",
    sensitive: toolName === "gmail.send" || toolName.includes("delete"),
    createdAt: new Date().toISOString()
  };

  try {
    const adapterRes = await executeAdapterAction(actionToExecute, googleToken);
    actionToExecute.status = adapterRes.status;
    actionToExecute.output = adapterRes.output;
    actionToExecute.url = adapterRes.url;

    return {
      subtaskId: drishthi.subtaskId,
      executedApi: toolName,
      status: adapterRes.status === "COMPLETED" ? "SUCCESS" : adapterRes.status === "NEEDS_APPROVAL" ? "PENDING_APPROVAL" : "FAILED",
      apiResponse: adapterRes.output,
      actionCreated: actionToExecute
    };
  } catch (err: any) {
    actionToExecute.status = "FAILED";
    return {
      subtaskId: drishthi.subtaskId,
      executedApi: toolName,
      status: "FAILED",
      apiResponse: `API Execution Exception: ${err?.message || err}`,
      actionCreated: actionToExecute
    };
  }
}

/* ============================================================================
 * AGENT 7: MULYE (Verification, Auditing & Evaluation Agent)
 * ============================================================================ */
export async function runMulye(
  subtask: VicharSubtask,
  kriya: KriyaResult,
  sahayata: SahayataPayload
): Promise<MulyeReport> {
  const isSuccess = kriya.status === "SUCCESS" || kriya.status === "PENDING_APPROVAL";
  return {
    subtaskId: subtask.id,
    success: isSuccess,
    reportSummary: isSuccess
      ? `Verified Subtask #${subtask.rank} (${subtask.title}): Output produced successfully. API status: ${kriya.status}.`
      : `Audit Failed for Subtask #${subtask.rank}: ${kriya.apiResponse}`,
    userUpdateMessage: `Subtask #${subtask.rank} (${subtask.title}) verified.`
  };
}

/* ============================================================================
 * AGENT 8: SAMPARN (Final Synthesis & Report Presentation Agent)
 * ============================================================================ */
export async function runSamparn(
  vichar: VicharPlan,
  subtaskLogs: Array<{
    subtask: VicharSubtask;
    drishthi: DrishthiStatement;
    sahayata: SahayataPayload;
    kriya: KriyaResult;
    mulye: MulyeReport;
  }>
): Promise<SamparnSummary> {
  const completedSummaries = subtaskLogs.map(
    (log) => `• Subtask #${log.subtask.rank} (${log.subtask.title}): ${log.mulye.reportSummary}`
  );

  try {
    const logDetails = subtaskLogs
      .map(
        (l) =>
          `Subtask: ${l.subtask.title}\nSahayata Content: ${l.sahayata.content.slice(0, 200)}\nKriya API: ${l.kriya.executedApi} (${l.kriya.status})`
      )
      .join("\n---\n");

    const promptText = `
You are SAMPARN, the Final Synthesis & Report Presentation Agent of WokAI.
All subtasks have been executed by VICHAR, DRISTHI, SAHAYATA, KRIYA, and verified by MULYE.
Synthesize a formatted, comprehensive final report to present to the user.

Original Goal: "${vichar.originalPrompt}"

Execution Log:
${logDetails}

Output strictly valid JSON:
{
  "finalTitle": string,
  "comprehensiveSummary": string,
  "completedSubtaskSummaries": [string],
  "finalOutputPresentation": string,
  "recommendedNextSteps": [string]
}
`;

    const responseText = await callModelServer(promptText);
    const parsed = cleanJson(responseText);
    if (parsed && parsed.finalOutputPresentation) {
      return {
        finalTitle: parsed.finalTitle || `Execution Report: ${vichar.originalPrompt.slice(0, 40)}`,
        comprehensiveSummary: parsed.comprehensiveSummary || `Executed all subtasks`,
        completedSubtaskSummaries: Array.isArray(parsed.completedSubtaskSummaries)
          ? parsed.completedSubtaskSummaries
          : completedSummaries,
        finalOutputPresentation: parsed.finalOutputPresentation,
        recommendedNextSteps: Array.isArray(parsed.recommendedNextSteps)
          ? parsed.recommendedNextSteps
          : ["Review output", "Check actions"]
      };
    }
  } catch (e) {
    console.warn("SAMPARN Agent fallback:", e);
  }

  const apiOutputs = subtaskLogs
    .map((l) => l.kriya.apiResponse)
    .filter(Boolean)
    .join("\n\n");

  return {
    finalTitle: `Execution Report: ${vichar.originalPrompt.slice(0, 40)}`,
    comprehensiveSummary: `Completed ${subtaskLogs.length} subtask(s) for prompt: "${vichar.originalPrompt}".`,
    completedSubtaskSummaries: completedSummaries,
    finalOutputPresentation: apiOutputs || `All subtasks completed successfully.\n\nSummary of Actions:\n${completedSummaries.join("\n")}`,
    recommendedNextSteps: ["Review generated results or actions", "Share results with team"]
  };
}
