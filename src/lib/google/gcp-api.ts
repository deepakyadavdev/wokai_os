export interface GcpApiExecutionResult {
  status: "COMPLETED" | "FAILED" | "NEEDS_APPROVAL";
  output: string;
  url?: string;
  data?: any;
}

/**
 * 1. Google Docs API (Docs v1)
 */
export async function createGoogleDoc(token: string, title: string, content: string): Promise<GcpApiExecutionResult> {
  try {
    const createRes = await fetch("https://docs.googleapis.com/v1/documents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ title: title || "WokAI Generated Document" })
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return {
        status: "FAILED",
        output: `Google Docs API error (${createRes.status}): ${errText}`
      };
    }

    const docData = await createRes.json();
    const documentId = docData.documentId;
    const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;

    if (content) {
      await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: content
              }
            }
          ]
        })
      });
    }

    return {
      status: "COMPLETED",
      output: `Google Doc created successfully! Title: "${docData.title}". Link: ${docUrl}`,
      url: docUrl,
      data: docData
    };
  } catch (err: any) {
    return {
      status: "FAILED",
      output: `Failed to execute Google Docs API: ${err?.message || err}`
    };
  }
}

/**
 * 2. Gmail API (Gmail v1) - Send Message
 */
export async function sendGmailMessage(token: string, to: string, subject: string, body: string): Promise<GcpApiExecutionResult> {
  try {
    const targetEmail = to || "user@example.com";
    const messageParts = [
      `To: ${targetEmail}`,
      `Subject: ${subject || "WokAI Action Report"}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'MIME-Version: 1.0',
      '',
      body || "Generated report from WokAI OS."
    ];

    const messageString = messageParts.join('\r\n');
    const encodedMessage = Buffer.from(messageString)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ raw: encodedMessage })
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        status: "FAILED",
        output: `Gmail API error (${res.status}): ${errText}`
      };
    }

    const data = await res.json();
    return {
      status: "COMPLETED",
      output: `Email successfully sent to ${targetEmail} via Gmail API! Message ID: ${data.id}`,
      data
    };
  } catch (err: any) {
    return {
      status: "FAILED",
      output: `Failed to execute Gmail API: ${err?.message || err}`
    };
  }
}

/**
 * 3. Gmail API (Gmail v1) - Search Inbox
 */
export async function searchGmail(token: string, query: string): Promise<GcpApiExecutionResult> {
  try {
    const q = encodeURIComponent(query || "");
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=5`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const errText = await res.text();
      return { status: "FAILED", output: `Gmail Search error (${res.status}): ${errText}` };
    }

    const data = await res.json();
    const count = data.messages ? data.messages.length : 0;
    return {
      status: "COMPLETED",
      output: `Gmail Search for "${query}": Found ${count} matching messages.`,
      data
    };
  } catch (err: any) {
    return { status: "FAILED", output: `Gmail Search API error: ${err?.message || err}` };
  }
}

/**
 * 4. Google Calendar API (Calendar v3) - Create Event
 */
export async function createCalendarEvent(token: string, title: string, description: string): Promise<GcpApiExecutionResult> {
  try {
    const startIso = new Date(Date.now() + 3600 * 1000).toISOString();
    const endIso = new Date(Date.now() + 7200 * 1000).toISOString();

    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        summary: title || "WokAI Scheduled Task",
        description: description || "",
        start: { dateTime: startIso },
        end: { dateTime: endIso }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      return { status: "FAILED", output: `Google Calendar API error (${res.status}): ${errText}` };
    }

    const data = await res.json();
    return {
      status: "COMPLETED",
      output: `Google Calendar Event "${data.summary}" created! Link: ${data.htmlLink}`,
      url: data.htmlLink,
      data
    };
  } catch (err: any) {
    return { status: "FAILED", output: `Failed to execute Google Calendar API: ${err?.message || err}` };
  }
}

/**
 * 5. Google Calendar API (Calendar v3) - List Events
 */
export async function listCalendarEvents(token: string): Promise<GcpApiExecutionResult> {
  try {
    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10&orderBy=startTime&singleEvents=true&timeMin=" + new Date().toISOString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const errText = await res.text();
      return { status: "FAILED", output: `Google Calendar List error (${res.status}): ${errText}` };
    }

    const data = await res.json();
    const items = data.items || [];
    const summaryList = items.map((i: any) => `• ${i.summary} (${i.start?.dateTime || i.start?.date})`).join("\n");
    return {
      status: "COMPLETED",
      output: `Fetched ${items.length} upcoming Calendar events:\n${summaryList || "No upcoming events."}`,
      data
    };
  } catch (err: any) {
    return { status: "FAILED", output: `Calendar List API error: ${err?.message || err}` };
  }
}

/**
 * 6. Google Drive API (Drive v3) - Search Files
 */
export async function searchGoogleDrive(token: string, rawQuery: string): Promise<GcpApiExecutionResult> {
  try {
    // Extract search target keyword from raw query string
    let keyword = rawQuery.replace(/['"]/g, "").trim();
    const match = rawQuery.match(/['"]([^'"]+)['"]/);
    if (match && match[1]) {
      keyword = match[1];
    } else {
      keyword = keyword
        .replace(/^(execute action for:|search google drive for|search drive for|search|find|look for|get|fetch|list|show)\s+(for\s+)?/i, "")
        .replace(/\s+(file|files|doc|document|in my drive|my drive|google drive|drive)$/i, "")
        .trim();
    }

    let q = "trashed = false";
    if (keyword && keyword.length > 0) {
      // Escape single quotes inside keyword to prevent Drive query syntax error
      const safeKeyword = keyword.replace(/'/g, "\\'");
      q = `name contains '${safeKeyword}' and trashed = false`;
    }

    let res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&pageSize=10&fields=files(id,name,mimeType,webViewLink)`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const errText = await res.text();
      return { status: "FAILED", output: `Google Drive API error (${res.status}): ${errText}` };
    }

    let data = await res.json();
    let files = data.files || [];

    // No silent fallback — if the user searched for a specific keyword and got
    // 0 results, return an honest empty result instead of unrelated recent files.
    // This complies with Rule 1: Never Invent Facts.

    const fileList = files.map((f: any) => `• [${f.name}](${f.webViewLink})`).join("\n");
    return {
      status: "COMPLETED",
      output: files.length > 0
        ? `Google Drive found ${files.length} file(s):\n${fileList}`
        : `Google Drive Search complete: No matching files found.`,
      data
    };
  } catch (err: any) {
    return { status: "FAILED", output: `Google Drive API error: ${err?.message || err}` };
  }
}

/**
 * 7. Google Sheets API (Sheets v4) - Create Tracker / Spreadsheet
 */
export async function createGoogleSheet(token: string, title: string, content: string): Promise<GcpApiExecutionResult> {
  try {
    const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        properties: { title: title || "WokAI Tracker Sheet" }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      return { status: "FAILED", output: `Google Sheets API error (${res.status}): ${errText}` };
    }

    const data = await res.json();
    const sheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`;
    return {
      status: "COMPLETED",
      output: `Google Sheet created successfully! Title: "${data.properties?.title}". Access URL: ${sheetUrl}`,
      url: sheetUrl,
      data
    };
  } catch (err: any) {
    return { status: "FAILED", output: `Sheets API error: ${err?.message || err}` };
  }
}

/**
 * 8. Google Slides API (Slides v1) - Create Presentation Deck
 */
export async function createGoogleSlides(token: string, title: string, content: string): Promise<GcpApiExecutionResult> {
  try {
    const res = await fetch("https://slides.googleapis.com/v1/presentations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: title || "WokAI Presentation Deck"
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      return { status: "FAILED", output: `Google Slides API error (${res.status}): ${errText}` };
    }

    const data = await res.json();
    const slidesUrl = `https://docs.google.com/presentation/d/${data.presentationId}/edit`;
    return {
      status: "COMPLETED",
      output: `Google Slides Deck created successfully! Title: "${data.title}". Access URL: ${slidesUrl}`,
      url: slidesUrl,
      data
    };
  } catch (err: any) {
    return { status: "FAILED", output: `Slides API error: ${err?.message || err}` };
  }
}

/**
 * 9. Google People API (Contacts v1) - Search Contacts
 */
export async function searchGoogleContacts(token: string, query: string): Promise<GcpApiExecutionResult> {
  try {
    const res = await fetch(`https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers&pageSize=10`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const errText = await res.text();
      return { status: "FAILED", output: `Google People API error (${res.status}): ${errText}` };
    }

    const data = await res.json();
    const connections = data.connections || [];
    const contactList = connections.map((c: any) => {
      const name = c.names?.[0]?.displayName || "Unknown";
      const email = c.emailAddresses?.[0]?.value || "No Email";
      return `• ${name} (${email})`;
    }).join("\n");

    return {
      status: "COMPLETED",
      output: `Google Contacts API retrieved ${connections.length} contacts:\n${contactList || "No contacts found."}`,
      data
    };
  } catch (err: any) {
    return { status: "FAILED", output: `Contacts API error: ${err?.message || err}` };
  }
}

/**
 * 10. Google Places API (Maps) - Search Nearby Places
 */
export async function searchGooglePlaces(query: string): Promise<GcpApiExecutionResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  if (!apiKey) {
    return {
      status: "FAILED",
      output: `[Google Maps Places] GOOGLE_MAPS_API_KEY is not configured. Set it in .env to enable live places search. Query was: "${query}".`
    };
  }
  try {
    const q = encodeURIComponent(query);
    const res = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${q}&key=${apiKey}`);
    if (!res.ok) return { status: "FAILED", output: `Google Places API error (${res.status})` };
    const data = await res.json();
    const results = data.results || [];
    const placeList = results.slice(0, 5).map((p: any) => `• ${p.name} - ${p.formatted_address} (Rating: ${p.rating || "N/A"})`).join("\n");
    return {
      status: "COMPLETED",
      output: `Google Places search for "${query}":\n${placeList || "No places found."}`,
      data
    };
  } catch (err: any) {
    return { status: "FAILED", output: `Places API error: ${err?.message || err}` };
  }
}

/**
 * 11. Google Directions API (Maps) - Get Directions
 */
export async function getGoogleDirections(origin: string, destination: string): Promise<GcpApiExecutionResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  if (!apiKey) {
    return {
      status: "FAILED",
      output: `[Google Maps Directions] GOOGLE_MAPS_API_KEY is not configured. Set it in .env for live route calculation. Route: "${origin}" → "${destination}".`
    };
  }
  try {
    const orig = encodeURIComponent(origin);
    const dest = encodeURIComponent(destination);
    const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${orig}&destination=${dest}&key=${apiKey}`);
    if (!res.ok) return { status: "FAILED", output: `Google Directions API error (${res.status})` };
    const data = await res.json();
    const route = data.routes?.[0]?.legs?.[0];
    if (!route) return { status: "COMPLETED", output: `No directions route found between ${origin} and ${destination}.` };
    return {
      status: "COMPLETED",
      output: `Route from ${origin} to ${destination}: Distance ${route.distance?.text}, Duration ${route.duration?.text}.`,
      data
    };
  } catch (err: any) {
    return { status: "FAILED", output: `Directions API error: ${err?.message || err}` };
  }
}
