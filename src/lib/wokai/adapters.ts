import { isGoogleOAuthConfigured, isTwilioConfigured } from "@/lib/config/env";

export function getGoogleAuthUrl() {
  if (!isGoogleOAuthConfigured()) return null;
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? "",
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: process.env.GOOGLE_SCOPES ?? ""
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
