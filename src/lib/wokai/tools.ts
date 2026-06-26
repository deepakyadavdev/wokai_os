import { z } from "zod";

import type { ActionStatus, WokaiToolName } from "@/lib/types";

export interface ToolDefinition {
  name: WokaiToolName;
  description: string;
  subagent: string;
  sensitive: boolean;
  statusWhenPlanned: ActionStatus;
  inputSchema: z.ZodTypeAny;
}

export const toolRegistry: ToolDefinition[] = [
  {
    name: "memory.recall",
    description: "Retrieve user preferences, habits, contacts, and prior commitments before planning.",
    subagent: "MemoryAgent",
    sensitive: false,
    statusWhenPlanned: "COMPLETED",
    inputSchema: z.object({ query: z.string() })
  },
  {
    name: "memory.retain",
    description: "Store a useful user preference or working pattern.",
    subagent: "MemoryAgent",
    sensitive: false,
    statusWhenPlanned: "COMPLETED",
    inputSchema: z.object({ title: z.string(), content: z.string() })
  },
  {
    name: "task.create",
    description: "Create a task with subtasks, deadline, and risk level.",
    subagent: "TaskAgent",
    sensitive: false,
    statusWhenPlanned: "COMPLETED",
    inputSchema: z.object({ title: z.string(), deadline: z.string().optional() })
  },
  {
    name: "task.rescuePlan",
    description: "Generate a last-minute execution plan for urgent work.",
    subagent: "LifeSaverAgent",
    sensitive: false,
    statusWhenPlanned: "COMPLETED",
    inputSchema: z.object({ goal: z.string(), hoursLeft: z.number().optional() })
  },
  {
    name: "gmail.summarize",
    description: "Read inbox metadata, detect urgency, summarize, and draft replies.",
    subagent: "GmailAgent",
    sensitive: true,
    statusWhenPlanned: "NEEDS_APPROVAL",
    inputSchema: z.object({ scope: z.string() })
  },
  {
    name: "gmail.send",
    description: "Send a fresh email to a specific recipient.",
    subagent: "GmailAgent",
    sensitive: true,
    statusWhenPlanned: "NEEDS_APPROVAL",
    inputSchema: z.object({ to: z.string(), subject: z.string().optional(), body: z.string() })
  },
  {
    name: "gmail.search",
    description: "Search and filter Gmail messages using specific query terms (e.g., from:xyz, is:unread, subject:abc).",
    subagent: "GmailAgent",
    sensitive: true,
    statusWhenPlanned: "NEEDS_APPROVAL",
    inputSchema: z.object({ query: z.string() })
  },
  {
    name: "calendar.findSlots",
    description: "Find free time slots and conflicts.",
    subagent: "CalendarAgent",
    sensitive: false,
    statusWhenPlanned: "COMPLETED",
    inputSchema: z.object({ durationMinutes: z.number() })
  },
  {
    name: "calendar.createEvent",
    description: "Create or update a calendar event after approval.",
    subagent: "CalendarAgent",
    sensitive: true,
    statusWhenPlanned: "NEEDS_APPROVAL",
    inputSchema: z.object({ title: z.string(), attendee: z.string().optional() })
  },
  {
    name: "calendar.listEvents",
    description: "List upcoming calendar events with optional query filter.",
    subagent: "CalendarAgent",
    sensitive: true,
    statusWhenPlanned: "NEEDS_APPROVAL",
    inputSchema: z.object({ query: z.string().optional() })
  },
  {
    name: "calendar.deleteEvent",
    description: "Delete or cancel a calendar event matching a search query.",
    subagent: "CalendarAgent",
    sensitive: true,
    statusWhenPlanned: "NEEDS_APPROVAL",
    inputSchema: z.object({ query: z.string() })
  },
  {
    name: "drive.search",
    description: "Search Drive for files relevant to the current task.",
    subagent: "DriveAgent",
    sensitive: false,
    statusWhenPlanned: "COMPLETED",
    inputSchema: z.object({ query: z.string() })
  },
  {
    name: "docs.create",
    description: "Create a Google Doc draft from generated content.",
    subagent: "DocsAgent",
    sensitive: true,
    statusWhenPlanned: "NEEDS_APPROVAL",
    inputSchema: z.object({ title: z.string() })
  },
  {
    name: "sheets.createTracker",
    description: "Create a tracker sheet for tasks, budgets, or deadlines.",
    subagent: "SheetsAgent",
    sensitive: true,
    statusWhenPlanned: "NEEDS_APPROVAL",
    inputSchema: z.object({ title: z.string() })
  },
  {
    name: "slides.createDeck",
    description: "Generate a slide deck outline and optional Slides document.",
    subagent: "SlidesAgent",
    sensitive: true,
    statusWhenPlanned: "NEEDS_APPROVAL",
    inputSchema: z.object({ topic: z.string() })
  },
  {
    name: "contacts.search",
    description: "Find contact email or phone number.",
    subagent: "ContactsAgent",
    sensitive: false,
    statusWhenPlanned: "COMPLETED",
    inputSchema: z.object({ name: z.string() })
  },
  {
    name: "calls.prepare",
    description: "Prepare a safe phone call script, tel link, or Twilio request.",
    subagent: "CallAgent",
    sensitive: true,
    statusWhenPlanned: "NEEDS_APPROVAL",
    inputSchema: z.object({ contact: z.string(), message: z.string() })
  },
  {
    name: "browser.plan",
    description: "Plan browser automation and pause before final submit.",
    subagent: "BrowserAgent",
    sensitive: true,
    statusWhenPlanned: "NEEDS_APPROVAL",
    inputSchema: z.object({ goal: z.string() })
  },
  {
    name: "devices.queueCommand",
    description: "Queue a cross-device command until target device is online.",
    subagent: "DeviceAgent",
    sensitive: true,
    statusWhenPlanned: "QUEUED",
    inputSchema: z.object({ deviceId: z.string(), command: z.string() })
  },
  {
    name: "devices.openApp",
    description: "Launch an application (e.g. VS Code, browser, terminal) on the target device.",
    subagent: "DeviceAgent",
    sensitive: false,
    statusWhenPlanned: "COMPLETED",
    inputSchema: z.object({ deviceId: z.string(), appName: z.string() })
  },
  {
    name: "devices.terminal",
    description: "Execute a command line interface instruction in the target device's shell.",
    subagent: "DeviceAgent",
    sensitive: true,
    statusWhenPlanned: "NEEDS_APPROVAL",
    inputSchema: z.object({ deviceId: z.string(), command: z.string() })
  },
  {
    name: "devices.fileAccess",
    description: "Scan local approved directories and retrieve matching files.",
    subagent: "DeviceAgent",
    sensitive: false,
    statusWhenPlanned: "COMPLETED",
    inputSchema: z.object({ deviceId: z.string(), path: z.string(), pattern: z.string().optional() })
  },
  {
    name: "notifications.create",
    description: "Create an in-app notification or escalation alert.",
    subagent: "NotificationAgent",
    sensitive: false,
    statusWhenPlanned: "COMPLETED",
    inputSchema: z.object({ title: z.string(), body: z.string() })
  },
  {
    name: "maps.estimateTravel",
    description: "Estimate travel buffer for meetings.",
    subagent: "MapsAgent",
    sensitive: false,
    statusWhenPlanned: "COMPLETED",
    inputSchema: z.object({ origin: z.string(), destination: z.string() })
  },
  {
    name: "maps.searchPlaces",
    description: "Search Google Places for nearby locations, businesses, or addresses.",
    subagent: "MapsAgent",
    sensitive: false,
    statusWhenPlanned: "COMPLETED",
    inputSchema: z.object({ query: z.string() })
  },
  {
    name: "maps.getDirections",
    description: "Calculate directions, distance, and duration between origin and destination.",
    subagent: "MapsAgent",
    sensitive: false,
    statusWhenPlanned: "COMPLETED",
    inputSchema: z.object({ origin: z.string(), destination: z.string() })
  },
  {
    name: "search.google",
    description: "Search the web using Google Custom Search API.",
    subagent: "BrowserAgent",
    sensitive: false,
    statusWhenPlanned: "COMPLETED",
    inputSchema: z.object({ query: z.string() })
  }
];

export function getTool(name: WokaiToolName) {
  return toolRegistry.find((tool) => tool.name === name);
}
