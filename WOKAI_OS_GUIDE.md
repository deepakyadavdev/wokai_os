# WokAI Distributed AI OS - Complete Reference Guide

WokAI is a distributed productivity operating system that acts as a conductor to plan tasks, recall user preferences, control local devices, execute browser automation safely, and manage developer tools via the Model Context Protocol (MCP).

---

## 1. Core Architecture: How It Works

WokAI replaces standard conversational chat interfaces with a structured **Conductor Loop**:

```
[User Request]
       │
       ▼
[Gemini Conductor] ◄───[Reads Context]─── (Memory, Tasks, Device Statuses)
       │
       ▼
[Structured AgentPlan]
       │
  ┌────┴────────────────────────┐
  ▼                             ▼
[Safe Actions]          [Sensitive Actions] (Awaiting Approval)
  │                             │
  ▼                             ▼
[Direct Run]            [User Clicks "Approve"]
  │                             │
  └──────────────┬──────────────┘
                 ▼
          [Local Agents /]
          [Browser Workers]
                 │
                 ▼
          [Centralized Logs]
```

1. **Request Intake:** The user enters a natural language command (e.g. *"Check my emails and send a summary to my laptop"*).
2. **Context Resolution:** The planner in [agent.ts](file:///C:/Users/Deepak/Documents/wokai/src/lib/wokai/agent.ts) reads user preference memories, active task deadlines, and connected device statuses.
3. **Structured Plan:** The Gemini API deconstructs the request into a strictly-typed `AgentPlan` schema containing reasoning blocks, recommended tasks, memory writes, and a list of tool operations (`WokaiAction[]`).
4. **Execution Gate:** Safe actions execute immediately. Sensitive actions (e.g., sending emails, placing Twilio phone calls, executing shell scripts, submitting browser forms) pause in the UI as approval cards.
5. **Execution & Feedback:** Once approved, tasks are dispatched to local device agents or browser automation workers. Output results are written back, and actions are logged to the centralized Activity Feed.

---

## 2. Platform Engines & Capabilities

### 🧠 Memory Engine
* **Purpose:** Stores user habits, stable preferences, and contacts to personalize plan generation.
* **Hindsight Writes:** The conductor automatically saves new preferences when it detects statements like *"I study better at night"* or *"Rahul usually responds after 4 PM"*.
* **Firestore Schema:** Persists under `users/{uid}/memories/{memoryId}` with fields: `type`, `title`, `content`, and `confidence`.

### ⚡ Task Engine & Rescue Mode
* **Purpose:** Calculates urgency metrics to prioritize and save slipping work.
* **Risk Levels:** Tasks are scored as `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`.
* **Rescue Logic:** If a high-priority task is close to its deadline and progress is low, WokAI alerts the user, creates a time-blocked focus plan, and defer non-essential subtasks.

### 🛡️ Approval Engine
* **Purpose:** Ensures the AI never executes external actions silently.
* **UI/UX Cards:** Renders specialized components for Emails, Calendar Events, Calls, Browser Forms, and Terminals.
* **Interactivity:** Approving an action triggers calls to native adapters, changing action states from `NEEDS_APPROVAL` to `RUNNING` to `COMPLETED` dynamically.

### 📊 Activity Engine
* **Purpose:** Centralized transaction log of all OS events (apps opened, events created, emails drafted, commands run).
* **Sync Mechanism:** Reads active operations directly from the workspace snapshot state, rendering a timeline of all completed and pending tasks on the Activity page.

---

## 3. Real Device Control & App Execution

Local device operation relies on a lightweight **WokAgent Daemon** running directly on your Windows, Mac, or mobile device.

### Device Registration & ID Generation
* Upon installation, the local agent performs a system scan, registers its name/kind (phone, laptop, tablet, desktop) via the registration endpoint (`POST /api/devices`), and receives a secure Device ID and access token.

### Long-Polling/Websocket Queue
* The local agent polls `GET /api/devices?deviceId={id}`:
  * The server returns pending queued commands (e.g., `devices.openApp` or `devices.terminal`).
  * The server updates the device's `lastSeen` timestamp to show it as "Online" in the dashboard.

### Local Executor & Terminal Control
* **App Launching:** Maps standard requests to executable hooks. For example, receiving `OPEN_APP` with `VS Code` triggers `start code` (Windows) or `open -a "Visual Studio Code"` (macOS).
* **Terminal Shell:** Runs scripts within a subprocess wrapper. Terminal instructions are marked as sensitive, requiring the user to click **Approve** in the chat console before the daemon executes the CLI commands and streams back output logs.
* **File Access:** Scans approved directories (e.g., `Documents/` or `Downloads/`) for files matching specific search terms, returning matches for the planner to summarize.

---

## 4. Playwright Browser Hand-off

For web automation, WokAI routes operations to a Playwright worker endpoint (`LOCAL_BROWSER_AGENT_URL`, default: `http://localhost:4317`).

1. **Step Generation:** The planner breaks down web goals into granular actions (e.g., `Open website`, `Fill login fields`, `Upload Resume`, `Submit Form`).
2. **Execution Pause:** The Playwright runner opens a browser page, executes navigation and input steps, and automatically **pauses** right before submitting forms or completing payments.
3. **Approval Cycle:** The browser agent captures a live screenshot, streams the status back to WokAI, and waits for user approval. Clicking **Approve** on the Browser card triggers the runner to execute the final click event.

---

## 5. Dual-Role MCP (Model Context Protocol)

WokAI implements a double-sided MCP surface to integrate seamlessly into modern developer workflows:

### A. WokAI as an MCP Client
* You can register external developer tools by adding `mcp://` URLs under **Settings > MCP Layer** (e.g., connecting a GitHub or Slack MCP server).
* The planner indexes these external tools and automatically routes operations to them (e.g., planning a `github.createIssue` or `slack.postMessage` action).

### B. WokAI as an MCP Server
* External tools (such as Cursor, Windsurf, or custom developer environments) can connect to the `/api/mcp` endpoint of your WokAI deployment.
* Exposes capabilities like adding tasks (`wokai.addTask`), fetching device statuses (`wokai.getDeviceStatus`), and storing memory preferences (`wokai.addMemory`).

---

## 6. Environment & Configuration Variables

Create a `.env.local` file in your project root to unlock the following capabilities:

| Variable | Description | Config Scope |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | Base URL of the deployed Next.js application. | Global |
| `NEXT_PUBLIC_DEMO_MODE` | Set to `false` to disable mocked data and enable live Firestore database reads/writes. | UI & Core |
| `GEMINI_API_KEY` | Google Generative AI key for live planning. | Planner |
| `GEMINI_MODEL` | Set model ID (defaults to `gemini-1.5-flash`). | Planner |
| `NEXT_PUBLIC_FIREBASE_*` | API Key, Auth Domain, Project ID, App ID for Firebase Auth and Firestore. | Database |
| `GOOGLE_CLIENT_ID` | OAuth Client ID for workspace scopes. | Gmail/Calendar/Drive |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret for workspace scopes. | Gmail/Calendar/Drive |
| `GOOGLE_REDIRECT_URI` | Auth redirect endpoint (e.g. `http://localhost:3000/api/google/callback`). | Gmail/Calendar/Drive |
| `TWILIO_ACCOUNT_SID` | Twilio API credentials for phone call integration. | Calls |
| `TWILIO_AUTH_TOKEN` | Twilio API credentials for phone call integration. | Calls |
| `TWILIO_PHONE_NUMBER` | Twilio virtual phone number for placing calls. | Calls |
| `LOCAL_BROWSER_AGENT_URL` | Endpoint of the local browser automation server (e.g. `http://localhost:4317`). | Browser Agent |
| `BROWSER_AGENT_MODE` | Set to `local` to route tasks to the local Playwright worker. | Browser Agent |
