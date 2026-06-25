import { GoogleGenerativeAI } from "@google/generative-ai";

import { demoSnapshot } from "@/lib/data/demo";
import type { AgentPlan, RiskLevel, WokaiAction, WokaiMemory, WokaiTask } from "@/lib/types";
import { getTool } from "@/lib/wokai/tools";

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function detectRisk(message: string): RiskLevel {
  if (/5 hours|tonight|now|urgent|critical|last minute|due today/i.test(message)) return "CRITICAL";
  if (/tomorrow|due|deadline|late|assignment|bill/i.test(message)) return "HIGH";
  if (/plan|schedule|meeting|email|pitch/i.test(message)) return "MEDIUM";
  return "LOW";
}

function makeAction(toolName: WokaiAction["tool"], label: string): WokaiAction {
  const tool = getTool(toolName);
  return {
    id: id("action"),
    tool: toolName,
    label,
    status: tool?.statusWhenPlanned ?? "PLANNED",
    sensitive: tool?.sensitive ?? false,
    createdAt: new Date().toISOString()
  };
}

function makeTask(message: string, riskLevel: RiskLevel): WokaiTask {
  const deadlineHours = riskLevel === "CRITICAL" ? 5 : riskLevel === "HIGH" ? 18 : 72;
  const title = /chemistry/i.test(message)
    ? "Chemistry assignment rescue"
    : /pitch|investor/i.test(message)
      ? "Prepare investor pitch"
      : /bill/i.test(message)
        ? "Bill payment rescue"
        : "WokAI action plan";

  return {
    id: id("task"),
    title,
    description: `Created from chat: "${message.slice(0, 120)}"`,
    deadline: new Date(Date.now() + deadlineHours * 36e5).toISOString(),
    priority: riskLevel,
    status: "todo",
    progress: 0,
    subtasks:
      riskLevel === "CRITICAL"
        ? ["Define smallest finishable outcome", "Gather files", "Execute 90-minute sprint", "Review and submit"]
        : ["Collect context", "Break into subtasks", "Schedule focus block", "Check progress"],
    source: "chat"
  };
}

function makeMemory(message: string): WokaiMemory | null {
  const match = message.match(/I (study|work|focus|write|code) better (.+)/i);
  if (!match) return null;
  return {
    id: id("memory"),
    type: "habit",
    title: `${match[1]} preference`,
    content: `User ${match[1]}s better ${match[2]}. Use this when scheduling future work.`,
    confidence: 0.82,
    updatedAt: new Date().toISOString()
  };
}

export function deterministicAgentPlan(message: string): AgentPlan {
  const lower = message.toLowerCase().trim();
  const cleanLower = lower.replace(/[^\w\s]/g, "").trim();
  const greetings = [
    "hi", "hey", "hello", "greetings", "good morning", "good afternoon",
    "good evening", "yo", "sup", "heelo", "hi there", "hello there", "hey there"
  ];

  const isGreeting = greetings.includes(cleanLower) ||
                     greetings.some(g => cleanLower.startsWith(g + " "));

  const isCapabilityQuestion =
    /(what can you do|what are you able to do|how can you help|what tools do you have|help|who are you|what is this|options|features|commands)/i.test(cleanLower) ||
    (cleanLower.includes("can you") && cleanLower.includes("do")) ||
    (cleanLower.includes("what") && cleanLower.includes("do"));

  const hasTaskKeywords = /email|inbox|gmail|reply|meeting|schedule|calendar|rahul|file|drive|notes|docs|sheet|slides|pitch|deck|call|phone|browser|apply|internship|website|form|device|laptop|tablet|terminal|run|exec|cmd|ls|dir|scan|due|assignment|project|bill|deadline|rescue/i.test(cleanLower);

  if ((isGreeting || isCapabilityQuestion) && !hasTaskKeywords) {
    const response = isGreeting
      ? "Hello! I am WokAI, your AI OS companion. How can I help you manage your tasks, check emails, control devices, or schedule calendar events today?"
      : "I can assist you with information and tasks based on your needs. For example, I can check your Gmail inbox, manage your Google Calendar events, search Google Drive files, automate browser workflows, and run terminal commands. Let me know what you'd like help with!";

    return {
      intent: "greeting",
      riskLevel: "LOW",
      response,
      reasoning: [
        "Identified user message as a simple greeting or general inquiry.",
        "Skipped task creation and planning loop."
      ],
      plan: ["Awaiting user instructions"],
      actions: [],
      suggestedTasks: [],
      memoryWrites: [],
      needsApproval: false
    };
  }

  const riskLevel = detectRisk(message);
  const actions: WokaiAction[] = [
    makeAction("memory.recall", "Loaded preferences, habits, deadlines, and recent actions")
  ];
  const plan: string[] = [];
  const suggestedTasks: WokaiTask[] = [];
  const memoryWrites: WokaiMemory[] = [];

  if (/email|inbox|gmail|reply/.test(lower)) {
    actions.push(makeAction("gmail.summarize", "Prepare inbox summary and draft replies"));
    plan.push("Scan urgent threads", "Extract deadlines and commitments", "Draft replies for approval");
  }

  if (/meeting|schedule|calendar|rahul/.test(lower)) {
    actions.push(makeAction("contacts.search", "Find contact details"));
    actions.push(makeAction("calendar.findSlots", "Find conflict-free meeting slots"));
    actions.push(makeAction("calendar.createEvent", "Create event after approval"));
    plan.push("Find attendee", "Check calendar availability", "Propose best slot", "Create event after approval");
  }

  if (/file|drive|notes|docs|sheet|slides|pitch|deck/.test(lower)) {
    actions.push(makeAction("drive.search", "Find relevant workspace files"));
    if (/doc|assignment|notes/.test(lower)) actions.push(makeAction("docs.create", "Create a working draft"));
    if (/sheet|tracker|budget/.test(lower)) actions.push(makeAction("sheets.createTracker", "Create tracker sheet"));
    if (/slide|pitch|deck|presentation/.test(lower)) actions.push(makeAction("slides.createDeck", "Create deck outline"));
    plan.push("Search files", "Open relevant source material", "Generate structured output");
  }

  if (/call|phone/.test(lower)) {
    actions.push(makeAction("contacts.search", "Find phone contact"));
    actions.push(makeAction("calls.prepare", "Prepare call script and dialer action"));
    plan.push("Find contact", "Generate call script", "Open dialer or Twilio after approval");
  }

  if (/browser|apply|internship|website|form/.test(lower)) {
    actions.push(makeAction("browser.plan", "Prepare browser automation with approval pause"));
    plan.push("Open target website", "Fill safe fields", "Pause before final submit");
  }

  if (/device|laptop|phone|tablet|open .* on|terminal|run |exec |cmd|ls |dir |scan |find file/.test(lower)) {
    if (/terminal|run |exec |cmd|ls |dir /i.test(lower)) {
      actions.push(makeAction("devices.terminal", "Run shell command on host device"));
      plan.push("Request terminal authorization", "Open terminal process", "Execute shell command", "Stream output response");
    } else if (/scan |find file|search .* file/i.test(lower)) {
      actions.push(makeAction("devices.fileAccess", "Scan approved local directories"));
      plan.push("Identify target search directories", "Index directories", "Filter matching files");
    } else {
      actions.push(makeAction("devices.openApp", "Launch application on target device"));
      plan.push("Resolve target device", "Verify process permissions", "Launch application process");
    }
  }

  if (/due|assignment|project|bill|deadline|rescue|last minute|tomorrow|today|5 hours/.test(lower)) {
    actions.push(makeAction("task.rescuePlan", "Generate last-minute rescue plan"));
    actions.push(makeAction("calendar.findSlots", "Block focused execution time"));
    actions.push(makeAction("notifications.create", "Create escalation alert"));
    suggestedTasks.push(makeTask(message, riskLevel));
    plan.push("Calculate deadline danger", "Create smallest viable completion plan", "Schedule focus blocks", "Track progress");
  }

  const memory = makeMemory(message);
  if (memory) {
    actions.push(makeAction("memory.retain", "Saved new personal preference"));
    memoryWrites.push(memory);
    plan.push("Use this preference in future scheduling");
  }

  if (plan.length === 0) {
    plan.push("Clarify the work goal", "Find relevant context", "Create a next-action plan", "Save useful memory");
    suggestedTasks.push(makeTask(message, riskLevel));
  }

  const needsApproval = actions.some((action) => action.status === "NEEDS_APPROVAL");
  const riskPrefix =
    riskLevel === "CRITICAL"
      ? "Risk level: CRITICAL. "
      : riskLevel === "HIGH"
        ? "Risk level: HIGH. "
        : "";

  return {
    intent: lower.includes("plan my day") ? "daily_planning" : "work_completion",
    riskLevel,
    response: `${riskPrefix}I created a concrete execution plan, queued the safe steps, and paused anything sensitive for your approval.`,
    reasoning: [
      "Recalled user memory before planning.",
      `Detected ${riskLevel.toLowerCase()} urgency from the request.`,
      "Mapped the request to specialized WokAI subagents and tools.",
      needsApproval ? "Sensitive actions are waiting for approval." : "No sensitive external action is required yet."
    ],
    plan: Array.from(new Set(plan)),
    actions,
    suggestedTasks,
    memoryWrites,
    needsApproval
  };
}

const OPENROUTER_MODELS_POOL = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-coder:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "openrouter/free",
  "liquid/lfm-2.5-1.2b-thinking:free",
  "liquid/lfm-2.5-1.2b-instruct:free",
  "nvidia/nemotron-3.5-content-safety:free",
  "nvidia/nemotron-rerank-vl-1b-v2:free",
  "nvidia/nemotron-embed-vl-1b-v2:free"
];

export async function generateAgentPlan(
  message: string,
  onProgress?: (phase: string) => void
): Promise<AgentPlan> {
  onProgress?.("routing");
  const baseline = deterministicAgentPlan(message);

  // 1. Greeting Bypass
  if (baseline.intent === "greeting") {
    console.log("WokAI Conductor: Greeting detected. Bypassing LLM planning loop.");
    return baseline;
  }

  let conversationReply = baseline.response;
  let parsedPlan: Partial<AgentPlan> = {};

  onProgress?.("agent1");
  // 2. OpenRouter Integration
  if (process.env.OPENROUTER_API_KEY) {
    // Model 1: Conversational Reply Generation (Lightweight)
    const replyModels = [
      "meta-llama/llama-3.2-3b-instruct:free",
      "liquid/lfm-2.5-1.2b-thinking:free",
      "openrouter/free"
    ];

    for (const model of replyModels) {
      try {
        console.log(`WokAI Conductor: Requesting conversational reply from ${model}`);
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://wokai.app",
            "X-Title": "WokAI OS"
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content: "You are WokAI, a friendly AI operating system assistant. Generate a natural, helpful, conversational response to the user's message. Keep it to max 2 sentences. Do not mention technical tools, actions, JSON, or plans."
              },
              {
                role: "user",
                content: message
              }
            ]
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.choices && data.choices[0] && data.choices[0].message) {
            conversationReply = data.choices[0].message.content.trim();
            console.log("WokAI Conductor: Successfully generated reply via model:", model);
            break;
          }
        }
      } catch (err) {
        console.warn(`WokAI Conductor: Reply generation failed for model ${model}:`, err);
      }
    }

    onProgress?.("agent2");
    // Model 2: Strict JSON Action Planner (High-Capability)
    const plannerModels = Array.from(new Set([
      process.env.OPENROUTER_MODEL,
      ...OPENROUTER_MODELS_POOL
    ].filter(Boolean) as string[]));

    const plannerPrompt = `
You are the WokAI Conductor, the backend planning engine of WokAI OS.
Analyze the user's message and generate a structured JSON object representing the action plan to execute.

You MUST choose tools from this strict allowed list:
- "gmail.summarize": Summarizes the user's Gmail inbox. Use when the user asks to read, check, or summarize emails/inbox.
- "calendar.createEvent": Schedules meetings/events on Google Calendar. Use when the user asks to schedule, book, or block time.
- "devices.terminal": Executes shell commands on the user's local host machine. Use when the user asks to run commands, CLI scripts, directory listings (ls, dir), or terminal execution.
- "browser.plan": Automates web form fills and submissions. Use when the user asks to automate browser work (e.g. apply to internships, fill out forms).
- "memory.retain": Saves personal preferences or habits.

Security status guidelines:
- Sensitive actions ("devices.terminal", "gmail.summarize", "calendar.createEvent", "browser.plan") must have "sensitive: true" and "status: 'NEEDS_APPROVAL'".
- All action objects must have the keys: "id" (format: "action-[random]"), "tool", "label" (detailed description of what will be done), "status", "sensitive", and "createdAt" (ISO string).

Return ONLY a raw JSON block matching this format (do NOT wrap it in markdown codeblocks):
{
  "intent": "work_completion" | "daily_planning",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "reasoning": ["step-by-step logic detailing why these actions were chosen"],
  "plan": ["friendly summary of the steps to execute"],
  "actions": [
    {
      "id": "action-12345",
      "tool": "gmail.summarize",
      "label": "Summarize inbox and find chemistry lab info",
      "status": "NEEDS_APPROVAL",
      "sensitive": true,
      "createdAt": "2026-06-25T10:00:00.000Z"
    }
  ],
  "suggestedTasks": [
    {
      "id": "task-12345",
      "title": "Chemistry lab rescue preparation",
      "description": "Created from user prompt to handle chemistry sprint",
      "deadline": "2026-06-26T10:00:00.000Z",
      "priority": "HIGH",
      "status": "todo",
      "progress": 0,
      "subtasks": ["Check chemistry emails", "Schedule slot", "Execute lab report outline"],
      "source": "chat"
    }
  ]
}

User Message: "${message}"
`;

    for (const model of plannerModels) {
      try {
        console.log(`WokAI Conductor: Requesting technical plan from planner model ${model}`);
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://wokai.app",
            "X-Title": "WokAI OS"
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "user",
                content: plannerPrompt
              }
            ]
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.choices && data.choices[0] && data.choices[0].message) {
            let text = data.choices[0].message.content.trim();
            text = text.replace(/```json|```/g, "").trim();
            parsedPlan = JSON.parse(text) as Partial<AgentPlan>;
            console.log(`WokAI Conductor: Successfully generated plan via model: ${model}`);
            break;
          }
        } else {
          const errText = await res.text().catch(() => "");
          console.warn(`WokAI Conductor: Planner model ${model} failed with status ${res.status}: ${errText}`);
        }
      } catch (err) {
        console.error(`WokAI Conductor: Plan generation failed for model ${model}:`, err);
      }
    }
  }

  onProgress?.("agent3");
  // 3. Gemini Fallback (if OpenRouter fails or is unconfigured)
  if (Object.keys(parsedPlan).length === 0 && process.env.GEMINI_API_KEY) {
    try {
      console.log("WokAI Conductor: Falling back to Gemini for plan generation.");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-1.5-flash"
      });

      const promptText = `
You are the WokAI Conductor. Return strict JSON ONLY for:
${message}
Choose from tools: "gmail.summarize", "calendar.createEvent", "devices.terminal", "browser.plan".
Schema:
{
  "intent": "work_completion",
  "riskLevel": "LOW",
  "reasoning": string[],
  "plan": string[],
  "actions": Array<{ id: string, tool: string, label: string, status: "NEEDS_APPROVAL", sensitive: true, createdAt: string }>,
  "suggestedTasks": Array<{ id: string, title: string, description: string, deadline: string, priority: string, status: "todo", progress: 0, subtasks: string[], source: "chat" }>
}
`;
      const result = await model.generateContent(promptText);
      const text = result.response.text().replace(/```json|```/g, "").trim();
      parsedPlan = JSON.parse(text) as Partial<AgentPlan>;
    } catch (err) {
      console.error("WokAI Conductor: Gemini fallback failed:", err);
    }
  }

  onProgress?.("api");
  // 4. Merge Logic (use LLM outputs directly if successful, fallback to baseline only on full failure)
  const llmSucceeded = Object.keys(parsedPlan).length > 0;

  const mergedActions = llmSucceeded
    ? (parsedPlan.actions || [])
    : baseline.actions;

  const mergedTasks = llmSucceeded
    ? (parsedPlan.suggestedTasks || [])
    : baseline.suggestedTasks;

  const mergedMemories = llmSucceeded
    ? (parsedPlan.memoryWrites || [])
    : baseline.memoryWrites;

  return {
    ...baseline,
    ...parsedPlan,
    response: conversationReply,
    actions: mergedActions,
    suggestedTasks: mergedTasks,
    memoryWrites: mergedMemories,
    riskLevel: parsedPlan.riskLevel || baseline.riskLevel,
    needsApproval: mergedActions.some((a) => a.status === "NEEDS_APPROVAL")
  } satisfies AgentPlan;
}
