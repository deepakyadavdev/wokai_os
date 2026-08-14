import { z } from "zod";
import type { WokaiMemory } from "@/lib/types";
import { callModelServer, cleanJson } from "@/lib/wokai/8agents";

const MEMORY_TYPES = ["preference", "habit", "contact", "deadline", "context", "skill", "relationship"] as const;

const EXTRACT_SCHEMA = z.object({
  memories: z.array(
    z.object({
      type: z.enum(MEMORY_TYPES),
      title: z.string().max(80),
      content: z.string().max(500),
      confidence: z.number().min(0).max(1).default(0.85),
    })
  ).max(5),
});

const RECALL_SCHEMA = z.object({
  relevant: z.array(
    z.object({
      id: z.string(),
      relevance: z.number().min(0).max(1),
    })
  ).max(10),
});

async function callLLM(prompt: string, systemPrompt: string): Promise<string> {
  try {
    return await callModelServer(`${systemPrompt}\n\n${prompt}`);
  } catch (e) {
    console.warn("LLM memory call failed:", e);
    return "";
  }
}

export async function extractMemories(
  userMessage: string,
  assistantResponse: string
): Promise<WokaiMemory[]> {
  const systemPrompt = `You are WokAI's Memory Extraction Engine.
Your job is to extract useful, actionable memories from the conversation.

Extract memories ONLY when the user reveals something specific and useful about themselves:
- Personal preferences
- Habits and routines
- Important contacts
- Deadlines and commitments
- Context that helps future conversations
- Skills and abilities
- Relationships

Rules:
1. ONLY extract when the user explicitly shares information.
2. Each memory must be concise (title <= 80 chars, content <= 500 chars).
3. Maximum 5 memories per extraction.
4. If no useful memories are found, return an empty array.

Return strict JSON matching this schema:
{
  "memories": [
    {
      "type": "preference",
      "title": "short title",
      "content": "detailed memory content",
      "confidence": 0.85
    }
  ]
}`;

  const prompt = `User said: "${userMessage.slice(0, 2000)}"\n\nAssistant replied: "${assistantResponse.slice(0, 2000)}"\n\nExtract any useful memories from this exchange.`;

  try {
    const response = await callLLM(prompt, systemPrompt);
    if (!response) return [];
    let parsedJson = cleanJson(response);
    if (Array.isArray(parsedJson)) {
      parsedJson = { memories: parsedJson };
    }
    const parsed = EXTRACT_SCHEMA.parse(parsedJson);

    return parsed.memories.map((m) => ({
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: m.type,
      title: m.title,
      content: m.content,
      confidence: m.confidence,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.error("[MemoryAgent] Extraction error:", err);
    return [];
  }
}

export async function recallRelevantMemories(
  userMessage: string,
  memories: WokaiMemory[]
): Promise<WokaiMemory[]> {
  if (memories.length === 0) return [];

  const systemPrompt = `You are WokAI's Memory Recall Engine.
Given a user's current message and a list of stored memories, identify which memories are relevant to the current context.

Return strict JSON:
{
  "relevant": [
    { "id": "the memory id", "relevance": 0.9 }
  ]
}`;

  const memoriesBlock = memories
    .map((m) => `[${m.id}] type=${m.type} | ${m.title} | ${m.content}`)
    .join("\n");

  const prompt = `User's current message: "${userMessage.slice(0, 1000)}"\n\nStored memories:\n${memoriesBlock}\n\nWhich memories are relevant?`;

  try {
    const response = await callLLM(prompt, systemPrompt);
    if (!response) return [];
    let parsedJson = cleanJson(response);
    if (Array.isArray(parsedJson)) {
      parsedJson = { relevant: parsedJson };
    }
    const parsed = RECALL_SCHEMA.parse(parsedJson);

    const relevantIds = new Set(parsed.relevant.filter((r) => r.relevance >= 0.3).map((r) => r.id));
    return memories.filter((m) => relevantIds.has(m.id));
  } catch (err) {
    console.error("[MemoryAgent] Recall error:", err);
    return [];
  }
}
