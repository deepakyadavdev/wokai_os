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
  const title = /project|presentation/i.test(message)
    ? "Project delivery rescue"
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

  const hasTaskKeywords = /email|inbox|gmail|reply|meeting|schedule|calendar|file|drive|notes|docs|sheet|slides|pitch|deck|call|phone|browser|apply|internship|website|form|device|laptop|tablet|terminal|run|exec|cmd|ls|dir|scan|due|assignment|project|bill|deadline|rescue/i.test(cleanLower);

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
    if (/send|write|mail to/i.test(lower)) {
      const toMatch = lower.match(/to\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) || lower.match(/to\s+(\S+)/i);
      const recipient = toMatch ? toMatch[1] : "recipient@gmail.com";
      const bodyMatch = message.match(/about\s+(.+)/i) || message.match(/saying\s+(.+)/i) || message.match(/body\s+(.+)/i);
      const bodyText = bodyMatch ? bodyMatch[1] : "Drafting email content";
      actions.push(makeAction("gmail.send", `Send email to ${recipient} about ${bodyText}`));
      plan.push("Construct email draft", "Verify recipient details", "Send email after approval");
    } else if (/search|find|filter/i.test(lower)) {
      const forMatch = message.match(/(?:search|find|for|query)\s+['"]?([^'"]+)['"]?/i);
      const searchTerm = forMatch ? forMatch[1] : "urgent";
      actions.push(makeAction("gmail.search", `Search emails for ${searchTerm}`));
      plan.push("Query Gmail messages with filter", "Summarize matching threads");
    } else {
      actions.push(makeAction("gmail.summarize", "Prepare inbox summary and draft replies"));
      plan.push("Scan urgent threads", "Extract deadlines and commitments", "Draft replies for approval");
    }
  }

  if (/meeting|schedule|calendar/.test(lower)) {
    if (/cancel|delete|remove/i.test(lower)) {
      actions.push(makeAction("calendar.deleteEvent", `Delete meeting: ${message}`));
      plan.push("Find target event", "Delete event after approval");
    } else if (/show|list|check/i.test(lower)) {
      actions.push(makeAction("calendar.listEvents", "List upcoming calendar events"));
      plan.push("Fetch calendar agenda");
    } else {
      const nameMatch = message.match(/named\s+['"]?([^'"]+)['"]?/i) || message.match(/event\s+['"]?([^'"]+)['"]?/i) || message.match(/meeting\s+['"]?([^'"]+)['"]?/i);
      const eventName = nameMatch ? nameMatch[1] : "Project Sync";
      const isTomorrow = /tomorrow/i.test(lower);
      const timeMatch = message.match(/at\s+(\d+)(?::(\d+))?\s*(pm|am)?/i) || message.match(/from\s+(\d+)(?::(\d+))?\s*(pm|am)?/i);
      let timeText = "";
      if (timeMatch) {
        timeText = ` at ${timeMatch[1]}${timeMatch[2] ? `:${timeMatch[2]}` : ""}${timeMatch[3] ? ` ${timeMatch[3]}` : ""}`;
      }
      const dayText = isTomorrow ? " tomorrow" : " today";
      
      actions.push(makeAction("contacts.search", "Find contact details"));
      actions.push(makeAction("calendar.findSlots", "Find conflict-free meeting slots"));
      actions.push(makeAction("calendar.createEvent", `Create event: meeting with ${eventName}${dayText}${timeText}`));
      plan.push("Find attendee", "Check calendar availability", "Propose best slot", "Create event after approval");
    }
  }

  if (/file|drive|notes|docs|sheet|slides|pitch|deck/.test(lower)) {
    const fileMatch = message.match(/(?:named|titled|for|file)\s+['"]?([^'"]+)['"]?/i);
    const fileName = fileMatch ? fileMatch[1] : "New Document";
    actions.push(makeAction("drive.search", `Search files for ${fileName}`));
    if (/doc|assignment|notes/.test(lower)) actions.push(makeAction("docs.create", `Create document named ${fileName}`));
    if (/sheet|tracker|budget/.test(lower)) actions.push(makeAction("sheets.createTracker", `Create sheet named ${fileName}`));
    if (/slide|pitch|deck|presentation/.test(lower)) actions.push(makeAction("slides.createDeck", `Create presentation named ${fileName}`));
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

  if (/search .* on google|google search|search web|find on web/i.test(lower)) {
    actions.push(makeAction("search.google", `Google search: ${message}`));
    plan.push("Query Google Search API", "Format search results");
  }

  if (/directions|route|maps|how to go/i.test(lower)) {
    actions.push(makeAction("maps.getDirections", `Calculate directions: ${message}`));
    plan.push("Calculate route", "Fetch transit duration");
  } else if (/places|find near|locate places/i.test(lower)) {
    actions.push(makeAction("maps.searchPlaces", `Search places: ${message}`));
    plan.push("Search Google Places");
  }

  if (/device|laptop|phone|tablet|open .* on|terminal|run |exec |cmd|ls |dir |scan |find file/.test(lower)) {
    if (/open\s+(chrome|browser|vscode|vs code|terminal|powershell|cmd)/i.test(lower)) {
      const appMatch = lower.match(/open\s+(chrome|browser|vscode|vs code|terminal|powershell|cmd)/i);
      const app = appMatch ? appMatch[1] : "browser";
      actions.push(makeAction("devices.openApp", `Open ${app} on host device`));
      plan.push("Request host process execution", `Launch ${app} on desktop`);
    } else if (/terminal|run |exec |cmd|ls |dir /i.test(lower)) {
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

async function callLLM(
  prompt: string,
  systemPrompt?: string,
  preferredModel?: string
): Promise<string> {
  const apiKey = process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY;
  let baseUrl = (process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1/chat/completions").trim();
  
  if (baseUrl && !/^https?:\/\//i.test(baseUrl)) {
    baseUrl = `https://${baseUrl}`;
  }

  if (baseUrl && !baseUrl.endsWith("/chat/completions")) {
    const normalized = baseUrl.replace(/\/$/, "");
    baseUrl = `${normalized}/chat/completions`;
  }

  const model = process.env.LLM_MODEL || preferredModel || "meta-llama/llama-3.3-70b-instruct:free";

  if (!apiKey) {
    console.warn("[WokAI Conductor] LLM API key missing. Returning mock response.");
    if (prompt.includes("approved")) {
      return JSON.stringify({ approved: true, feedback: "", refinedPrompt: "" });
    }
    if (prompt.includes("actions")) {
      return JSON.stringify({
        riskLevel: "LOW",
        reasoning: ["No API key available, using safe deterministic fallback"],
        plan: ["Execute default local task rescue"],
        actions: [],
        suggestedTasks: []
      });
    }
    return "No API key configured. I will outline the required steps and run them locally.";
  }

  try {
    console.log(`[WokAI Conductor] Calling LLM API: ${baseUrl} with model: ${model}`);
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const headers: Record<string, string> = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    if (baseUrl.includes("openrouter.ai")) {
      headers["HTTP-Referer"] = "https://wokai.app";
      headers["X-Title"] = "WokAI OS";
    }

    const res = await fetch(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        stream: true
      })
    });

    if (res.ok) {
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed === "data: [DONE]") continue;
            if (trimmed.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(trimmed.substring(6));
                const text = parsed.choices?.[0]?.delta?.content;
                if (text) {
                  fullContent += text;
                }
              } catch (err) {
                // Ignore parse errors on partial streams
              }
            }
          }
        }

        if (buffer && buffer.startsWith("data: ") && buffer !== "data: [DONE]") {
          try {
            const parsed = JSON.parse(buffer.substring(6));
            const text = parsed.choices?.[0]?.delta?.content;
            if (text) {
              fullContent += text;
            }
          } catch (err) {
            // Ignore
          }
        }

        if (fullContent.trim()) {
          return fullContent.trim();
        }
      }

      // Fallback: If streaming body was unavailable, try standard non-stream parse
      const data = await res.json().catch(() => null);
      if (data && data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content.trim();
      }
    }
    const errText = await res.text().catch(() => "");
    throw new Error(`Status ${res.status}: ${errText}`);
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[WokAI Conductor] LLM API exception for model ${model}:`, err);
    throw new Error(`LLM API failed to respond: ${errorMsg}`);
  }
}

async function runAgentA(userPrompt: string): Promise<string> {
  const systemPrompt = `You are WokAI Agent A (Human Worker Thinker).
Your job is to think like a human worker hired by the user. When the user gives you a request or tells you to do something, think of all the things a real human could do to accomplish it, without any tool limitations.
Create a detailed, step-by-step list of all the tasks you will perform, explaining line by line how you will complete each task. Speak in the first person ("I will...") and sound extremely proactive, competent, and thorough. Make it realistic and actionable.`;

  return await callLLM(userPrompt, systemPrompt, "meta-llama/llama-3.3-70b-instruct:free");
}

async function runAgentB(agentAOutput: string): Promise<string> {
  const systemPrompt = `You are WokAI Agent B (Tool Mapper and Adaptor).
Your job is to compare and match the steps/tasks planned by Agent A with our available tools.
Here is the strict list of allowed tools we have:
- "gmail.summarize": Summarize inbox, detect urgency, draft replies.
- "gmail.send": Send a fresh email to a specific recipient.
- "gmail.search": Search Gmail messages using filters.
- "calendar.createEvent": Schedule a meeting or event.
- "calendar.listEvents": List upcoming calendar events.
- "calendar.deleteEvent": Cancel or delete a calendar event.
- "drive.search": Search Drive for files.
- "docs.create": Create a Google Doc.
- "sheets.createTracker": Create a Google Sheet tracker.
- "slides.createDeck": Create a Google Slides deck.
- "contacts.search": Find contact email or phone.
- "calls.prepare": Prepare a phone call script.
- "browser.plan": Plan browser automation with approval pause.
- "devices.openApp": Launch an application on host device.
- "devices.terminal": Execute a shell command on host.
- "devices.fileAccess": Scan local directories for files.
- "devices.queueCommand": Queue a command for an offline device.
- "maps.searchPlaces": Search Google Places for locations.
- "maps.getDirections": Calculate directions and travel time.
- "maps.estimateTravel": Estimate travel buffer for meetings.
- "search.google": Search the web using Google Search.
- "notifications.create": Create an in-app alert.
- "memory.retain": Save personal preferences.

For each step in Agent A's output:
1. Identify if we have a matching tool. E.g., if Agent A says "I will draft a docs file", identify: "Yes, we can make it, we have a tool like this: docs.create".
2. If there is no exact matching tool, replace that step with the best solution and tool we have (for example, if Agent A says "I will draw a logo", replace it with using search.google or a browser.plan to find a generator, or devices.terminal to run an image generation script).
Provide the matching and adaptation as a clear list of matched/adapted steps with their assigned tools.`;

  return await callLLM(agentAOutput, systemPrompt, "qwen/qwen3-coder:free");
}

async function runAgent1(agentAOutput: string, userPrompt: string): Promise<string> {
  const systemPrompt = `You are WokAI Agent 1 (Worthful Conversational Responder).
Your job is to generate a natural, helpful, and extremely professional conversational response to the user.
You must construct this reply based on the plan/thinking of Agent A. Explain the steps that will be taken to fulfill their request so it looks highly worthful, detailed, and clear.
Avoid mentioning internal variables, technical JSON formats, or backend tool names (like "gmail.send" or "Agent B"), but describe the actions (e.g. "I will search your Google Drive, draft the project proposal, and queue an email draft for your review").
Keep it to 2-3 engaging, professional, and reassuring sentences.`;

  const prompt = `User's prompt: "${userPrompt}"\n\nAgent A's thinking/tasks:\n${agentAOutput}`;
  return await callLLM(prompt, systemPrompt, "meta-llama/llama-3.2-3b-instruct:free");
}

async function runAgent2(agentBOutput: string, userPrompt: string): Promise<Partial<AgentPlan>> {
  const systemPrompt = `You are WokAI Agent 2 (Structured Plan Generator).
Your job is to translate the tool-mapped steps from Agent B into a structured JSON plan containing the exact WokAI Action objects and Suggested Tasks.
You MUST choose tools from this strict allowed list:
- "gmail.summarize": Summarize inbox, detect urgency, draft replies.
- "gmail.send": Send a fresh email to a specific recipient.
- "gmail.search": Search Gmail messages using filters.
- "calendar.createEvent": Schedule a meeting or event.
- "calendar.listEvents": List upcoming calendar events.
- "calendar.deleteEvent": Cancel or delete a calendar event.
- "drive.search": Search Drive for files.
- "docs.create": Create a Google Doc.
- "sheets.createTracker": Create a Google Sheet tracker.
- "slides.createDeck": Create a Google Slides deck.
- "contacts.search": Find contact email or phone.
- "calls.prepare": Prepare a phone call script.
- "browser.plan": Plan browser automation with approval pause.
- "devices.openApp": Launch an application on host device.
- "devices.terminal": Execute a shell command on host.
- "devices.fileAccess": Scan local directories for files.
- "devices.queueCommand": Queue a command for an offline device.
- "maps.searchPlaces": Search Google Places for locations.
- "maps.getDirections": Calculate directions and travel time.
- "maps.estimateTravel": Estimate travel buffer for meetings.
- "search.google": Search the web using Google Search.
- "notifications.create": Create an in-app alert.
- "memory.retain": Save personal preferences.

Security Guidelines:
- Sensitive actions ("devices.terminal", "gmail.summarize", "gmail.send", "gmail.search", "calendar.createEvent", "calendar.listEvents", "calendar.deleteEvent", "docs.create", "sheets.createTracker", "slides.createDeck", "browser.plan", "devices.openApp") must have "sensitive": true, and "status": "NEEDS_APPROVAL".
- All action objects must have the keys: "id" (format: "action-[random]"), "tool", "label" (detailed description of what will be done), "status", "sensitive", and "createdAt" (ISO string).

Return ONLY a strict raw JSON block matching this format (no markdown formatting, no codeblocks):
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "reasoning": ["step-by-step logic detailing why these actions were chosen"],
  "plan": ["friendly summary of the steps to execute"],
  "actions": [
    {
      "id": "action-12345",
      "tool": "gmail.summarize",
      "label": "Summarize inbox to extract key deadlines",
      "status": "NEEDS_APPROVAL",
      "sensitive": true,
      "createdAt": "2026-06-25T10:00:00.000Z"
    }
  ],
  "suggestedTasks": [
    {
      "id": "task-12345",
      "title": "Inbox review",
      "description": "Created from user prompt to handle email backlog",
      "deadline": "2026-06-26T10:00:00.000Z",
      "priority": "HIGH",
      "status": "todo",
      "progress": 0,
      "subtasks": ["Check messages", "List followups"],
      "source": "chat"
    }
  ]
}`;

  const prompt = `User prompt: "${userPrompt}"\n\nAgent B's tool mapping:\n${agentBOutput}`;
  try {
    const response = await callLLM(prompt, systemPrompt, "qwen/qwen3-coder:free");
    const cleanJson = response.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson) as Partial<AgentPlan>;
  } catch (err) {
    console.error("[WokAI Conductor] Agent 2 parse error:", err);
    return {};
  }
}

async function runAgent4(
  userPrompt: string,
  agent1Output: string,
  actions: WokaiAction[]
): Promise<Array<{ id: string; title: string; content: string }>> {
  const systemPrompt = `You are WokAI Agent 4 (Content Generator).
Your job is to generate BOTH:
1. A precise, dynamic "title" (the name/title of the document, sheet, presentation, email subject, calendar event, or terminal command description).
2. The detailed "content" (payload/body/script) to be used when executing the action.

You MUST suggest appropriate titles and contents depending on the tool:
- For "docs.create": "title" is the name of the document, and "content" is the full document text draft in markdown (with proper headings).
- For "sheets.createTracker": "title" is the name of the tracker sheet, and "content" is the CSV-like rows/columns text.
- For "slides.createDeck": "title" is the topic/presentation title, and "content" is the slide-by-slide outline.
- For "gmail.send": "title" is the email subject, and "content" is the full email body.
- For "calendar.createEvent": "title" is the event title/summary, and "content" is the detailed description/agenda.
- For "devices.terminal": "title" is a short description of the command, and "content" is the exact terminal command line.
- For all other tools: "title" is a descriptive name, and "content" is the instruction details.

You must align the contents with Agent 1's conversational response so it matches exactly what was promised.

Return strict JSON ONLY. Do NOT wrap it in markdown codeblocks. The output must be a JSON array of objects:
[
  { "id": "action-xxx", "title": "...", "content": "..." }
]`;

  const prompt = `User prompt: "${userPrompt}"\n\nAgent 1's conversational response:\n"${agent1Output}"\n\nActions plan:\n${JSON.stringify(actions)}`;
  try {
    const response = await callLLM(prompt, systemPrompt, "qwen/qwen3-coder:free");
    const cleanJson = response.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson) as Array<{ id: string; title: string; content: string }>;
  } catch (err) {
    console.error("[WokAI Conductor] Agent 4 parse error:", err);
    return [];
  }
}

async function runAgent3(
  actionsFromAgent2: WokaiAction[],
  contentFromAgent4: Array<{ id: string; title: string; content: string }>
): Promise<WokaiAction[]> {
  const systemPrompt = `You are WokAI Agent 3 (API Handler).
Your job is to prepare the final actions list for execution. You will receive the planned actions from Agent 2 and the content payloads generated by Agent 4.
Combine them by injecting the content and title from Agent 4 into the corresponding action objects. Ensure the parameters are syntactically valid and well-formatted for our API layers.
Return the final array of WokaiAction objects as strict JSON. Do NOT wrap it in markdown codeblocks.`;

  const prompt = `Actions from Agent 2:\n${JSON.stringify(actionsFromAgent2)}\n\nContent from Agent 4:\n${JSON.stringify(contentFromAgent4)}`;
  try {
    const response = await callLLM(prompt, systemPrompt, "qwen/qwen3-coder:free");
    const cleanJson = response.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson) as WokaiAction[];
  } catch (err) {
    console.error("[WokAI Conductor] Agent 3 parse error:", err);
    return actionsFromAgent2.map((action, idx) => {
      const found = contentFromAgent4.find((ac) => ac.id === action.id) || contentFromAgent4[idx];
      return found ? { ...action, content: found.content, title: found.title } : action;
    });
  }
}

async function runAgentHashPlanSummary(
  agent1Output: string,
  actions: WokaiAction[]
): Promise<string> {
  const systemPrompt = `You are WokAI Agent # (Plan Summarizer).
Your job is to describe all the steps to be completed for doing the user's task.
Match the reply given by Agent 1 with the actions we are planning to execute, and write a concise, professional, and friendly summary of the actual execution steps we will take.
Write ONLY the final response. Max 2-3 sentences. Do not mention technical terms like "JSON", "agent #", or internal tool names unless natural (e.g. "I will draft a Google Doc").`;

  const prompt = `Agent 1's reply: "${agent1Output}"\n\nPlanned Actions: ${JSON.stringify(actions)}`;
  try {
    return await callLLM(prompt, systemPrompt, "meta-llama/llama-3.2-3b-instruct:free");
  } catch (err) {
    console.error("[WokAI Conductor] Agent # plan summary error:", err);
    return `I have prepared a plan to execute your request. I will run the required tools like ${actions.map(a => a.tool).join(", ")}.`;
  }
}

export async function generateAgentHashExecutionSummary(
  tool: string,
  label: string,
  output: string,
  geminiKey?: string,
  googleToken?: string,
  agent1Output?: string
): Promise<string> {
  const promptText = `
You are WokAI Agent # (API Output Summarizer).
Your job is to look at the execution of an API tool and its raw output, and summarize the results to the user in a friendly, clear, and helpful way.
Additionally, you should match the reply given by Agent 1 with what we were actually doing and our completed tasks, describing all the steps completed.
- Executed Tool: "${tool}"
- Action Label: "${label}"
- Raw API Output: "${output}"
- Agent 1's Reply: "${agent1Output || 'None'}"

Write ONLY the final user-facing summary of what was done and what the results are, matching it with what Agent 1 said. Keep it short and readable. Do not output JSON or mention internal variable names.
`;

  try {
    return await callLLM(promptText, undefined, "meta-llama/llama-3.2-3b-instruct:free");
  } catch (err) {
    console.error("[WokAI Conductor] Agent # execution summary error:", err);
    return `Action completed. Results: ${output.slice(0, 200)}`;
  }
}

async function evaluatePlanWithAgent5(
  message: string,
  plan: AgentPlan
): Promise<{ approved: boolean; feedback?: string; refinedPrompt?: string }> {
  const promptText = `
You are WokAI Agent 5 (Quality Assurance & Evaluator Agent).
WokAI is an AI operating system companion that integrates tasks, calendar, email, drive, local files, terminal execution, phone calls, and browser automation to help users finish work efficiently.

Your job is to evaluate if the calculated WokAI Action Plan is appropriate, safe, and fully matches the user's initial request.
- The user request is: "${message}"
- The proposed plan is: ${JSON.stringify(plan)}

Inspect:
1. Are the selected actions/tools correct and relevant? (e.g., if user wants to create a doc, is docs.create planned? If user wants to send email, is gmail.send planned?)
2. Is the conversational response friendly and helpful?
3. Are there any security issues or missing steps?

Return a strict JSON object ONLY. Do NOT wrap it in markdown codeblocks. The output must contain "approved", "feedback", and "refinedPrompt":
{
  "approved": true | false,
  "feedback": "Why the plan is not approved, or empty if approved",
  "refinedPrompt": "If not approved, write a highly descriptive prompt combining the user's request and instructions to correct the action plan"
}
`;

  try {
    const text = await callLLM(promptText, undefined, "meta-llama/llama-3.3-70b-instruct:free");
    const cleanJson = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanJson);
    return {
      approved: !!parsed.approved,
      feedback: parsed.feedback || "",
      refinedPrompt: parsed.refinedPrompt || ""
    };
  } catch (err) {
    console.error("[WokAI Conductor] Agent 5 evaluation error:", err);
  }

  return { approved: true };
}

export async function generateAgentPlan(
  message: string,
  onProgress?: (phase: string) => void,
  googleToken?: string,
  pass = 1
): Promise<AgentPlan> {
  onProgress?.("routing");
  const baseline = deterministicAgentPlan(message);

  // 1. Greeting Bypass
  if (baseline.intent === "greeting") {
    console.log("WokAI Conductor: Greeting detected. Bypassing LLM planning loop.");
    return baseline;
  }

  // Phase: Agent A
  onProgress?.("agentA");
  console.log("WokAI Conductor: Invoking Agent A (Human Worker Thinker)...");
  const agentAOutput = await runAgentA(message);

  // Phase: Agent 1 and Agent B (concurrently)
  onProgress?.("agent1");
  onProgress?.("agentB");
  console.log("WokAI Conductor: Invoking Agent 1 and Agent B concurrently...");
  const [agent1Output, agentBOutput] = await Promise.all([
    runAgent1(agentAOutput, message),
    runAgentB(agentAOutput)
  ]);

  // Phase: Agent 2
  onProgress?.("agent2");
  console.log("WokAI Conductor: Invoking Agent 2 (Structured Plan Generator)...");
  const parsedPlan = await runAgent2(agentBOutput, message);
  const actions = parsedPlan.actions || [];

  let finalActions = actions;
  if (actions.length > 0) {
    // Phase: Agent 4
    onProgress?.("agent4");
    console.log("WokAI Conductor: Invoking Agent 4 (Content Generator)...");
    const contentFromAgent4 = await runAgent4(message, agent1Output, actions);

    // Phase: Agent 3
    onProgress?.("agent3");
    console.log("WokAI Conductor: Invoking Agent 3 (API Handler)...");
    finalActions = await runAgent3(actions, contentFromAgent4);
  }

  // Phase: Agent #
  onProgress?.("agent#");
  console.log("WokAI Conductor: Invoking Agent # (Plan Summarizer)...");
  let agentHashSummary = "";
  if (finalActions.length > 0) {
    agentHashSummary = await runAgentHashPlanSummary(agent1Output, finalActions);
  }

  const mergedTasks = parsedPlan.suggestedTasks || [];
  const mergedMemories = [
    ...baseline.memoryWrites,
    ...(parsedPlan.memoryWrites || [])
  ];

  // We compile the full plan.
  const currentPlan: AgentPlan = {
    intent: parsedPlan.intent || baseline.intent || "work_completion",
    riskLevel: parsedPlan.riskLevel || baseline.riskLevel,
    response: agent1Output, // Agent 1's reply goes to the user as response field
    reasoning: parsedPlan.reasoning || [],
    plan: agentHashSummary ? [agentHashSummary] : (parsedPlan.plan || []),
    actions: finalActions,
    suggestedTasks: mergedTasks,
    memoryWrites: mergedMemories,
    needsApproval: finalActions.some((a) => a.status === "NEEDS_APPROVAL")
  };

  // Phase: Agent 5 (Review and Approve)
  if (finalActions.length > 0 && pass === 1) {
    onProgress?.("agent5");
    console.log("WokAI Conductor: Invoking Agent 5 (Quality Assurance & Evaluator)...");
    const evaluation = await evaluatePlanWithAgent5(message, currentPlan);
    if (!evaluation.approved && evaluation.refinedPrompt) {
      console.log(`Agent 5: Plan rejected. Retrying with refined prompt: "${evaluation.refinedPrompt}"`);
      
      // Recursive call starting again from Agent A with the refined prompt
      const refinedPlan = await generateAgentPlan(evaluation.refinedPrompt, onProgress, googleToken, 2);
      
      onProgress?.("agent5");
      const secondEvaluation = await evaluatePlanWithAgent5(evaluation.refinedPrompt, refinedPlan);
      if (secondEvaluation.approved) {
        console.log("Agent 5: Refined action plan approved on second pass.");
        return refinedPlan;
      } else {
        console.warn("Agent 5: Refined action plan still rejected on second pass. Providing safe fallback response.");
        return {
          ...refinedPlan,
          response: "I encountered a problem creating the exact plan for your request. Please try again later.",
          actions: [],
          suggestedTasks: [],
          needsApproval: false
        };
      }
    }
  }

  if (finalActions.length > 0) {
    onProgress?.("api");
  }

  return currentPlan;
}
