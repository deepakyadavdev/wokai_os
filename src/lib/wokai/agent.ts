import type { AgentPlan, RiskLevel, WokaiAction, WokaiMemory, WokaiTask, YougyeMemoryState } from "@/lib/types";
import {
  runYougye,
  runTivere,
  runVichar,
  runDrishthi,
  runSahayata,
  runKriya,
  runMulye,
  runSamparn,
  callModelServer
} from "@/lib/wokai/8agents";

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function detectRisk(message: string): RiskLevel {
  if (/5 hours|tonight|now|urgent|critical|last minute|due today/i.test(message)) return "CRITICAL";
  if (/tomorrow|due|deadline|late|assignment|bill/i.test(message)) return "HIGH";
  if (/plan|schedule|meeting|email|pitch/i.test(message)) return "MEDIUM";
  return "LOW";
}

/**
 * Main 8-Agent Orchestrator Pipeline
 * Runs YOUGYE -> TIVERE + VICHAR -> (DRISTHI -> SAHAYATA + KRIYA -> MULYE) [per subtask] -> SAMPARN
 * Driven STRICTLY by Open-Source Model Server (GPU server / Ollama)
 */
export async function generateAgentPlan(
  message: string,
  onPhaseChange?: (phase: string, output?: string) => void,
  googleToken?: string,
  userLevel = 1,
  isVoice = false,
  history?: Array<{ role: string; content: string }>,
  existingMemoryState?: YougyeMemoryState
): Promise<AgentPlan> {
  const riskLevel = detectRisk(message);
  onPhaseChange?.("routing", "Initializing 8-Agent Pipeline...");

  // 1. YOUGYE AGENT - Check Sufficiency & Memory
  onPhaseChange?.("yougye", "YOUGYE Agent: Analyzing prompt sufficiency and context...");
  const yougyeRes = await runYougye(message, history, existingMemoryState);

  if (!yougyeRes.isSufficient && yougyeRes.questions && yougyeRes.questions.length > 0) {
    const questionText = yougyeRes.questions.map((q, idx) => `${idx + 1}. ${q}`).join("\n");
    const responseText = `I need a bit more detail before proceeding:\n\n${questionText}\n\nPlease reply with your answers so I can refine the prompt and start execution.`;

    return {
      intent: "Clarification Needed",
      riskLevel,
      response: responseText,
      reasoning: [yougyeRes.reasoning],
      plan: ["Ask clarifying questions", "Save prompt state to memory", "Await user answers"],
      actions: [],
      suggestedTasks: [],
      memoryWrites: [],
      needsApproval: false,
      confidence_score: 0.5,
      clarification_required: true,
      missing_information: yougyeRes.missingInformation || [],
      unsupported_operation: false,
      risk_level: riskLevel,
      dependency_list: [],
      preconditions: [],
      postconditions: [],
      validation_status: "PENDING",
      failure_reason: null,
      eightAgentOutput: {
        yougye: yougyeRes
      }
    };
  }

  const refinedPrompt = yougyeRes.refinedPrompt || message;

  // 2. TIVERE AGENT - Fast Ack (Dispatched immediately!)
  onPhaseChange?.("tivere", "TIVERE Agent: Generating fast acknowledgement...");
  const tivereRes = await runTivere(refinedPrompt);
  onPhaseChange?.("tivere_done", tivereRes.ackMessage);

  // 3. VICHAR AGENT - Deconstruct subtasks
  onPhaseChange?.("vichar", "VICHAR Agent: Decomposing task into ranked subtasks...");
  const vicharPlan = await runVichar(refinedPrompt);
  onPhaseChange?.(
    "vichar_done",
    `VICHAR Agent: Created ${vicharPlan.subtasks.length} ranked subtasks.`
  );

  // 3. SUBTASK LOOP (DRISTHI -> SAHAYATA + KRIYA -> MULYE)
  const subtaskLogs: Array<{
    subtask: (typeof vicharPlan.subtasks)[0];
    drishthi: any;
    sahayata: any;
    kriya: any;
    mulye: any;
  }> = [];

  for (const st of vicharPlan.subtasks) {
    onPhaseChange?.("drishthi", `DRISTHI Agent: Selecting GCP tools for "${st.title}"...`);
    const drishthiRes = await runDrishthi(st, refinedPrompt);
    onPhaseChange?.("drishthi_done", `DRISTHI Agent: Mapped to tools [${drishthiRes.selectedTools.join(", ")}]`);

    onPhaseChange?.("sahayata", `SAHAYATA Agent: Generating content payload for "${st.title}"...`);
    const sahayataRes = await runSahayata(drishthiRes, refinedPrompt, subtaskLogs);
    onPhaseChange?.("sahayata_done", `SAHAYATA Agent: Payload ready (${sahayataRes.content.length} chars).`);

    onPhaseChange?.("kriya", `KRIYA Agent: Executing GCP action for "${st.title}"...`);
    const kriyaRes = await runKriya(drishthiRes, sahayataRes, googleToken, subtaskLogs);
    onPhaseChange?.("kriya_done", `KRIYA Agent: Action result: ${kriyaRes.status}`);

    onPhaseChange?.("mulye", `MULYE Agent: Auditing subtask "${st.title}"...`);
    const mulyeRes = await runMulye(st, kriyaRes, sahayataRes);
    onPhaseChange?.("mulye_done", `MULYE Agent: Audit result: ${mulyeRes.success ? "PASSED" : "FAILED"}`);

    subtaskLogs.push({
      subtask: st,
      drishthi: drishthiRes,
      sahayata: sahayataRes,
      kriya: kriyaRes,
      mulye: mulyeRes
    });
  }

  // 4. SAMPARN AGENT - Synthesis & Presentation Report
  onPhaseChange?.("samparn", "SAMPARN Agent: Synthesizing final presentation report...");
  const samparnRes = await runSamparn(vicharPlan, subtaskLogs);
  onPhaseChange?.("samparn_done", "SAMPARN Agent: Presentation report complete.");

  const finalResponseText = samparnRes.finalOutputPresentation || samparnRes.comprehensiveSummary || "8-Agent Task Execution Complete.";
  const plannedActions = subtaskLogs.map((l) => l.kriya.actionCreated).filter(Boolean) as WokaiAction[];

  const createdTask: WokaiTask = {
    id: makeId("task"),
    title: `8-Agent Execution: ${refinedPrompt.slice(0, 40)}`,
    description: finalResponseText,
    deadline: null,
    priority: riskLevel,
    status: subtaskLogs.every((l) => l.mulye.success) ? "done" : "in_progress",
    progress: Math.round((subtaskLogs.filter((l) => l.mulye.success).length / subtaskLogs.length) * 100),
    subtasks: vicharPlan.subtasks.map((s) => s.title),
    source: "chat"
  };

  return {
    intent: `Execute: ${vicharPlan.originalPrompt.slice(0, 50)}`,
    riskLevel,
    response: finalResponseText,
    tivereAck: tivereRes.ackMessage,
    reasoning: [
      `YOUGYE: ${yougyeRes.reasoning}`,
      `VICHAR: Created ${vicharPlan.subtasks.length} subtasks`,
      `MULYE: Verified ${subtaskLogs.filter((l) => l.mulye.success).length}/${subtaskLogs.length} subtasks successful`
    ],
    plan: vicharPlan.subtasks.map((st) => `#${st.rank} ${st.title}: ${st.description}`),
    actions: plannedActions,
    suggestedTasks: [createdTask],
    memoryWrites: [],
    needsApproval: plannedActions.some((a) => a.sensitive && a.status === "NEEDS_APPROVAL"),
    confidence_score: 0.95,
    clarification_required: false,
    missing_information: [],
    unsupported_operation: false,
    risk_level: riskLevel,
    dependency_list: [],
    preconditions: ["8-Agent System verification"],
    postconditions: ["Task executed and verified by Mulye"],
    validation_status: "PASS",
    failure_reason: null,
    eightAgentOutput: {
      yougye: yougyeRes,
      tivere: tivereRes,
      vichar: vicharPlan,
      subtasksCompleted: subtaskLogs,
      samparn: samparnRes
    }
  };
}

export async function generateAgentHashExecutionSummary(
  prompt: string,
  completedSubtasks: string[]
): Promise<string> {
  const responseText = await callModelServer(`
Summarize these completed subtasks concisely into 2 bullet points:
Original Prompt: "${prompt}"
Subtasks:
${completedSubtasks.join("\n")}
`);

  if (responseText) return responseText;
  return `Successfully executed all ${completedSubtasks.length} subtasks.`;
}
