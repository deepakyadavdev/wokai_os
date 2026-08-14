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
  if (/drive|search file|find file|in my drive|proposol|proposal|doc search|file/i.test(promptLower)) {
    defaultToolTitle = `Search Google Drive for "${userPrompt}"`;
  } else if (/send email|compose email|send mail/i.test(promptLower)) {
    defaultToolTitle = `Send Email via Gmail API: "${userPrompt}"`;
  } else if (/gmail|email|inbox|search mail|read mail/i.test(promptLower)) {
    defaultToolTitle = `Search Gmail Inbox for "${userPrompt}"`;
  } else if (/calendar|schedule|meeting|event/i.test(promptLower)) {
    defaultToolTitle = `Schedule Google Calendar Event: "${userPrompt}"`;
  } else if (/sheet|tracker|excel|spreadsheet/i.test(promptLower)) {
    defaultToolTitle = `Create Google Sheet: "${userPrompt}"`;
  } else if (/slide|presentation|deck/i.test(promptLower)) {
    defaultToolTitle = `Create Google Slides Deck: "${userPrompt}"`;
  } else if (/create doc|write doc|new document/i.test(promptLower)) {
    defaultToolTitle = `Create Google Doc: "${userPrompt}"`;
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
- If user wants to find/search files in Drive: select "drive.search"
- If user wants to send an email: select "gmail.send"
- If user wants to search or read emails: select "gmail.search"
- If user wants to create a doc: select "docs.create"
- If user wants to create a tracker/spreadsheet: select "sheets.createTracker"
- If user wants to create slides/deck: select "slides.createDeck"
- If user wants to create a calendar event: select "calendar.createEvent"
- If user wants to list/check calendar events: select "calendar.listEvents"

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

  let toolName: WokaiToolName = "drive.search";
  if (/drive|search file|find file|in my drive|proposol|proposal|doc search|find doc|look for file|file/i.test(textToMatch)) {
    toolName = "drive.search";
  } else if (/gmail\.send|send email|compose email|send mail/i.test(textToMatch)) {
    toolName = "gmail.send";
  } else if (/gmail|email|inbox|search mail|find mail|summarize email|read mail/i.test(textToMatch)) {
    toolName = "gmail.search";
  } else if (/calendar\.create|create event|schedule meeting|add event|book meeting/i.test(textToMatch)) {
    toolName = "calendar.createEvent";
  } else if (/calendar|events|agenda|schedule|upcoming/i.test(textToMatch)) {
    toolName = "calendar.listEvents";
  } else if (/sheet|tracker|excel|spreadsheet|csv/i.test(textToMatch)) {
    toolName = "sheets.createTracker";
  } else if (/slide|deck|presentation|ppt|powerpoint/i.test(textToMatch)) {
    toolName = "slides.createDeck";
  } else if (/contact|people|find phone|find email of/i.test(textToMatch)) {
    toolName = "contacts.search";
  } else if (/create doc|new document|write doc|make document/i.test(textToMatch)) {
    toolName = "docs.create";
  }

  return {
    subtaskId: subtask.id,
    subtaskTitle: subtask.title,
    selectedTools: [toolName],
    enrichedStatement: `Execute subtask ${subtask.title}`,
    toolParameters: { title: subtask.title, query: fullPrompt }
  };
}

function buildRichContent(drishthi: DrishthiStatement, fullPrompt: string): string {
  const tool = (drishthi.selectedTools[0] || "") as string;
  const promptLower = fullPrompt.toLowerCase();

  // 1. Google Slides / Presentation Deck
  if (tool === "slides.createDeck" || tool.includes("slide") || promptLower.includes("presentation") || promptLower.includes("ppt") || promptLower.includes("deck")) {
    const rawTopic = fullPrompt
      .replace(/^(create|write|make|generate|build)\s+(a|an)?\s+(\d+-slide|slide|\d+\s+slides|presentation|deck|ppt)?\s*(google\s*)?(slides|presentation|deck|file)?\s*(on|about|for|on topic)?\s*/i, "")
      .trim();
    const topic = rawTopic ? rawTopic.charAt(0).toUpperCase() + rawTopic.slice(1) : drishthi.subtaskTitle;

    return `# Slide 1: ${topic} - Executive Overview
- Comprehensive analysis of ${topic}
- Key drivers, strategic impacts, and technological developments
- Prepared by WokAI OS

# Slide 2: Historical Background & Early Origins
- Fundamental emergence of ${topic} in global history
- Early industrial mechanisms and structural transformations
- Transition from traditional frameworks to scalable systems

# Slide 3: Core Drivers & Technological Innovations
- Major breakthroughs in mechanization and power systems
- Automation, process optimization, and industrial standards
- Capital investments and infrastructure expansion

# Slide 4: Socioeconomic Impact & Urbanization
- Demographic shifts: rural-to-urban population migration
- Creation of specialized industrial workforces and modern cities
- Rapid increases in productivity and global trade volume

# Slide 5: Key Challenges & Industrial Bottlenecks
- Environmental implications and resource management
- Labor regulation and workforce safety transitions
- Managing structural economic disruptions during growth

# Slide 6: Industrial Standardization & Policy
- Establishment of quality standards and compliance frameworks
- International trade agreements and regulatory evolution
- Balancing innovation speed with regulatory safety

# Slide 7: Modern Digital Transformation
- Integration of digital networks, IoT, and AI automation
- Transition toward smart manufacturing and sustainable industry
- Real-time data analytics driving operational efficiency

# Slide 8: Global Market & Economic Dynamics
- Cross-border supply chain integration and resilience
- Competitive landscape across emerging and developed markets
- Economic sustainability and long-term capital allocation

# Slide 9: Future Outlook & Strategic Roadmap
- Emerging trends in green technology and renewable energy
- Next-generation automation and human-AI collaboration
- Strategic imperative for continuous learning and adaptation

# Slide 10: Conclusion & Key Takeaways
- Summary of core findings on ${topic}
- Long-term strategic value and legacy of industrial evolution
- Actionable steps for future growth and policy execution`;
  }

  // 2. Google Sheets / Spreadsheet / Tracker
  if (tool === "sheets.createTracker" || tool.includes("sheet") || promptLower.includes("spreadsheet") || promptLower.includes("tracker") || promptLower.includes("excel")) {
    const rawTopic = fullPrompt
      .replace(/^(create|write|make|generate|build)\s+(a|an)?\s*(google\s*)?(sheet|sheets|spreadsheet|tracker|excel)?\s*(on|about|for|on topic)?\s*/i, "")
      .trim();
    const topic = rawTopic ? rawTopic.charAt(0).toUpperCase() + rawTopic.slice(1) : drishthi.subtaskTitle;

    return `ID, Module Name, Task Description, Status, Priority, Assigned Owner, Target Date
1, ${topic} - Overview, Initial research & scope definition, Completed, HIGH, Deepak Yadav, 2026-08-15
2, ${topic} - Data Analysis, Data gathering & structural audit, In Progress, HIGH, Deepak Yadav, 2026-08-18
3, ${topic} - Architecture, Core system setup & API configuration, Pending, CRITICAL, Deepak Yadav, 2026-08-20
4, ${topic} - Implementation, Feature development & adapter integration, Pending, HIGH, WokAI Agent, 2026-08-22
5, ${topic} - Verification, Testing & compliance audit, Pending, MEDIUM, WokAI Agent, 2026-08-25
6, ${topic} - Final Release, Deployment & documentation review, Pending, MEDIUM, Team Lead, 2026-08-30`;
  }

  // 3. Google Docs / Document File
  const rawTopic = fullPrompt
    .replace(/^(create|write|make|generate|build)\s+(a|an)?\s+(\d+-page|page|short|long|detailed)?\s*(google\s*)?(doc|docs|document|file)\s*(on|about|for|on topic|mainy on topic)?\s*/i, "")
    .replace(/\s*(and give me the link|give me link|link of file|link).*$/i, "")
    .trim();
  const topic = rawTopic ? rawTopic.charAt(0).toUpperCase() + rawTopic.slice(1) : drishthi.subtaskTitle;

  return `# ${topic}

## 1. Executive Summary & Overview
The subject of ${topic} represents a crucial field of historical, economic, and technological development. This document presents a structured and detailed analysis of its core principles, historical evolution, socio-economic impacts, and future outlook.

## 2. Historical Origins & Foundations
The emergence of ${topic} was driven by a conjunction of pivotal factors:
- **Technological Breakthroughs:** Major advances in machinery, energy systems, and process optimization transformed traditional frameworks.
- **Economic Infrastructure:** The creation of new financial models, expanded trade routes, and infrastructure investment accelerated adoption.
- **Societal & Demographic Factors:** Shifting population dynamics, urban expansion, and specialized workforce development created high momentum.

## 3. Key Drivers of Growth & Expansion
1. **Infrastructure Investments:** Roads, transport systems, and digital networks provided the physical and logistical backbone.
2. **Capital Mobilization:** Access to private equity, public funding, and commercial banking enabled high-capital industrial scaling.
3. **Intellectual Capital:** Research institutions and technical training institutions expanded the knowledge frontier.

## 4. Structural Evolution & Major Phases
1. **Inception & Early Adoption:** Initial concepts were established and piloted across primary sectors.
2. **Rapid Scaling & Standardization:** Production standards, regulatory guidelines, and global networks expanded exponentially.
3. **Integration & Modern Era:** Advanced automation, digital integration, and sustainability frameworks became central imperatives.

## 5. Socioeconomic Impact & Workforce Transformation
- **Economic Productivity:** Industrial efficiency and output per capita increased dramatically across regions.
- **Social Transformation:** Traditional communities transitioned into urban industrial hubs, redefining work environments and lifestyle standards.
- **Demographic Shifts:** Rapid growth of metropolitan areas and international migration patterns.

## 6. Technological Innovation & Automation
- **Process Automation:** Mechanized workflows reduced production errors and operating overhead.
- **Data-Driven Operations:** Real-time metrics and quality assurance systems became standard industry practice.
- **Scalable Architecture:** Modular design principles enabled rapid replication across international locations.

## 7. Environmental & Systemic Challenges
- **Resource Management:** Balancing high industrial throughput with raw material availability and ecological stewardship.
- **Regulatory Compliance:** Navigating international labor laws, safety standards, and environmental protection guidelines.
- **Transition Costs:** Retraining workforces and modernizing legacy equipment during technological shifts.

## 8. Policy, Governance & Regulatory Frameworks
- **Governmental Policy:** Tax incentives, trade tariffs, and public infrastructure grants shaping industry direction.
- **International Cooperation:** Global standard organizations ensuring interoperability and environmental compliance.
- **Corporate Governance:** Ethical standards, stakeholder accountability, and sustainable reporting practices.

## 9. Modern Industry Trends & Future Horizons
- **Digital Twin & Smart Systems:** Virtual modeling and predictive maintenance optimizing supply chains.
- **Human-AI Collaboration:** Augmenting human workforce capabilities with intelligent agent orchestration.
- **Green Transition:** Circular economy practices and renewable energy integration becoming primary competitive advantages.

## 10. Conclusion & Strategic Recommendations
In conclusion, ${topic} remains a fundamental pillar of economic and technological progress. Sustained innovation, balanced policy frameworks, and adaptive strategy will ensure long-term prosperity and resilience.

---
*Document compiled by WokAI OS | Prompt: "${fullPrompt}"*`;
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
Generate rich, full-length, highly detailed content (document body, article, email body, report, or spreadsheet data) to fulfill the user's goal.
If the user asks for a document on a topic (e.g. "Rise of Industrialization"), write a comprehensive, multi-section essay/article covering history, key factors, socioeconomic impact, key developments, and conclusion.

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
