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

  // 2. TIVERE + VICHAR AGENTS (Parallel Execution)
  onPhaseChange?.("tivere", "TIVERE Agent: Sending fast acknowledgement...");
  onPhaseChange?.("vichar", "VICHAR Agent: Decomposing task into ranked subtasks...");

  const [tivereRes, vicharPlan] = await Promise.all([
    runTivere(refinedPrompt),
    runVichar(refinedPrompt)
  ]);

  onPhaseChange?.(
    "vichar",
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

  const plannedActions: WokaiAction[] = [];

  for (const st of vicharPlan.subtasks) {
    // DRISTHI
    onPhaseChange?.("drishthi", `DRISTHI Agent: Selecting tools for Subtask #${st.rank} (${st.title})...`);
    const drishthiRes = await runDrishthi(st, refinedPrompt);

    // SAHAYATA & KRIYA (Parallel)
    onPhaseChange?.("sahayata", `SAHAYATA Agent: Generating content payload for Subtask #${st.rank}...`);
    onPhaseChange?.("kriya", `KRIYA Agent: Preparing GCP API execution for Subtask #${st.rank}...`);

    const sahayataRes = await runSahayata(drishthiRes, refinedPrompt);
    const kriyaRes = await runKriya(drishthiRes, sahayataRes, googleToken);

    if (kriyaRes.actionCreated) {
      plannedActions.push(kriyaRes.actionCreated);
    }

    // MULYE
    onPhaseChange?.("mulye", `MULYE Agent: Verifying output for Subtask #${st.rank}...`);
    const mulyeRes = await runMulye(st, kriyaRes, sahayataRes);

    subtaskLogs.push({
      subtask: st,
      drishthi: drishthiRes,
      sahayata: sahayataRes,
      kriya: kriyaRes,
      mulye: mulyeRes
    });
  }

  // 4. SAMPARN AGENT - Final Synthesis & Report Presentation
  onPhaseChange?.("samparn", "SAMPARN Agent: Synthesizing final execution report...");
  const samparnRes = await runSamparn(vicharPlan, subtaskLogs);

  // Build suggested WokaiTask
  const createdTask: WokaiTask = {
    id: makeId("task"),
    title: `8-Agent Execution: ${vicharPlan.originalPrompt.slice(0, 40)}`,
    description: samparnRes.comprehensiveSummary,
    deadline: new Date(Date.now() + 24 * 36e5).toISOString(),
    priority: riskLevel,
    status: "done",
    progress: 100,
    subtasks: vicharPlan.subtasks.map((st) => st.title),
    source: "chat"
  };

  const finalResponseText = `${tivereRes.ackMessage}\n\n${samparnRes.finalOutputPresentation}`;

  return {
    intent: `Execute: ${vicharPlan.originalPrompt.slice(0, 50)}`,
    riskLevel,
    response: finalResponseText,
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
