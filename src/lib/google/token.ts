"use client";

const TOKEN_KEY = "googleAccessToken";
const EXPIRY_KEY = "googleTokenExpiry";
const COOKIE_TOKEN = "wokai_google_token";
const COOKIE_EXPIRES = "wokai_google_expires";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Save a Google OAuth access token with expiry tracking.
 * Default TTL is 55 minutes (Google tokens last 60, with safety margin).
 */
export function saveGoogleToken(accessToken: string, expiresInSeconds = 3300) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresInSeconds * 1000));
}

/**
 * Returns the stored access token if it exists and has not expired.
 * Checks localStorage first, then falls back to cookies (for OAuth callback flow).
 * Returns null if missing or expired.
 */
export function getGoogleToken(): string | null {
  if (typeof window === "undefined") return null;

  // Check localStorage first (manually entered tokens)
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    const expiry = localStorage.getItem(EXPIRY_KEY);
    if (expiry && Date.now() > Number(expiry)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EXPIRY_KEY);
      return null;
    }
    return token;
  }

  // Fallback to cookie (set by OAuth callback)
  const cookieToken = readCookie(COOKIE_TOKEN);
  if (!cookieToken) return null;
  const cookieExpiry = readCookie(COOKIE_EXPIRES);
  if (cookieExpiry && Date.now() > Number(cookieExpiry)) return null;

  // Promote cookie token to localStorage for future reads
  saveGoogleToken(cookieToken, cookieExpiry ? Math.max(60, (Number(cookieExpiry) - Date.now()) / 1000) : 3300);
  return cookieToken;
}

/** Remove the stored token and its expiry from both storage and cookies. */
export function clearGoogleToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  document.cookie = `${COOKIE_TOKEN}=; Path=/; Max-Age=0; SameSite=Strict`;
  document.cookie = `${COOKIE_EXPIRES}=; Path=/; Max-Age=0; SameSite=Strict`;
}

/** True when a non-expired token is available. */
export function isGoogleTokenValid(): boolean {
  return getGoogleToken() !== null;
}

/** Milliseconds until the token expires, or 0 if already expired / missing. */
export function tokenExpiresIn(): number {
  if (typeof window === "undefined") return 0;
  const expiry = localStorage.getItem(EXPIRY_KEY);
  if (expiry) {
    const remaining = Number(expiry) - Date.now();
    return remaining > 0 ? remaining : 0;
  }
  const cookieExpiry = readCookie(COOKIE_EXPIRES);
  if (cookieExpiry) {
    const remaining = Number(cookieExpiry) - Date.now();
    return remaining > 0 ? remaining : 0;
  }
  return 0;
}
