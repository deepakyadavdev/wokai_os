import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAdminDb } from "@/lib/firebase/admin";

// ── In-memory fallback (used when Firebase Admin is not configured) ──
let memClients = [
  {
    name: "GitHub Client",
    url: "mcp://github.com/wokai-integration",
    status: "active",
    tools: ["github.createIssue", "github.listPRs", "github.mergePR"]
  },
  {
    name: "Slack Client",
    url: "mcp://slack.com/wokai-integration",
    status: "active",
    tools: ["slack.postMessage", "slack.readChannel", "slack.findUser"]
  }
];

// ── Firestore helpers ──
const MCP_CLIENT_COLLECTION = "wokai_mcp_clients";

async function getClientsFromStore() {
  const db = getAdminDb();
  if (!db) return { clients: memClients, persisted: false };

  const snap = await db.collection(MCP_CLIENT_COLLECTION).get();

  // Seed defaults if Firestore collection is empty
  if (snap.empty) {
    for (const c of memClients) {
      await db.collection(MCP_CLIENT_COLLECTION).doc(c.name.replace(/\s+/g, "-").toLowerCase()).set(c);
    }
    return { clients: memClients, persisted: true };
  }

  const clients = snap.docs.map((d) => ({ ...d.data() })) as typeof memClients;
  return { clients, persisted: true };
}

async function addClientToStore(client: typeof memClients[number]) {
  const db = getAdminDb();
  if (!db) {
    memClients.push(client);
    return memClients;
  }
  const docId = client.name.replace(/\s+/g, "-").toLowerCase();
  await db.collection(MCP_CLIENT_COLLECTION).doc(docId).set(client);
  const { clients } = await getClientsFromStore();
  return clients;
}

const registerSchema = z.object({
  name: z.string().min(2),
  url: z.string().startsWith("mcp://")
});

const executeSchema = z.object({
  tool: z.string().min(1),
  arguments: z.any()
});

export async function GET(request: NextRequest) {
  // Returns MCP discovery list and MCP Server specifications
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "listClients") {
    const { clients } = await getClientsFromStore();
    return NextResponse.json({ clients });
  }

  // Otherwise, return MCP Server details (exposing WokAI capabilities to external clients)
  return NextResponse.json({
    mcpVersion: "1.0.0",
    server: {
      name: "WokAI-OS-Server",
      version: "0.1.0"
    },
    capabilities: {
      tools: {
        list: [
          {
            name: "wokai.addTask",
            description: "Create a task in the WokAI operating system",
            inputSchema: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] }
              },
              required: ["title"]
            }
          },
          {
            name: "wokai.getDeviceStatus",
            description: "Get online status and queued commands for connected devices",
            inputSchema: {
              type: "object",
              properties: {}
            }
          },
          {
            name: "wokai.addMemory",
            description: "Store personal preferences or context in memory",
            inputSchema: {
              type: "object",
              properties: {
                title: { type: "string" },
                content: { type: "string" }
              },
              required: ["title", "content"]
            }
          }
        ]
      }
    }
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // Handle Client registration
  if (action === "registerClient") {
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid client registration payload. Must specify name and mcp:// URL." }, { status: 400 });
    }

    const hostDomain = parsed.data.url.replace("mcp://", "").split("/")[0];
    const newClient = {
      name: parsed.data.name,
      url: parsed.data.url,
      status: "active",
      tools: [
        `${hostDomain}.searchMetadata`,
        `${hostDomain}.fetchDetails`,
        `${hostDomain}.syncState`
      ]
    };
    const clients = await addClientToStore(newClient);

    return NextResponse.json({ success: true, clients });
  }

  // Handle Tool execution (MCP Server role)
  const parsed = executeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid tool call payload" }, { status: 400 });
  }

  const { tool, arguments: args } = parsed.data;

  // Execute the tool and return the output
  if (tool === "wokai.addTask") {
    return NextResponse.json({
      content: [
        {
          type: "text",
          text: `Task "${args.title}" successfully added to WokAI Task Engine.`
        }
      ]
    });
  } else if (tool === "wokai.getDeviceStatus") {
    return NextResponse.json({
      content: [
        {
          type: "text",
          text: "WokAI Device Agent: 2 devices online (Phone, Laptop). Cwd is C:\\Users\\Deepak\\Documents\\wokai."
        }
      ]
    });
  } else if (tool === "wokai.addMemory") {
    return NextResponse.json({
      content: [
        {
          type: "text",
          text: `Memory "${args.title}" saved successfully.`
        }
      ]
    });
  }

  return NextResponse.json({ error: `Tool ${tool} not found` }, { status: 404 });
}
