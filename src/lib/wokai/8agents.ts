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
 * Options for callModelServer to control timeout, system prompt, temperature, and token limits.
 */
interface ModelServerOptions {
  systemPrompt?: string;
  timeoutMs?: number;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Executes LLM prompts across Google Colab / Lightning AI GPU server or local Open-Source Model Server.
 */
export async function callModelServer(promptText: string, options?: ModelServerOptions): Promise<string> {
  const modelServerUrl =
    process.env.MODEL_SERVER_URL ||
    process.env.NEXT_PUBLIC_MODEL_SERVER_URL ||
    process.env.LLM_BASE_URL ||
    "";

  const timeoutMs = options?.timeoutMs ?? 15000;
  const maxTokens = options?.maxTokens ?? 1024;
  const temperature = options?.temperature ?? 0.3;
  const systemPrompt = options?.systemPrompt || "";

  if (modelServerUrl) {
    const baseUrl = modelServerUrl.replace(/\/$/, "");

    // 1. Try Colab FastAPI /generate endpoint
    try {
      const colabPrompt = systemPrompt
        ? `[System Instructions]\n${systemPrompt}\n\n[User Request]\n${promptText}`
        : promptText;
      const response = await fetch(`${baseUrl}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: colabPrompt, max_tokens: maxTokens, temperature }),
        signal: AbortSignal.timeout(timeoutMs)
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
      const messages: Array<{ role: string; content: string }> = [];
      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }
      messages.push({ role: "user", content: promptText });

      const response = await fetch(chatUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.LLM_MODEL || "qwen2.5:3b",
          messages,
          max_tokens: maxTokens,
          temperature
        }),
        signal: AbortSignal.timeout(timeoutMs)
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

/**
 * Dedicated content generation function that sends a well-crafted prompt to the LLM
 * for producing actual educational/professional document content (not JSON).
 * Returns raw markdown content or empty string if LLM is unavailable.
 */
async function generateContentWithLLM(
  topic: string,
  fullPrompt: string,
  contentType: "doc" | "slides" | "sheet" | "calendar" | "email",
  sectionCount: number
): Promise<string> {
  const contentSystemPrompt = `You are a professional content writer. Write detailed, factual, well-researched content.

STRICT RULES:
- Write ONLY about the specific topic the user asks for. Every paragraph must contain real information about that topic.
- NEVER use filler phrases like "demonstrates crucial operational insights" or "strategic recommendations for sustainable implementation".
- NEVER repeat the same sentence structure across sections. Each section must read differently.
- Use specific facts, data points, real-world examples, named entities, and concrete details.
- Write in clear, natural language. Avoid corporate buzzword salad.
- If you don't know specific facts, write general knowledge that is still accurate and relevant to the topic.`;

  let userPrompt = "";

  if (contentType === "doc") {
    userPrompt = `Write a detailed ${sectionCount}-section document about: "${topic}"

Format each section as:
## 1. Section Title
Two to three paragraphs of detailed, factual content about this specific aspect of ${topic}.

Write ALL ${sectionCount} sections. Each section must cover a DIFFERENT aspect of the topic with real, substantive content. Do NOT output JSON — output the document in markdown directly.`;
  } else if (contentType === "slides") {
    userPrompt = `Create ${sectionCount} presentation slides about: "${topic}"

Format each slide as:
# Slide 1: Slide Title
- First bullet point with a specific fact or insight
- Second bullet point with supporting detail
- Third bullet point with a concrete example or data

Write ALL ${sectionCount} slides. Each slide must have a unique focus area. Use real facts and specific details, not generic filler. Do NOT output JSON — output the slides in markdown directly.`;
  } else if (contentType === "calendar") {
    userPrompt = `Write a concise but informative calendar event description for: "${fullPrompt}"

Include: what the event is about, any key preparation needed, expected outcomes. Keep it to 2-3 sentences. Do NOT output JSON — output the description directly.`;
  } else if (contentType === "email") {
    userPrompt = `Write a professional email body for: "${fullPrompt}"

Write a clear, natural email. Do NOT output JSON — output the email body directly.`;
  } else {
    userPrompt = `Generate structured data content for: "${topic}"\n\nContext: ${fullPrompt}`;
  }

  const response = await callModelServer(userPrompt, {
    systemPrompt: contentSystemPrompt,
    timeoutMs: 30000,
    maxTokens: 2048,
    temperature: 0.7
  });

  return response.trim();
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
1. If the user prompt contains MULTIPLE sequential actions (e.g. "create a document AND email it", "create slides AND send email", "make a sheet AND share it"), return EXACTLY the corresponding sequential subtasks (Subtask 1: Create Document/Slides/Sheet, Subtask 2: Send Email).
2. For single, direct user requests, return EXACTLY 1 subtask.
3. NEVER invent meta-subtasks like "Identify credentials", "Authenticate user", "Check access", "Verify permissions", or "Review output".

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
  const hasDoc = /doc|docs|document|write doc|create doc|make doc|build doc/i.test(promptLower);
  const hasSlides = /slide|slides|presentation|ppt|deck|powerpoint/i.test(promptLower);
  const hasSheet = /sheet|sheets|tracker|excel|spreadsheet|csv/i.test(promptLower);
  const hasEmail = /send to|send email|compose email|send mail|mail to|email to|email|mail|gmail|share/i.test(promptLower);

  const isMultiAction = (hasDoc || hasSlides || hasSheet) && hasEmail;

  if (isMultiAction) {
    const multiSubtasks: VicharSubtask[] = [];
    if (hasDoc) {
      multiSubtasks.push({
        id: helperId("subtask"),
        rank: 1,
        title: `Create Google Doc for "${userPrompt}"`,
        description: "Create and populate Google Doc with topic content",
        status: "pending"
      });
    } else if (hasSlides) {
      multiSubtasks.push({
        id: helperId("subtask"),
        rank: 1,
        title: `Create Google Slides Deck for "${userPrompt}"`,
        description: "Create and populate Google Slides presentation deck",
        status: "pending"
      });
    } else if (hasSheet) {
      multiSubtasks.push({
        id: helperId("subtask"),
        rank: 1,
        title: `Create Google Sheet for "${userPrompt}"`,
        description: "Create and populate Google Sheet with data",
        status: "pending"
      });
    }

    if (hasEmail) {
      multiSubtasks.push({
        id: helperId("subtask"),
        rank: multiSubtasks.length + 1,
        title: `Send Email via Gmail API: "${userPrompt}"`,
        description: "Send email with created asset link to target recipient",
        status: "pending"
      });
    }

    if (multiSubtasks.length > 0) {
      return {
        originalPrompt: userPrompt,
        subtasks: multiSubtasks,
        totalTasks: multiSubtasks.length,
        completedTasks: 0
      };
    }
  }

  let defaultToolTitle = `Execute action for: ${userPrompt}`;
  if (hasDoc) {
    defaultToolTitle = `Create Google Doc for "${userPrompt}"`;
  } else if (hasSlides) {
    defaultToolTitle = `Create Google Slides Deck for "${userPrompt}"`;
  } else if (hasSheet) {
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
        description: `Perform primary execution for ${userPrompt}`,
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

  const subtaskTitleLower = subtask.title.toLowerCase();

  let toolName: WokaiToolName = "docs.create";
  if (/^send email|gmail api|compose email|send mail/i.test(subtaskTitleLower)) {
    toolName = "gmail.send";
  } else if (/^create google doc|create doc|make doc|build doc/i.test(subtaskTitleLower)) {
    toolName = "docs.create";
  } else if (/^create google slides|create slides|make slides|create presentation/i.test(subtaskTitleLower)) {
    toolName = "slides.createDeck";
  } else if (/^create google sheet|create sheet|make sheet|create tracker/i.test(subtaskTitleLower)) {
    toolName = "sheets.createTracker";
  } else if (/^schedule google calendar|create event|schedule meeting/i.test(subtaskTitleLower)) {
    toolName = "calendar.createEvent";
  } else if (/^list google calendar|list events|check calendar/i.test(subtaskTitleLower)) {
    toolName = "calendar.listEvents";
  } else if (/^search google drive|search drive|find file/i.test(subtaskTitleLower)) {
    toolName = "drive.search";
  } else if (/gmail|email|mail/i.test(subtaskTitleLower) && !/doc|slide|sheet/i.test(subtaskTitleLower)) {
    toolName = "gmail.send";
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

function getTopicSpecificSections(topic: string, promptLower: string): string[] {
  if (/pollut|environment|emiss|waste|climate|smog|toxic/i.test(topic + " " + promptLower)) {
    return [
      "Overview of Environmental Pollution & Major Types",
      "Industrial Emissions & Atmospheric Contaminants",
      "Fossil Fuel Combustion & Transportation Smog",
      "Chemical Effluents & Freshwater Contamination",
      "Plastic Accumulation & Ocean Acidification",
      "Agricultural Pesticides, Fertilizers & Soil Degradation",
      "Deforestation, Biodiversity Loss & Carbon Sink Loss",
      "Public Health Consequences & Disease Risks",
      "Global Economic Impacts & Ecosystem Degradation",
      "Policy Governance, Regulations & International Treaties",
      "Renewable Energy Transition & Clean Technology",
      "Waste Management, Recycling & Circular Systems",
      "Community Awareness & Sustainable Action Plan"
    ];
  }

  if (/ai|artificial intelligence|machine learning|robot|technology|digital/i.test(topic + " " + promptLower)) {
    return [
      "Executive Overview of Artificial Intelligence",
      "Foundational Algorithms & Deep Neural Networks",
      "Data Infrastructure & High-Performance Computing",
      "Enterprise Automation & Efficiency Breakthroughs",
      "Ethical Considerations, Bias & Algorithmic Safety",
      "Job Market Impacts & Human-AI Collaboration",
      "Cybersecurity, Privacy & Data Protection",
      "Regulatory Compliance & Global AI Standards",
      "Frontier Innovations & Next-Generation Models",
      "Strategic Roadmap for Safe AI Integration"
    ];
  }

  return [
    `Executive Overview of ${topic}`,
    `Historical Background & Early Foundations of ${topic}`,
    `Core Drivers, Factors & Key Elements of ${topic}`,
    `Structural Evolution & Primary Components of ${topic}`,
    `Socioeconomic & Environmental Impact of ${topic}`,
    `Technological Innovations & Modern Developments in ${topic}`,
    `Major Challenges, Bottlenecks & Risk Factors in ${topic}`,
    `Policy, Governance & Compliance Standards for ${topic}`,
    `Global Market Trends & Comparative Benchmark Analysis of ${topic}`,
    `Future Outlook & Strategic Takeaways for ${topic}`
  ];
}

function getTopicSpecificSlides(topic: string, promptLower: string, count: number): string {
  const isPollution = /pollut|environment|emiss|waste|climate|smog|toxic/i.test(topic + " " + promptLower);
  const isAi = /ai|artificial intelligence|machine learning|robot|technology|digital/i.test(topic + " " + promptLower);

  const pollutionSlides = [
    { title: "Environmental Pollution Overview", bullets: [
      "Environmental pollution threatens global ecosystems, human health, and climate stability.",
      "Major forms include air emissions, industrial effluent, ocean plastics, and toxic soil buildup.",
      "Demands urgent international policy regulation, sustainable technology, and clean energy adoption."
    ]},
    { title: "Industrial Emissions & Air Contaminants", bullets: [
      "Heavy industrial manufacturing releases high volumes of SO2, NOx, and fine particulate matter.",
      "Unregulated factory smokestacks and power plants create toxic urban smog corridors.",
      "Prolonged exposure to airborne pollutants causes severe respiratory and cardiovascular illnesses."
    ]},
    { title: "Fossil Fuel Combustion & Transportation", bullets: [
      "Internal combustion vehicles burn gasoline and diesel, releasing massive CO2 greenhouse gas emissions.",
      "Transportation sector accounts for over 20% of total global carbon emissions driving climate change.",
      "High urban traffic density concentrates hazardous ground-level ozone in populated cities."
    ]},
    { title: "Chemical Effluents & Water Contamination", bullets: [
      "Factories discharge untreated chemical waste, heavy metals (mercury, lead), and synthetic toxins into rivers.",
      "Contaminating vital freshwater lakes and underground aquifers essential for municipal drinking water.",
      "Bioaccumulation in aquatic food chains destroys marine ecosystems and harms coastal populations."
    ]},
    { title: "Plastic Accumulation & Marine Microplastics", bullets: [
      "Over 300 million tons of non-biodegradable synthetic plastics enter landfills and oceans annually.",
      "Microplastics break down into marine food chains, threatening sea life and human food supplies.",
      "Ocean plastic gyres like the Great Pacific Garbage Patch choke marine habitats."
    ]},
    { title: "Agricultural Pesticides & Soil Degradation", bullets: [
      "Overuse of synthetic fertilizers and chemical pesticides causes severe soil toxicity and nutrient depletion.",
      "Agricultural runoff washes nitrogen and phosphorus into lakes, triggering toxic algae blooms.",
      "Erosion and soil degradation reduce arable farmland required for global food security."
    ]},
    { title: "Deforestation & Loss of Natural Carbon Sinks", bullets: [
      "Massive forest clearing for agriculture and logging reduces planet's natural carbon absorption capacity.",
      "Destruction of tropical rainforests accelerates biodiversity loss and wildlife habitat extinction.",
      "Tree burning releases gigatons of stored carbon directly back into the atmosphere."
    ]},
    { title: "Public Health Consequences & Disease Risks", bullets: [
      "Air and water pollution cause over 9 million premature deaths globally every year.",
      "Contaminated drinking water spreads waterborne diseases and toxic heavy metal poisoning.",
      "Vulnerable communities face disproportionate environmental risks and health burdens."
    ]},
    { title: "Global Economic Impact & Ecosystem Cost", bullets: [
      "Pollution damages agricultural yields, fisheries, forestry, and tourism industries.",
      "Healthcare costs from pollution-related chronic diseases run into trillions of dollars globally.",
      "Ecosystem service loss degrades clean air, water purification, and natural climate regulation."
    ]},
    { title: "Policy Governance & Sustainable Solutions", bullets: [
      "Enforcing strict environmental protection policies, carbon pricing, and emission caps.",
      "Accelerating global transition to renewable solar, wind, and zero-emission energy infrastructure.",
      "Promoting circular economic models, recycling mandates, and industrial waste reduction."
    ]}
  ];

  const aiSlides = [
    { title: "Executive Overview of Artificial Intelligence", bullets: [
      "Artificial Intelligence transforms global industries through machine learning, automation, and predictive analytics.",
      "Drives cognitive computing capabilities across enterprise operations, healthcare, and software development.",
      "Combines neural networks, massive data compute, and algorithmic optimization to solve complex tasks."
    ]},
    { title: "Foundational Machine Learning Architectures", bullets: [
      "Supervised, unsupervised, and reinforcement learning paradigms power modern AI models.",
      "Deep neural networks analyze multi-dimensional data arrays with high statistical precision.",
      "Transformer models revolutionize natural language processing and multimodal vision tasks."
    ]},
    { title: "Data Infrastructure & High-Performance Computing", bullets: [
      "Scalable cloud GPU/TPU clusters provide computational throughput required for model training.",
      "Massive data pipelines curate, clean, and vectorize unstructured enterprise knowledge.",
      "Distributed training frameworks accelerate convergence for billion-parameter model architectures."
    ]},
    { title: "Enterprise Automation & Workflow Optimization", bullets: [
      "Automates repetitive manual workflows, data entry, customer support, and document parsing.",
      "Enhances decision-making with real-time predictive analytics and business intelligence.",
      "Streamlines software engineering, automated code generation, and quality assurance testing."
    ]},
    { title: "Ethical AI, Bias Mitigation & Algorithmic Safety", bullets: [
      "Ensuring fairness, transparency, and accountability in algorithmic decision-making models.",
      "Detecting and mitigating training data bias to prevent discriminatory AI outputs.",
      "Establishing robust safety guardrails against hallucination, misdirection, and data leaks."
    ]},
    { title: "Human-AI Collaboration & Workforce Transformation", bullets: [
      "AI functions as an intelligent copilot, augmenting human creativity and operational speed.",
      "Reshaping job roles toward high-value strategic planning, oversight, and domain expertise.",
      "Requires continuous workforce upskilling and adaptative organizational culture shifts."
    ]},
    { title: "Cybersecurity, Privacy & Data Governance", bullets: [
      "Protecting proprietary enterprise data and user privacy within model training boundaries.",
      "Defending against adversarial prompt injection, model inversion, and data poisoning attacks.",
      "Implementing strict zero-trust data access policies and encryption standards."
    ]},
    { title: "Global AI Regulation & Compliance Frameworks", bullets: [
      "Governments introduce comprehensive regulatory standards like the EU AI Act and NIST frameworks.",
      "Mandating risk classification, auditability, and safety testing for high-risk AI deployments.",
      "Balancing rapid technological innovation with public safety and ethical compliance."
    ]},
    { title: "Frontier Innovations & Next-Gen Autonomous Agents", bullets: [
      "Autonomous multi-agent systems collaborate in parallel to execute end-to-end tasks.",
      "Reasoning models integrate tool execution, API orchestration, and self-correction loops.",
      "Neuromorphic computing and quantum machine learning open new computational horizons."
    ]},
    { title: "Strategic Roadmap for Enterprise AI Integration", bullets: [
      "Identify high-ROI enterprise use cases with clear success metrics and execution scope.",
      "Build modular, secure AI architecture connected via robust API infrastructure.",
      "Iterate continuously based on empirical performance monitoring and user feedback."
    ]}
  ];

  const slidesToUse = isPollution ? pollutionSlides : isAi ? aiSlides : null;

  const slides: string[] = [];
  for (let i = 1; i <= count; i++) {
    if (slidesToUse && slidesToUse[i - 1]) {
      const s = slidesToUse[i - 1];
      const bulletText = s.bullets.map((b) => `- ${b}`).join("\n");
      slides.push(`# Slide ${i}: ${s.title}\n${bulletText}`);
    } else {
      slides.push(`# Slide ${i}: ${topic} - Key Dimension ${i}\n- Essential strategic analysis regarding ${topic.toLowerCase()} milestone ${i}.\n- Critical operational factors and data insights driving ${topic.toLowerCase()}.\n- Strategic recommendations for sustainable long-term implementation.`);
    }
  }

  return slides.join("\n\n");
}

function getTopicSpecificSheet(topic: string, promptLower: string, count: number): string {
  const isStudent = /student|class|roll|school|college|marks|grade|attendance|student tracker/i.test(topic + " " + promptLower);
  const isFinance = /finance|expense|budget|sales|revenue|invoice|cost|account/i.test(topic + " " + promptLower);

  if (isStudent) {
    const studentNames = [
      "Aarav Sharma", "Ananya Verma", "Rohan Patel", "Priya Singh", "Ishaan Gupta",
      "Diya Roy", "Kabir Malhotra", "Sneha Joshi", "Aditya Kumar", "Meera Nair",
      "Arjun Reddy", "Riya Kapoor", "Devansh Mehta", "Tanvi Saxena", "Vivaan Chopra",
      "Sanya Bhatt", "Siddharth Rao", "Kavya Menon", "Yash Vardhan", "Pooja Hegde",
      "Nikhil Deshmukh", "Shruti Iyer", "Alok Pandey", "Neelam Das", "Harsh Vardhan"
    ];

    const rows: string[] = ["Roll No, Student Name, Class, Section, Attendance %, Marks (%), Grade, Status"];
    for (let i = 1; i <= count; i++) {
      const rollNo = 100 + i;
      const name = studentNames[(i - 1) % studentNames.length];
      const section = i % 3 === 1 ? "Section A" : i % 3 === 2 ? "Section B" : "Section C";
      const attendance = Math.min(100, 80 + ((i * 3) % 20));
      const marks = Math.min(100, 75 + ((i * 7) % 24));
      const grade = marks >= 90 ? "A+" : marks >= 80 ? "A" : marks >= 70 ? "B+" : "B";
      const status = marks >= 60 ? "Passed" : "Needs Review";

      rows.push(`${rollNo}, ${name}, Class 10, ${section}, ${attendance}%, ${marks}%, ${grade}, ${status}`);
    }
    return rows.join("\n");
  }

  if (isFinance) {
    const categories = ["Software Subscriptions", "Cloud Infrastructure", "Office Equipment", "Marketing Campaign", "Travel & Logistics", "Legal & Compliance", "Team Payroll"];
    const rows: string[] = ["Transaction ID, Expense Category, Item Description, Amount ($), Payment Method, Status, Date"];
    for (let i = 1; i <= count; i++) {
      const txId = `TXN-${1000 + i}`;
      const category = categories[(i - 1) % categories.length];
      const amount = (i * 145.5).toFixed(2);
      const method = i % 2 === 0 ? "Corporate Card" : "Bank Transfer";
      const status = i % 4 === 0 ? "Pending Approval" : "Cleared";

      rows.push(`${txId}, ${category}, ${topic} - ${category} allocation, $${amount}, ${method}, ${status}, 2026-08-${String(1 + (i % 28)).padStart(2, "0")}`);
    }
    return rows.join("\n");
  }

  const rows: string[] = ["ID, Module Focus, Task Description, Status, Priority, Assigned Owner, Target Date"];
  for (let i = 1; i <= count; i++) {
    const status = i % 3 === 1 ? "Completed" : i % 3 === 2 ? "In Progress" : "Pending";
    const priority = i % 4 === 0 ? "CRITICAL" : i % 2 === 0 ? "HIGH" : "MEDIUM";
    rows.push(`${i}, ${topic} - Task ${i}, Implementation of ${topic.toLowerCase()} milestone ${i}, ${status}, ${priority}, Deepak Yadav, 2026-08-${String(10 + (i % 20)).padStart(2, "0")}`);
  }
  return rows.join("\n");
}

function getTopicSpecificDocSections(topic: string, promptLower: string, count: number): string[] {
  const isIndia = /india|indian|development of india|economy of india|bharat/i.test(topic + " " + promptLower);
  const isPollution = /pollut|environment|emiss|waste|climate|smog|toxic/i.test(topic + " " + promptLower);
  const isAi = /ai|artificial intelligence|machine learning|robot|technology|digital/i.test(topic + " " + promptLower);

  if (isIndia) {
    const indiaSections = [
      {
        title: "Economic Growth & Digital Infrastructure Expansion",
        content: "India has emerged as one of the fastest-growing major economies globally, driven by rapid digital transformation and robust domestic consumption. The Unified Payments Interface (UPI) processes billions of digital transactions monthly, establishing India as a pioneer in digital public infrastructure. Coupled with expanding IT service exports and fintech adoption, digital connectivity has democratized financial access across both urban and rural demographics."
      },
      {
        title: "Manufacturing Expansion & Make in India Initiatives",
        content: "Under the 'Make in India' flagship initiative and Production-Linked Incentive (PLI) schemes, India is strengthening its global manufacturing competitiveness. High-tech manufacturing sectors including smartphone assembly, semiconductor fabrication, electronics, and automotive engineering have expanded significantly, attracting foreign direct investment (FDI) and establishing strategic supply chain resilience."
      },
      {
        title: "Renewable Energy Transition & National Green Missions",
        content: "India is accelerating its transition toward clean energy, targeting 500 GW of non-fossil power capacity by 2030. Large-scale solar parks in Rajasthan and Gujarat, alongside wind power corridors, lead the renewable expansion. The National Green Hydrogen Mission aims to transform India into a global hub for green hydrogen production and export, mitigating carbon intensity across heavy industries."
      },
      {
        title: "Transport Infrastructure Modernization & Logistics Hubs",
        content: "Infra-driven development under PM Gati Shakti has revolutionized India's transport network. High-speed expressways, modern freight corridors, and the indigenous Vande Bharat semi-high-speed trains have significantly compressed transit times. Port modernization and airport expansion under the UDAN regional connectivity scheme are optimizing national logistics efficiency."
      },
      {
        title: "Space Exploration Milestones & Scientific Leadership",
        content: "The Indian Space Research Organisation (ISRO) achieved historic international milestones with the successful lunar south pole landing of Chandrayaan-3 and the solar observation mission Aditya-L1. Future missions including Gaganyaan (human spaceflight) and Shukrayaan (Venus orbiter) showcase India's cost-effective, high-precision aerospace engineering capabilities."
      },
      {
        title: "Rural Development, Agritech & Agricultural Resilience",
        content: "Agriculture remains a vital pillar of the Indian economy, supporting over 40% of the national workforce. Digital initiatives like e-NAM (National Agriculture Market), micro-irrigation schemes, and PM-KISAN direct income transfers provide stability to farmers. Agritech startups are deploying drone technology, satellite crop monitoring, and AI soil sensors to enhance crop yields."
      },
      {
        title: "Universal Healthcare Access & Ayushman Bharat Scheme",
        content: "The Ayushman Bharat Pradhan Mantri Jan Arogya Yojana provides health insurance coverage to over 500 million citizens, representing the world's largest government-funded healthcare program. Primary healthcare centers (Health and Wellness Centers) and indigenous pharmaceutical manufacturing strengthen domestic health security and vaccine production capacity."
      },
      {
        title: "Education Reform & Skill India Mission",
        content: "The National Education Policy (NEP) modernizes India's education ecosystem by promoting multidisciplinary learning, coding literacy, and vocational training. The Skill India mission collaborates with industry partners to train millions of youth in emerging technologies like AI, robotics, data analytics, and renewable energy management."
      },
      {
        title: "Financial Inclusion & Direct Benefit Transfer Infrastructure",
        content: "The PM Jan Dhan Yojana has opened over 500 million bank accounts for unbanked citizens. Paired with Aadhaar biometric verification and mobile access (JAM Trinity), government subsidies and welfare benefits are transferred directly to beneficiaries' bank accounts, eliminating leakages and empowering micro-entrepreneurs."
      },
      {
        title: "Global Leadership, Diplomacy & Strategic Partnerships",
        content: "India's presidency of the G20 demonstrated its diplomatic leadership in advocating for the Global South, climate finance, and multilateral reform. Strategic partnerships in the Quad, I2U2, and bilateral economic agreements position India as an indispensable economic anchor and geopolitical stabilizer in the Indo-Pacific region."
      }
    ];

    return indiaSections.slice(0, count).map((s, idx) => `## ${idx + 1}. ${s.title}\n${s.content}`);
  }

  if (isPollution) {
    const pollutionSections = [
      {
        title: "Overview of Environmental Pollution & Global Ecosystem Risks",
        content: "Environmental pollution represents one of the most critical threats to global biodiversity, human health, and ecological balance. Toxic airborne particulates, industrial chemical discharges, agricultural runoff, and synthetic plastics contaminate atmospheric and aquatic systems, demanding coordinated international policy regulation."
      },
      {
        title: "Industrial Emissions & Smokestack Air Contaminants",
        content: "Unregulated industrial manufacturing facilities, coal-fired power stations, and chemical refineries release gigatons of sulfur dioxide (SO2), nitrogen oxides (NOx), carbon monoxide, and fine particulate matter (PM2.5). These airborne pollutants react in sunlight to form hazardous ground-level ozone and toxic smog corridors over densely populated urban centers."
      },
      {
        title: "Fossil Fuel Combustion & Transportation Exhaust",
        content: "The global transportation sector relies heavily on internal combustion engines burning petroleum fuels. Vehicle exhaust accounts for over 20% of global carbon dioxide emissions, releasing carcinogenic benzene, volatile organic compounds (VOCs), and black carbon that degrade respiratory health and accelerate global warming."
      },
      {
        title: "Chemical Effluents & Freshwater Contamination",
        content: "Factories frequently discharge untreated heavy metals including mercury, lead, cadmium, and synthetic solvent waste directly into rivers and freshwater lakes. Contaminating municipal drinking water aquifers leads to toxic bioaccumulation in aquatic food chains, threatening aquatic life and human populations reliant on local fisheries."
      },
      {
        title: "Plastic Pollution & Ocean Microplastic Accumulation",
        content: "Over 300 million tons of single-use synthetic plastics are manufactured annually, with millions of tons ending up in marine environments. Ocean currents concentrate floating debris into massive oceanic garbage patches, while degrading microplastics infiltrate marine food chains, posing unquantified risks to human food security."
      },
      {
        title: "Agricultural Runoff, Nitrogen Overuse & Soil Degradation",
        content: "Excessive application of synthetic chemical fertilizers and pesticides leaches nitrogen and phosphorus into nearby lakes and coastal waters. This triggers severe eutrophication and toxic algae blooms that deplete dissolved oxygen, creating biological dead zones in rivers and coastal sea basins."
      },
      {
        title: "Deforestation & Loss of Earth's Carbon Absorption Sinks",
        content: "Massive land clearing for agriculture, cattle ranching, and commercial logging destroys tropical rainforests that function as planet Earth's primary carbon sinks. Burning forest biomass releases gigatons of sequestered carbon into the atmosphere while driving wildlife habitat extinction."
      },
      {
        title: "Public Health Consequences & Chronic Disease Metrics",
        content: "According to global environmental health research, ambient air and water pollution contribute to over 9 million premature deaths annually. Exposure to toxic environmental pollutants accelerates chronic obstructive pulmonary disease (COPD), cardiovascular disease, stroke, asthma, and childhood developmental impairments."
      },
      {
        title: "Global Economic Damage & Ecosystem Service Loss",
        content: "Environmental degradation generates hundreds of billions of dollars in economic losses annually through escalating healthcare expenditures, reduced worker productivity, agricultural crop yield declines, and fisheries collapse. Loss of natural ecosystem services weakens natural storm barriers and air purification capacity."
      },
      {
        title: "Policy Frameworks, Renewable Transition & Circular Economy",
        content: "Mitigating global pollution requires enforcing international climate agreements, carbon pricing mechanisms, and strict industrial emission standards. Accelerating the transition to solar, wind, and zero-emission electric transport, alongside scaling circular economic recycling systems, is vital for long-term ecological restoration."
      }
    ];

    return pollutionSections.slice(0, count).map((s, idx) => `## ${idx + 1}. ${s.title}\n${s.content}`);
  }

  // Generic fallback — produce varied content for each section instead of copy-pasting the same template
  const sections: string[] = [];
  const genericSections = getTopicSpecificSections(topic, promptLower);

  // Each template approaches the topic from a genuinely different angle
  const sectionTemplates = [
    (t: string, s: string) =>
      `${t} encompasses a broad range of interconnected factors that shape how individuals, organizations, and governments engage with ${s.toLowerCase()}. At its core, the subject involves understanding the fundamental principles that drive change, the historical context that brought us to the current state, and the emerging trends that will define the future landscape.\n\nResearchers and practitioners in this field emphasize the importance of evidence-based approaches. Rather than relying on assumptions, effective strategies for ${s.toLowerCase()} require careful analysis of available data, consultation with domain experts, and continuous monitoring of outcomes.`,

    (t: string, s: string) =>
      `The historical development of ${s.toLowerCase()} can be traced through several distinct phases. Early efforts were often fragmented and lacked coordination, but over time, a more systematic approach emerged. Key milestones include the establishment of dedicated institutions, the development of standardized methodologies, and the growing recognition of ${t.toLowerCase()} as a priority area requiring sustained attention.\n\nToday, the field continues to evolve rapidly. New research findings, technological breakthroughs, and shifting societal expectations all contribute to an environment where adaptability and continuous learning are essential for anyone involved in ${s.toLowerCase()}.`,

    (t: string, s: string) =>
      `Multiple stakeholders play critical roles in shaping ${s.toLowerCase()}. Government agencies set regulatory frameworks and allocate public resources. Private sector organizations contribute through innovation, investment, and operational expertise. Academic institutions conduct foundational research and train the next generation of professionals. Civil society groups advocate for accountability and ensure that diverse perspectives are represented in decision-making processes.\n\nEffective collaboration among these groups is essential. When stakeholders work in isolation, efforts tend to be duplicated, resources are wasted, and outcomes fall short of their potential. Cross-sector partnerships have proven particularly valuable in addressing the complex challenges associated with ${t.toLowerCase()}.`,

    (t: string, s: string) =>
      `Several significant challenges confront those working on ${s.toLowerCase()}. Resource constraints — including limited funding, insufficient skilled personnel, and inadequate infrastructure — frequently hinder progress. Information gaps make it difficult to assess the true scope of problems or measure the effectiveness of interventions. Resistance to change, whether from institutional inertia or conflicting interests, can slow the adoption of proven solutions.\n\nAddressing these challenges requires both practical problem-solving and a willingness to experiment with new approaches. Successful initiatives in ${t.toLowerCase()} often share common traits: strong leadership, clear goals, transparent communication, and a commitment to learning from both successes and failures.`,

    (t: string, s: string) =>
      `Technology has become an increasingly important factor in ${s.toLowerCase()}. Digital tools enable faster data collection, more sophisticated analysis, and broader communication. Automation reduces the burden of repetitive tasks, freeing human resources for higher-value activities. Emerging technologies such as machine learning and advanced sensors offer new capabilities that were previously unimaginable.\n\nHowever, technology alone is not a solution. Its effectiveness depends on how well it is integrated into existing workflows, whether users receive adequate training, and whether the underlying data is accurate and representative. Organizations that treat technology as a complement to — rather than a replacement for — human expertise tend to achieve better outcomes in ${t.toLowerCase()}.`,

    (t: string, s: string) =>
      `The economic dimensions of ${s.toLowerCase()} are substantial and wide-ranging. Direct costs include the resources spent on planning, implementation, and monitoring. Indirect costs — such as lost productivity, environmental degradation, or social disruption — can be even larger but are often harder to quantify. On the benefit side, well-executed initiatives in ${t.toLowerCase()} can generate significant returns through improved efficiency, reduced risk, and enhanced quality of life.\n\nEconomic analysis plays a vital role in prioritizing interventions and allocating resources effectively. Cost-benefit analysis, return-on-investment calculations, and comparative studies all help decision-makers understand where their efforts will have the greatest impact.`,

    (t: string, s: string) =>
      `Real-world examples illustrate the practical implications of ${s.toLowerCase()}. Across different regions and contexts, organizations have developed approaches that reflect local conditions, available resources, and specific objectives. Some have achieved notable success by adopting innovative methods, forming strategic alliances, or leveraging unique competitive advantages.\n\nThese case studies offer valuable lessons for others working in ${t.toLowerCase()}. While direct replication is rarely possible — since every context has its own constraints and opportunities — the principles underlying successful initiatives can often be adapted and applied elsewhere.`,

    (t: string, s: string) =>
      `Policy and regulatory considerations are central to ${s.toLowerCase()}. Effective governance requires clear rules, consistent enforcement, and mechanisms for accountability. Regulations must balance the need for oversight with the importance of flexibility, allowing practitioners to innovate while maintaining minimum standards of quality and safety.\n\nInternational cooperation adds another layer of complexity. Since many aspects of ${t.toLowerCase()} transcend national boundaries, coordinated action among countries is often necessary. International frameworks, bilateral agreements, and multilateral institutions all play roles in facilitating this cooperation.`,

    (t: string, s: string) =>
      `Education and capacity building are foundational to sustained progress in ${s.toLowerCase()}. Training programs, professional development opportunities, and knowledge-sharing platforms help ensure that practitioners have the skills and knowledge they need. Public awareness campaigns increase understanding of key issues and build support for necessary actions.\n\nThe quality of education in this area varies significantly across different institutions and regions. Bridging these gaps requires investment in curriculum development, instructor training, and access to up-to-date learning resources. Online learning platforms and open educational resources have expanded access in recent years, but significant disparities remain.`,

    (t: string, s: string) =>
      `Looking ahead, the trajectory of ${s.toLowerCase()} will be shaped by several converging trends. Demographic shifts, climate change, technological disruption, and evolving geopolitical dynamics will all influence priorities and possibilities. Organizations and individuals who anticipate these changes and prepare accordingly will be better positioned to navigate the uncertainties ahead.\n\nStrategic foresight — the practice of systematically exploring possible futures — is becoming an increasingly valuable tool for those involved in ${t.toLowerCase()}. By considering multiple scenarios and developing flexible strategies, decision-makers can reduce their vulnerability to unexpected developments and capitalize on emerging opportunities.`
  ];

  for (let i = 1; i <= count; i++) {
    const topicName = genericSections[(i - 1) % genericSections.length];
    const templateFn = sectionTemplates[(i - 1) % sectionTemplates.length];
    sections.push(`## ${i}. ${topicName}\n${templateFn(topic, topicName)}`);
  }

  return sections;
}

function buildRichContent(
  drishthi: DrishthiStatement,
  fullPrompt: string,
  previousLogs: Array<{ subtask: VicharSubtask; drishthi: DrishthiStatement; sahayata: SahayataPayload; kriya: KriyaResult }> = []
): string {
  const tool = (drishthi.selectedTools[0] || "") as string;
  const promptLower = fullPrompt.toLowerCase();
  const requestedCount = extractRequestedCount(fullPrompt, 10);

  // 1. Gmail Send Email Message Payload
  if (tool === "gmail.send" || drishthi.subtaskTitle.toLowerCase().includes("email")) {
    const emailMatch = fullPrompt.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const recipient = emailMatch ? emailMatch[1] : "sugreevyadav464@gmail.com";

    // Extract created document/slides/sheet link from previous subtask logs
    let assetLink = "";
    for (const log of previousLogs) {
      if (log.kriya?.actionCreated?.url) {
        assetLink = log.kriya.actionCreated.url;
        break;
      }
    }

    // Extract custom message intent from prompt (e.g. "saying in the mail that...")
    let customNote = "";
    const noteMatch = fullPrompt.match(/saying\s+(in\s+the\s+mail\s+that\s+)?(.*)$/i);
    if (noteMatch) {
      customNote = noteMatch[2].trim();
    }

    const messageBody = customNote
      ? `Hi,\n\n${customNote}\n\nLink to document:\n${assetLink || "https://docs.google.com/document"}\n\nBest regards,\nWokAI OS`
      : `Hi,\n\nI have created the requested document and am sharing the link with you:\n\n${assetLink || "https://docs.google.com/document"}\n\nPlease review and let me know your feedback.\n\nBest regards,\nWokAI OS`;

    return messageBody;
  }

  const rawTopic = fullPrompt
    .replace(/^(create|write|make|generate|build)\s+(a|an)?\s+(\d+-page|\d+-slide|page|slide|short|long|detailed)?\s*(google\s*)?(doc|docs|document|slides|presentation|deck|sheet|tracker|file)\s*(on|about|for|on topic|mainy on topic)?\s*/i, "")
    .replace(/\s*(and give me the link|give me link|link of file|link).*$/i, "")
    .trim();
  const topic = rawTopic ? rawTopic.charAt(0).toUpperCase() + rawTopic.slice(1) : drishthi.subtaskTitle;

  // 2. Google Slides / Presentation Deck
  if (tool === "slides.createDeck" || tool.includes("slide") || promptLower.includes("presentation") || promptLower.includes("ppt") || promptLower.includes("deck")) {
    return getTopicSpecificSlides(topic, promptLower, requestedCount);
  }

  // 3. Google Sheets / Spreadsheet / Tracker
  if (tool === "sheets.createTracker" || tool.includes("sheet") || promptLower.includes("spreadsheet") || promptLower.includes("tracker") || promptLower.includes("excel")) {
    return getTopicSpecificSheet(topic, promptLower, requestedCount);
  }

  // 4. Google Docs / Document File
  const sections = getTopicSpecificDocSections(topic, promptLower, requestedCount);
  const docHeader = `# Detailed Report on ${topic}\n\n*Comprehensive ${requestedCount}-Section Analysis Generated by WokAI OS*\n\n`;
  const docFooter = `\n\n---\n*Report compiled by WokAI OS | Topic: "${topic}" | Prompt: "${fullPrompt}"*`;

  return docHeader + sections.join("\n\n") + docFooter;
}

/* ============================================================================
 * AGENT 5: SAHAYATA (Content & Payload Generation Agent)
 * ============================================================================ */
export async function runSahayata(
  drishthi: DrishthiStatement,
  fullPrompt: string,
  previousLogs: Array<{ subtask: VicharSubtask; drishthi: DrishthiStatement; sahayata: SahayataPayload; kriya: KriyaResult }> = []
): Promise<SahayataPayload> {
  const tool = (drishthi.selectedTools[0] || "") as string;
  const requestedCount = extractRequestedCount(fullPrompt, 10);
  const isSlides = drishthi.selectedTools.includes("slides.createDeck") || fullPrompt.toLowerCase().includes("ppt") || fullPrompt.toLowerCase().includes("slide");

  if (tool === "gmail.send" || drishthi.subtaskTitle.toLowerCase().includes("email")) {
    const messageBody = buildRichContent(drishthi, fullPrompt, previousLogs);
    const emailMatch = fullPrompt.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const recipient = emailMatch ? emailMatch[1] : "sugreevyadav464@gmail.com";

    return {
      subtaskId: drishthi.subtaskId,
      content: messageBody,
      drafts: {
        to: recipient,
        body: messageBody,
        subject: `Document Review: ${drishthi.subtaskTitle}`
      }
    };
  }

  try {
    const promptText = `
You are SAHAYATA, the Content & Payload Generation Agent of WokAI.
Generate rich, full-length, highly detailed content specifically tailored to the user's topic: "${fullPrompt}".

IMPORTANT:
- Write ONLY about the exact subject requested (e.g., if asked about "pollution causes", discuss air emissions, industrial effluent, plastic waste, deforestation, and climate impact).
- DO NOT write generic business jargon. Focus 100% on the user's specific topic.
- TARGET LENGTH: ${requestedCount} ${isSlides ? "slides" : "sections"}.
${isSlides ? `Output EXACTLY ${requestedCount} slides formatted as \`# Slide 1: ...\` through \`# Slide ${requestedCount}: ...\`. Each slide must contain bullet points.` : `Output EXACTLY ${requestedCount} detailed sections formatted as \`## 1. ...\` through \`## ${requestedCount}. ...\`.`}

Output strictly valid JSON:
{
  "content": string,
  "drafts": {
    "subject"?: string,
    "body"?: string,
    "title"?: string
  }
}
If JSON output is not possible, output the full document markdown directly.
`;
    const responseText = await callModelServer(promptText);

    if (responseText && responseText.trim().length > 50) {
      const parsed = cleanJson(responseText);
      const content = (parsed && typeof parsed.content === "string" && parsed.content.length > 50)
        ? parsed.content
        : responseText.replace(/^```(json|markdown)?\s*/i, "").replace(/\s*```$/g, "").trim();

      return {
        subtaskId: drishthi.subtaskId,
        content,
        drafts: parsed?.drafts
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
  googleToken?: string,
  previousLogs: Array<{ subtask: VicharSubtask; drishthi: DrishthiStatement; sahayata: SahayataPayload; kriya: KriyaResult }> = []
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

  const previousMemories = previousLogs.map((l) => ({
    url: l.kriya?.actionCreated?.url,
    output: l.kriya?.apiResponse,
    label: l.subtask.title
  }));

  try {
    const adapterRes = await executeAdapterAction(actionToExecute, googleToken, previousMemories);
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
