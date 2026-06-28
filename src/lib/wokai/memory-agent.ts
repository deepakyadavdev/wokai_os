import { z } from "zod";

import type { WokaiMemory } from "@/lib/types";

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

type MemoryToExtract = {
  type: (typeof MEMORY_TYPES)[number];
  title: string;
  content: string;
  confidence: number;
};

type MemoryToRecall = {
  id: string;
  relevance: number;
};

async function callLLM(prompt: string, systemPrompt: string): Promise<string> {
  const { callLLM: callLLMDefault } = await import("@/lib/wokai/agent");
  return callLLMDefault(prompt, systemPrompt);
}

export async function extractMemories(
  userMessage: string,
  assistantResponse: string
): Promise<WokaiMemory[]> {
  const systemPrompt = `You are WokAI's Memory Extraction Engine.
Your job is to extract useful, actionable memories from the conversation.

Extract memories ONLY when the user reveals something specific and useful about themselves:
- Personal preferences (e.g. "I prefer working late at night" → preference)
- Habits and routines (e.g. "I always start my day with coffee" → habit)
- Important contacts (e.g. "My manager is Rajesh" → contact)
- Deadlines and commitments (e.g. "The project is due Friday" → deadline)
- Context that helps future conversations (e.g. "I'm preparing for a DevOps interview" → context)
- Skills and abilities (e.g. "I know Python and React" → skill)
- Relationships (e.g. "My brother lives in Bangalore" → relationship)

Rules:
1. ONLY extract when the user explicitly shares information. Do NOT extract from hypothetical or generic statements.
2. Each memory must be concise (title ≤ 80 chars, content ≤ 500 chars).
3. Maximum 5 memories per extraction.
4. If no useful memories are found, return an empty array.
5. Do NOT extract temporary or one-off statements (e.g. "I'm hungry", "It's raining").
6. Generate a unique-looking ID for each memory (format: mem_<timestamp>_<random>).
7. Confidence should reflect how certain you are this is worth remembering.

Return strict JSON matching this schema:
{
  "memories": [
    {
      "type": "preference" | "habit" | "contact" | "deadline" | "context" | "skill" | "relationship",
      "title": "short descriptive title",
      "content": "detailed memory content",
      "confidence": 0.85
    }
  ]
}`;

  const prompt = `User said: "${userMessage.slice(0, 2000)}"\n\nAssistant replied: "${assistantResponse.slice(0, 2000)}"\n\nExtract any useful memories from this exchange.`;

  try {
    const response = await callLLM(prompt, systemPrompt);
    const cleanJson = response.replace(/```json|```/g, "").trim();
    const parsed = EXTRACT_SCHEMA.parse(JSON.parse(cleanJson));

    return parsed.memories.map((m, idx) => ({
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

Rules:
1. Only include memories that would genuinely help answer or personalize the response.
2. Score relevance from 0.0 (not relevant) to 1.0 (highly relevant).
3. Minimum relevance threshold: 0.3
4. Return at most 8 memories.
5. If none are relevant, return an empty array.

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
    const cleanJson = response.replace(/```json|```/g, "").trim();
    const parsed = RECALL_SCHEMA.parse(JSON.parse(cleanJson));

    const relevantIds = new Set(parsed.relevant.filter((r) => r.relevance >= 0.3).map((r) => r.id));
    return memories.filter((m) => relevantIds.has(m.id));
  } catch (err) {
    console.error("[MemoryAgent] Recall error:", err);
    return [];
  }
}
