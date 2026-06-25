# WokAI Architecture

## Runtime Shape

WokAI has a standalone app runtime and an OMP-inspired agent design.

- **Next.js App Router:** route groups power the operating-system surface.
- **Client workspace state:** demo mode persists to localStorage; live mode can write agent results to Firestore.
- **Route handlers:** `/api/agent/chat`, `/api/google/auth-url`, `/api/browser-agent`, and `/api/calls`.
- **Agent conductor:** `src/lib/wokai/agent.ts` maps natural language to intent, risk, plan, actions, task creation, and memory writes.
- **Tool registry:** `src/lib/wokai/tools.ts` defines every tool, subagent owner, sensitivity, and planned status.
- **Adapters:** `src/lib/wokai/adapters.ts` and `browser-agent.ts` keep external APIs behind safe boundaries.

## OMP Concepts In The App

- **Subagents:** each tool belongs to a specialist agent: MemoryAgent, TaskAgent, LifeSaverAgent, GmailAgent, CalendarAgent, DriveAgent, DocsAgent, SheetsAgent, SlidesAgent, ContactsAgent, CallAgent, BrowserAgent, DeviceAgent, NotificationAgent, and MapsAgent.
- **Plan mode:** sensitive tools return `NEEDS_APPROVAL`; browser workflows pause before risky steps.
- **Hindsight memory:** memories are written when the user states stable preferences such as "I study better at night."
- **Typed tool results:** chat responses return structured `AgentPlan` JSON, not prose-only logs.
- **Auditability:** every action has tool name, label, status, sensitivity, and timestamp.
- **MCP-ready surface:** `.mcp.json` is present, and the registry can be expanded without changing UI contracts.

## Data Model

Firestore collections are user-scoped:

- `users`
- `tasks`
- `memories`
- `meetings`
- `emails`
- `contacts`
- `devices`
- `call_logs`
- `notifications`
- `chat_summaries`
- `browser_jobs`
- `integrations`
- `actions`
- `audit_logs`

The demo data mirrors these collections so the app is usable before credentials are connected.

## Safety

WokAI never silently performs sensitive actions. These require explicit approval:

- sending email
- creating/updating/deleting calendar events
- placing calls
- submitting browser forms
- uploading files
- payments
- cross-device commands
