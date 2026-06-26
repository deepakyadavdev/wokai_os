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
    if (/send|write|mail to/i.test(lower)) {
      const toMatch = lower.match(/to\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) || lower.match(/to\s+(\S+)/i);
      const recipient = toMatch ? toMatch[1] : "recipient@gmail.com";
      const bodyMatch = message.match(/about\s+(.+)/i) || message.match(/saying\s+(.+)/i) || message.match(/body\s+(.+)/i);
      const bodyText = bodyMatch ? bodyMatch[1] : "Chemistry Assignment is completed";
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

  if (/meeting|schedule|calendar|rahul/.test(lower)) {
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
    const fileName = fileMatch ? fileMatch[1] : "Chemistry Assignment Notes";
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

async function generateAgent4Content(
  message: string,
  actions: WokaiAction[],
  geminiKey?: string,
  googleToken?: string
): Promise<Array<{ id: string; content: string }>> {
  const promptText = `
You are WokAI Agent 4 (Content Generator). Your job is to generate the precise content/payload that should be added or used when executing each tool in the action plan.
For each action, you must generate the detailed content based on the user's request:
- For "docs.create": Write the actual full text content of the document (use proper markdown headings like "# Heading", introduction, sections, bullet points, etc. to make it a complete draft).
- For "gmail.send": Write the actual full email body to be sent.
- For "gmail.search": Write the raw search query string.
- For "gmail.summarize": Write specific instructions on what to summarize.
- For "calendar.createEvent": Write a descriptive explanation/agenda for the event.
- For "calendar.listEvents": Write the search/filter query.
- For "calendar.deleteEvent": Write the details of the event to target.
- For "sheets.createTracker": Write a CSV-like representation of the initial rows and columns (e.g. Header1,Header2\\nValue1,Value2).
- For "slides.createDeck": Write a detailed slide-by-slide outline structure.
- For "devices.terminal": Write the exact terminal command(s) to run.
- For "devices.openApp": Write the target application or details.
- For "devices.fileAccess": Write the search pattern or directory path.
- For "calls.prepare": Write the exact phone script.
- For "browser.plan": Write the specific automation steps.
- For "search.google": Write the query to search.
- For "maps.getDirections": Write the origin and destination details.
- For any other tool: Write appropriate content.

User Request: "${message}"
Current Action Plan: ${JSON.stringify(actions)}

Return strict JSON ONLY. Do NOT wrap it in markdown codeblocks. The output must be a JSON array of objects, where each object has "id" and "content" fields:
[
  { "id": "action-xxx", "content": "..." }
]
`;

  let responseText = "";

  if (geminiKey) {
    try {
      console.log("Agent 4: Requesting content generation via primary Gemini API Key.");
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-1.5-flash"
      });
      const result = await model.generateContent(promptText);
      responseText = result.response.text();
    } catch (err) {
      console.error("Agent 4: Primary Gemini API Key failed:", err);
    }
  }

  if (!responseText && googleToken) {
    try {
      console.log("Agent 4: Requesting content generation via primary Gemini OAuth.");
      const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${googleToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        })
      });
      if (res.ok) {
        const data = await res.json();
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
    } catch (err) {
      console.error("Agent 4: Primary Gemini OAuth failed:", err);
    }
  }

  if (!responseText && process.env.OPENROUTER_API_KEY) {
    try {
      console.log("Agent 4: Requesting content generation via OpenRouter.");
      const model = process.env.OPENROUTER_MODEL || "qwen/qwen3-coder:free";
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
          messages: [{ role: "user", content: promptText }]
        })
      });
      if (res.ok) {
        const data = await res.json();
        responseText = data.choices?.[0]?.message?.content || "";
      }
    } catch (err) {
      console.error("Agent 4: OpenRouter failed:", err);
    }
  }

  if (responseText) {
    try {
      const cleanJson = responseText.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanJson) as Array<{ id: string; content: string }>;
    } catch (err) {
      console.error("Agent 4: Failed to parse generated content JSON:", err);
    }
  }

  return [];
}

export async function generateAgentPlan(
  message: string,
  onProgress?: (phase: string) => void,
  googleToken?: string
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

  // 2. Primary Choice: Gemini API (API key or OAuth access token)
  const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (geminiKey || googleToken) {
    const promptText = `
You are the WokAI Conductor. Return strict JSON ONLY for:
${message}

You MUST choose tools from this strict allowed list:
- "gmail.summarize": Summarize inbox, detect urgency, draft replies.
- "gmail.send": Send a fresh email to a specific recipient.
- "gmail.search": Search Gmail messages using filters.
- "calendar.findSlots": Find free time slots.
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

Security: Sensitive actions must have "sensitive": true, "status": "NEEDS_APPROVAL".
All action objects must have keys: "id", "tool", "label", "status", "sensitive", "createdAt".

If the user message is a simple greeting or capability question with no actionable request, return:
{ "intent": "greeting", "response": "friendly greeting", "riskLevel": "LOW", "reasoning": [], "plan": [], "actions": [], "suggestedTasks": [] }

Otherwise return:
{
  "intent": "work_completion",
  "response": "friendly conversational response to the user's message (max 2 sentences, natural and helpful)",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "reasoning": string[],
  "plan": string[],
  "actions": Array<{ id: string, tool: string, label: string, status: string, sensitive: boolean, createdAt: string }>,
  "suggestedTasks": Array<{ id: string, title: string, description: string, deadline: string, priority: string, status: "todo", progress: 0, subtasks: string[], source: "chat" }>
}
`;

    if (geminiKey) {
      onProgress?.("agent3");
      try {
        console.log("WokAI Conductor: Requesting plan from primary Gemini API (via API Key).");
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
          model: process.env.GEMINI_MODEL || "gemini-1.5-flash"
        });
        const result = await model.generateContent(promptText);
        const text = result.response.text().replace(/```json|```/g, "").trim();
        parsedPlan = JSON.parse(text) as Partial<AgentPlan>;
        if (parsedPlan.response) {
          conversationReply = parsedPlan.response;
        }
        console.log("WokAI Conductor: Successfully generated plan via primary Gemini API Key.");
      } catch (err) {
        console.error("WokAI Conductor: Primary Gemini API Key failed:", err);
      }
    }

    if (Object.keys(parsedPlan).length === 0 && googleToken) {
      onProgress?.("agent3");
      try {
        console.log("WokAI Conductor: Requesting plan from primary Gemini API (via OAuth token).");
        const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${googleToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
          })
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/```json|```/g, "").trim();
          if (text) {
            parsedPlan = JSON.parse(text) as Partial<AgentPlan>;
            if (parsedPlan.response) {
              conversationReply = parsedPlan.response;
            }
            console.log("WokAI Conductor: Successfully generated plan via Gemini OAuth.");
          }
        } else {
          const errText = await res.text().catch(() => "");
          console.warn(`WokAI Conductor: Primary Gemini OAuth failed with status ${res.status}: ${errText}`);
        }
      } catch (err) {
        console.error("WokAI Conductor: Primary Gemini OAuth failed:", err);
      }
    }
  }

  // 3. Fallback Choice: OpenRouter Integration (only if Gemini failed or is unconfigured)
  if (Object.keys(parsedPlan).length === 0 && process.env.OPENROUTER_API_KEY) {
    onProgress?.("agent1");
    // Model 1: Conversational Reply Generation (Lightweight)
    const replyModels = [
      "meta-llama/llama-3.2-3b-instruct:free",
      "liquid/lfm-2.5-1.2b-thinking:free",
      "openrouter/free"
    ];

    for (const model of replyModels) {
      try {
        console.log(`WokAI Conductor: Requesting fallback conversational reply from OpenRouter model ${model}`);
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
            console.log("WokAI Conductor: Successfully generated fallback reply via model:", model);
            break;
          }
        }
      } catch (err) {
        console.warn(`WokAI Conductor: Fallback reply generation failed for model ${model}:`, err);
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
- "gmail.send": Sends a fresh email to a specific recipient. Use when the user asks to send an email, write an email, or notify someone.
- "gmail.search": Searches Gmail messages using specific query filters (e.g. from:sender, is:unread, subject:abc). Use when the user asks to find, filter or search specific emails.
- "calendar.createEvent": Schedules meetings/events on Google Calendar. Use when the user asks to schedule, book, or block time.
- "calendar.listEvents": Lists upcoming calendar events. Use when user wants to see what is on their schedule or calendar.
- "calendar.deleteEvent": Cancels/deletes an event on Google Calendar. Use when the user asks to cancel, remove, or delete a calendar meeting/event.
- "drive.search": Searches Drive for files. Use when the user asks to locate, search, or find files in Google Drive.
- "docs.create": Creates a Google Doc. Use when the user asks to create a document, draft a report, or write notes.
- "sheets.createTracker": Creates a Google Sheet. Use when the user asks to create a tracker sheet or budget spreadsheet.
- "slides.createDeck": Creates a Google Slides presentation. Use when the user asks to create a slide deck or outline.
- "devices.openApp": Launches an application (like "chrome", "vs code", "terminal") on the user's host machine. Use when the user asks to open or run an application.
- "devices.terminal": Executes shell commands on the user's local host machine. Use when the user asks to run commands, CLI scripts, directory listings (ls, dir), or terminal execution.
- "devices.fileAccess": Indexes/finds local files on the user's desktop directories. Use when the user asks to scan, find, or search local files.
- "browser.plan": Automates web form fills and submissions. Use when the user asks to automate browser work (e.g. apply to internships, fill out forms).
- "maps.searchPlaces": Searches Google Places for nearby locations or addresses. Use when the user asks to locate, search, or find a place or address.
- "maps.getDirections": Calculates travel time and directions between locations. Use when the user asks for directions, travel times, or route distance.
- "search.google": Performs a web search using Google Search. Use when the user asks to search the web, lookup search results, or search Google.
- "memory.retain": Saves personal preferences or habits.

Security status guidelines:
- Sensitive actions ("devices.terminal", "gmail.summarize", "gmail.send", "gmail.search", "calendar.createEvent", "calendar.listEvents", "calendar.deleteEvent", "docs.create", "sheets.createTracker", "slides.createDeck", "browser.plan", "devices.openApp") must have "sensitive: true" and "status: 'NEEDS_APPROVAL'".
- All action objects must have the keys: "id" (format: "action-[random]"), "tool", "label" (detailed description of what will be done), "status", "sensitive", and "createdAt" (ISO string).

CRITICAL CONVERSATIONAL QUERY RULE:
If the user message is just a simple greeting ("hello", "hey", "hi"), a conversational check ("are you there?", "how are you"), or a general question about your capabilities without requesting an action, you MUST return empty arrays for "actions" and "suggestedTasks" (e.g. "actions": [], "suggestedTasks": []), set "intent" to "greeting", and set "response" to a friendly conversational reply. DO NOT return placeholder actions or tasks under any circumstances.

Return ONLY a raw JSON block matching this format (do NOT wrap it in markdown codeblocks):
{
  "intent": "work_completion" | "daily_planning" | "greeting",
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
}

User Message: "${message}"
`;

    for (const model of plannerModels) {
      try {
        console.log(`WokAI Conductor: Requesting technical plan from fallback planner model ${model}`);
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
            console.log(`WokAI Conductor: Successfully generated plan via fallback model: ${model}`);
            break;
          }
        } else {
          const errText = await res.text().catch(() => "");
          console.warn(`WokAI Conductor: Fallback planner model ${model} failed with status ${res.status}: ${errText}`);
        }
      } catch (err) {
        console.error(`WokAI Conductor: Fallback plan generation failed for model ${model}:`, err);
      }
    }
  }

  // 4. Merge Logic (use LLM outputs directly if successful, fallback to baseline only on full failure)
  const llmSucceeded = Object.keys(parsedPlan).length > 0;

  let mergedActions = llmSucceeded
    ? (parsedPlan.actions || [])
    : baseline.actions;

  const mergedTasks = llmSucceeded
    ? (parsedPlan.suggestedTasks || [])
    : baseline.suggestedTasks;

  const mergedMemories = [
    ...baseline.memoryWrites,
    ...(parsedPlan.memoryWrites || [])
  ];

  // 5. Agent 4: Generate Content
  if (mergedActions.length > 0) {
    onProgress?.("agent4");
    try {
      const actionContents = await generateAgent4Content(message, mergedActions, geminiKey, googleToken);
      mergedActions = mergedActions.map(action => {
        const found = actionContents.find((ac) => ac.id === action.id);
        return found ? { ...action, content: found.content } : action;
      });
    } catch (err) {
      console.error("WokAI Conductor: Agent 4 content generation failed:", err);
    }
  }

  if (mergedActions.length > 0) {
    onProgress?.("api");
  }

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
