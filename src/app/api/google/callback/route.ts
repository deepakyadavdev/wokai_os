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
        redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/google/callback",
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

    const expiresIn = tokens.expires_in ?? 3600;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirect = new URL("/chat", appUrl);
    // Only pass a lightweight success flag — NOT the access token.
    // The token is stored exclusively in SameSite=Strict cookies to
    // prevent leakage via browser history, server logs, and referrer headers.
    redirect.searchParams.set("oauth", "success");

    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    const response = NextResponse.redirect(redirect.toString());

    // Set each cookie individually via the response headers API to comply with RFC 6265.
    // Joining multiple Set-Cookie values with a comma in a single header is invalid.
    response.cookies.set("wokai_google_token", tokens.access_token, {
      path: "/",
      maxAge: expiresIn,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production"
    });
    response.cookies.set("wokai_google_expires", String(Date.now() + expiresIn * 1000), {
      path: "/",
      maxAge: expiresIn,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production"
    });

    // Persist refresh token if provided (only returned on first consent).
    // This enables silent token renewal without forcing re-authentication.
    if (tokens.refresh_token) {
      response.cookies.set("wokai_google_refresh", tokens.refresh_token, {
        path: "/",
        maxAge: 30 * 24 * 3600, // 30 days
        sameSite: "strict",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
      });
    }

    return response;
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${appUrl}/settings?error=callback_error`
    );
  }
}
