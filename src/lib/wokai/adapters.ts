import { isGoogleOAuthConfigured, isTwilioConfigured } from "@/lib/config/env";
import {
  createGoogleDoc,
  sendGmailMessage,
  searchGmail,
  createCalendarEvent,
  listCalendarEvents,
  searchGoogleDrive,
  createGoogleSheet,
  createGoogleSlides,
  searchGoogleContacts,
  searchGooglePlaces,
  getGoogleDirections
} from "@/lib/google/gcp-api";

export function getGoogleAuthUrl() {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  if (!clientId) return null;

  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/google/callback";
  const defaultScopes = "https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/presentations https://www.googleapis.com/auth/contacts.readonly";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: (process.env.GOOGLE_SCOPES || defaultScopes).replace(/\\n/g, " ")
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function createOutboundCall(to: string, message: string) {
  if (!isTwilioConfigured() || !process.env.TWILIO_PHONE_NUMBER) {
    return {
      mode: "demo" as const,
      telHref: `tel:${to}`,
      script: message
    };
  }

  const body = new URLSearchParams({
    To: to,
    From: process.env.TWILIO_PHONE_NUMBER,
    Twiml: `<Response><Say>${escapeXml(message)}</Say></Response>`
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Calls.json`,
    {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded"
      },
      body
    }
  );

  if (!response.ok) {
    return {
      mode: "demo" as const,
      telHref: `tel:${to}`,
      script: message,
      error: "Twilio request failed; returned safe dialer fallback."
    };
  }

  const call = (await response.json()) as { sid?: string; status?: string };
  return {
    mode: "twilio" as const,
    sid: call.sid,
    status: call.status
  };
}

/**
 * Executes real GCP REST APIs (Docs, Sheets, Slides, Drive, Gmail, Calendar, Contacts/People, Maps)
 * when authenticated tokens are provided, or returns an honest NEEDS_APPROVAL status if unauthenticated.
 */
export async function executeAdapterAction(action: any, googleToken?: string) {
  // Only use actual Google OAuth access tokens — never fall back to API keys
  // (Gemini/Firebase API keys are not valid OAuth Bearer tokens for GCP REST APIs).
  const activeToken =
    googleToken ||
    process.env.GOOGLE_ACCESS_TOKEN ||
    "";
  const toolName = action.tool || "";
  const content = action.content || "";
  const label = action.label || "";

  // 1. Google Docs API
  if (toolName === "docs.create" || toolName === "docs") {
    if (activeToken) {
      let docTitle = label;
      if (!docTitle || docTitle.startsWith("Execute action") || docTitle.startsWith("Create Google Doc") || docTitle.toLowerCase().includes("page")) {
        const titleLine = content.split("\n").find((l: string) => l.trim().startsWith("#"));
        docTitle = titleLine
          ? titleLine.replace(/^#+\s*/, "").trim()
          : label.replace(/^(create|write|make|generate)\s+(a|an)?\s+(\d+-page|page)?\s*(google\s*)?(doc|docs|document|file)\s*(on|about|for|on topic|mainy on topic)?\s*/i, "").trim() || "WokAI Document";
      }
      const res = await createGoogleDoc(activeToken, docTitle, content);
      return { status: res.status, output: res.output, url: res.url };
    }
    return {
      status: "NEEDS_APPROVAL" as const,
      output: `[Pending Google OAuth] Ready to create Google Doc: "${label}". Connect Google OAuth in Settings or pass your Google Access Token to execute.`
    };
  }

  // 2. Google Sheets API (Spreadsheet / Tracker)
  if (toolName === "sheets.createTracker" || toolName.startsWith("sheets")) {
    if (activeToken) {
      const res = await createGoogleSheet(activeToken, label, content);
      return { status: res.status, output: res.output, url: res.url };
    }
    return {
      status: "NEEDS_APPROVAL" as const,
      output: `[Pending Google OAuth] Ready to create Google Sheet: "${label}". Connect Google OAuth in Settings to execute.`
    };
  }

  // 3. Google Slides API (Presentation Deck)
  if (toolName === "slides.createDeck" || toolName.startsWith("slides")) {
    if (activeToken) {
      const res = await createGoogleSlides(activeToken, label, content);
      return { status: res.status, output: res.output, url: res.url };
    }
    return {
      status: "NEEDS_APPROVAL" as const,
      output: `[Pending Google OAuth] Ready to create Google Slides Presentation: "${label}". Connect Google OAuth in Settings to execute.`
    };
  }

  // 4. Google Drive API (File Search)
  if (toolName === "drive.search" || toolName.startsWith("drive")) {
    if (activeToken) {
      const res = await searchGoogleDrive(activeToken, label);
      return { status: res.status, output: res.output };
    }
    return {
      status: "NEEDS_APPROVAL" as const,
      output: `[Pending Google OAuth] Ready to search Google Drive for: "${label}". Connect Google OAuth in Settings to execute.`
    };
  }

  // 5. Gmail API (Send Message)
  if (toolName === "gmail.send") {
    if (activeToken) {
      const fullTextToMatch = `${label} ${content}`;
      const emailMatch = fullTextToMatch.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      const recipient = emailMatch ? emailMatch[1] : "user@example.com";
      const subject = label.length > 60 ? label.slice(0, 57) + "..." : label;
      const res = await sendGmailMessage(activeToken, recipient, subject, content);
      return { status: res.status, output: res.output };
    }
    return {
      status: "NEEDS_APPROVAL" as const,
      output: `[Pending Google OAuth] Ready to send email via Gmail API: "${label}". Connect Google OAuth in Settings to execute.`
    };
  }

  // 6. Gmail API (Search / Summarize)
  if (toolName === "gmail.search" || toolName === "gmail.summarize") {
    if (activeToken) {
      const res = await searchGmail(activeToken, label);
      return { status: res.status, output: res.output };
    }
    return {
      status: "NEEDS_APPROVAL" as const,
      output: `[Pending Google OAuth] Ready to search Gmail inbox for: "${label}". Connect Google OAuth in Settings to execute.`
    };
  }

  // 7. Google Calendar API (Create Event)
  if (toolName === "calendar.createEvent") {
    if (activeToken) {
      const res = await createCalendarEvent(activeToken, label, content);
      return { status: res.status, output: res.output, url: res.url };
    }
    return {
      status: "NEEDS_APPROVAL" as const,
      output: `[Pending Google OAuth] Ready to create Google Calendar Event: "${label}". Connect Google OAuth in Settings to execute.`
    };
  }

  // 8. Google Calendar API (List Events)
  if (toolName === "calendar.listEvents" || toolName === "calendar.findSlots") {
    if (activeToken) {
      const res = await listCalendarEvents(activeToken);
      return { status: res.status, output: res.output };
    }
    return {
      status: "NEEDS_APPROVAL" as const,
      output: `[Pending Google OAuth] Ready to fetch Google Calendar events. Connect Google OAuth in Settings to execute.`
    };
  }

  // 9. Google People API (Contacts Search)
  if (toolName === "contacts.search" || toolName.startsWith("contacts")) {
    if (activeToken) {
      const res = await searchGoogleContacts(activeToken, label);
      return { status: res.status, output: res.output };
    }
    return {
      status: "NEEDS_APPROVAL" as const,
      output: `[Pending Google OAuth] Ready to search Google Contacts for: "${label}". Connect Google OAuth in Settings to execute.`
    };
  }

  // 10. Google Maps API (Places Search)
  if (toolName === "maps.searchPlaces") {
    const res = await searchGooglePlaces(label);
    return { status: res.status, output: res.output };
  }

  // 11. Google Maps API (Directions / Distance)
  if (toolName === "maps.getDirections" || toolName === "maps.estimateTravel") {
    const parts = label.split(/ to | from /i);
    const origin = parts[0] || "Origin";
    const dest = parts[1] || "Destination";
    const res = await getGoogleDirections(origin, dest);
    return { status: res.status, output: res.output };
  }

  // Default fallback — unknown tool name
  if (activeToken) {
    return {
      status: "FAILED" as const,
      output: `Unsupported tool: "${toolName}". No GCP API adapter exists for this action.`
    };
  }

  return {
    status: "NEEDS_APPROVAL" as const,
    output: `[Action Staged] Tool: ${toolName}. Awaiting user approval & OAuth token for execution.`
  };
}
