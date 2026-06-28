import { NextRequest, NextResponse } from "next/server";

import { isGoogleOAuthConfigured } from "@/lib/config/env";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json(
      { error: "Google OAuth is not configured." },
      { status: 503 }
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${appUrl}/settings?error=missing_code`
    );
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? "",
        grant_type: "authorization_code"
      })
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => "");
      console.error("Google token exchange failed:", errText);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      return NextResponse.redirect(
        `${appUrl}/settings?error=token_exchange_failed`
      );
    }

    const tokens = (await tokenRes.json()) as {
      access_token: string;
      expires_in?: number;
      refresh_token?: string;
    };

    // Store token in SameSite=Strict cookie instead of URL query params.
    // SameSite=Strict prevents the cookie from being sent on cross-origin requests,
    // and avoids token leakage via browser history, server logs, and referrer headers.
    const expiresIn = tokens.expires_in ?? 3600;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirect = new URL("/settings", appUrl);
    redirect.searchParams.set("oauth", "success");

    return NextResponse.redirect(redirect.toString(), {
      headers: {
        "Set-Cookie": [
          `wokai_google_token=${encodeURIComponent(tokens.access_token)}; Path=/; Max-Age=${expiresIn}; SameSite=Strict${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
          `wokai_google_expires=${String(Date.now() + expiresIn * 1000)}; Path=/; Max-Age=${expiresIn}; SameSite=Strict${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
        ].join(", ")
      }
    });
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${appUrl}/settings?error=callback_error`
    );
  }
}
