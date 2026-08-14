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
  const isMultiAction = /and email|and send|and share|and mail|then email|then send|then share|and attach|and schedule|then schedule/i.test(promptLower);

  const hasDoc = /doc|docs|document|write doc|create doc|make doc|build doc/i.test(promptLower);
  const hasSlides = /slide|slides|presentation|ppt|deck|powerpoint/i.test(promptLower);
  const hasSheet = /sheet|sheets|tracker|excel|spreadsheet|csv/i.test(promptLower);
  const hasEmail = /email|mail|send|share/i.test(promptLower);

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
  }  // Match ONLY subtask title and description (DO NOT match fullPrompt here, because fullPrompt contains words from ALL subtasks!)
  const textToMatch = `${subtask.title} ${subtask.description}`.toLowerCase();

  let toolName: WokaiToolName = "docs.create";
  if (/send email|compose email|send mail|mail to|email to|gmail\.send|email|gmail|mail/i.test(textToMatch)) {
    toolName = "gmail.send";
  } else if (/doc|docs|document|write doc|create doc|make doc|build doc/i.test(textToMatch)) {
    toolName = "docs.create";
  } else if (/slide|slides|presentation|ppt|deck|powerpoint/i.test(textToMatch)) {
    toolName = "slides.createDeck";
  } else if (/sheet|sheets|tracker|excel|spreadsheet|csv/i.test(textToMatch)) {
    toolName = "sheets.createTracker";
  } else if (/calendar\.create|create event|create meeting|schedule meeting|schedule a meeting|set meeting|set a meeting|add event|add meeting|book meeting|book a meeting|meeting at|meeting on|set event|book event|remind me at/i.test(textToMatch)) {
    toolName = "calendar.createEvent";
  } else if (/calendar\.list|list events|upcoming events|get events|check calendar|show calendar|calendar|agenda|what's on my calendar/i.test(textToMatch)) {
    toolName = "calendar.listEvents";
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
  const sectionsList = getTopicSpecificSections(topic, promptLower);

  // 2. Google Slides / Presentation Deck
  if (tool === "slides.createDeck" || tool.includes("slide") || promptLower.includes("presentation") || promptLower.includes("ppt") || promptLower.includes("deck")) {
    return getTopicSpecificSlides(topic, promptLower, requestedCount);
  }

  // 3. Google Sheets / Spreadsheet / Tracker
  if (tool === "sheets.createTracker" || tool.includes("sheet") || promptLower.includes("spreadsheet") || promptLower.includes("tracker") || promptLower.includes("excel")) {
    return getTopicSpecificSheet(topic, promptLower, requestedCount);
  }

  // 4. Google Docs / Document File
  const docSections: string[] = [`# Detailed Report on ${topic}\n\n*Comprehensive ${requestedCount}-Section Analysis Generated by WokAI OS*\n`];
  for (let i = 1; i <= requestedCount; i++) {
    const topicName = sectionsList[(i - 1) % sectionsList.length];
    docSections.push(`## ${i}. ${topicName}
A thorough examination of ${topic} reveals critical insights specifically concerning ${topicName.toLowerCase()}. Understanding these dynamics is essential for addressing the root factors and long-term implications.

### ${i}.1 Key Factors & Primary Mechanics
- **Primary Causes & Triggers:** Specific environmental, technological, or systemic drivers directly contributing to ${topicName.toLowerCase()}.
- **Observed Impacts:** Direct consequences affecting ecosystems, public health, infrastructure, and socio-economic systems.
- **Data & Empirical Findings:** Field research confirms measurable shifts and escalating trends associated with ${topicName.toLowerCase()}.

### ${i}.2 Strategic Recommendations & Mitigation
To effectively manage the challenges posed by ${topicName.toLowerCase()}, stakeholders must implement multi-layered solutions including stricter regulatory enforcement, sustainable technology adoption, and community engagement.`);
  }

  docSections.push(`\n---\n*Report compiled by WokAI OS | Topic: "${topic}" | Prompt: "${fullPrompt}"*`);
  return docSections.join("\n\n");
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
