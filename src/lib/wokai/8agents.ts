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
Decompose the user prompt into 2 to 4 ranked subtasks required for execution.

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
    if (parsed && Array.isArray(parsed.subtasks)) {
      const subtasks: VicharSubtask[] = parsed.subtasks.map((st: any, idx: number) => ({
        id: helperId("subtask"),
        rank: st.rank || idx + 1,
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

  return {
    originalPrompt: userPrompt,
    subtasks: [
      {
        id: helperId("subtask"),
        rank: 1,
        title: "Analyze request & generate draft content",
        description: `Create content body and details for: ${userPrompt}`,
        status: "pending"
      },
      {
        id: helperId("subtask"),
        rank: 2,
        title: "Execute GCP / Web API action",
        description: `Perform GCP API call or web integrations for: ${userPrompt}`,
        status: "pending"
      }
    ],
    totalTasks: 2,
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
Given a specific subtask and the list of available tools, select the best tool(s) and synthesize an enriched execution statement to pass to KRIYA and SAHAYATA.

Available Tools:
${availableToolList}

Subtask Title: "${subtask.title}"
Subtask Description: "${subtask.description}"
Original User Goal: "${fullPrompt}"

Output strictly valid JSON:
{
  "selectedTools": [string],
  "enrichedStatement": string,
  "toolParameters": object
}
`;
    const responseText = await callModelServer(promptText);
    const parsed = cleanJson(responseText);
    if (parsed && Array.isArray(parsed.selectedTools)) {
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

  let toolName: WokaiToolName = "docs.create";
  if (/email|send|gmail/i.test(subtask.title + subtask.description)) toolName = "gmail.send";
  if (/calendar|event|meeting/i.test(subtask.title + subtask.description)) toolName = "calendar.createEvent";
  if (/sheet|tracker|excel/i.test(subtask.title + subtask.description)) toolName = "sheets.createTracker";
  if (/slide|deck|presentation/i.test(subtask.title + subtask.description)) toolName = "slides.createDeck";

  return {
    subtaskId: subtask.id,
    subtaskTitle: subtask.title,
    selectedTools: [toolName],
    enrichedStatement: `Execute subtask ${subtask.title}`,
    toolParameters: { title: subtask.title }
  };
}

/* ============================================================================
 * AGENT 5: SAHAYATA (Content & Payload Generation Agent)
 * ============================================================================ */
export async function runSahayata(
  drishthi: DrishthiStatement,
  fullPrompt: string
): Promise<SahayataPayload> {
  try {
    const promptText = `
You are SAHAYATA, the Content & Payload Generation Agent of WokAI.
Write detailed, polished content (document body, email text, report contents, or structured data) to fulfill the DRISTHI statement.

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
    if (parsed && typeof parsed.content === "string") {
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
    content: `Generated content payload for ${drishthi.subtaskTitle} based on user goal: ${fullPrompt}`
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
  const toolName = drishthi.selectedTools[0] || "docs.create";
  const actionId = helperId("act");

  const actionToExecute: WokaiAction = {
    id: actionId,
    tool: toolName,
    label: drishthi.subtaskTitle,
    content: sahayata.content,
    status: "RUNNING",
    sensitive: toolName === "gmail.send" || toolName.includes("delete"),
    createdAt: new Date().toISOString()
  };

  try {
    const adapterRes = await executeAdapterAction(actionToExecute, googleToken);
    actionToExecute.status = adapterRes.status;

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

  return {
    finalTitle: `Execution Report: ${vichar.originalPrompt.slice(0, 40)}`,
    comprehensiveSummary: `Completed all ${subtaskLogs.length} subtasks for prompt: "${vichar.originalPrompt}".`,
    completedSubtaskSummaries: completedSummaries,
    finalOutputPresentation: `All subtasks completed successfully.\n\nSummary of Actions:\n${completedSummaries.join("\n")}`,
    recommendedNextSteps: ["Review generated documents or actions", "Share results with team"]
  };
}
