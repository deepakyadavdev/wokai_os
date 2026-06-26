"use client";

const TOKEN_KEY = "googleAccessToken";
const EXPIRY_KEY = "googleTokenExpiry";

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
 * Returns null if missing or expired.
 */
export function getGoogleToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const expiry = localStorage.getItem(EXPIRY_KEY);
  if (expiry && Date.now() > Number(expiry)) return null;
  return token;
}

/** Remove the stored token and its expiry. */
export function clearGoogleToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
}

/** True when a non-expired token is available. */
export function isGoogleTokenValid(): boolean {
  return getGoogleToken() !== null;
}

/** Milliseconds until the token expires, or 0 if already expired / missing. */
export function tokenExpiresIn(): number {
  if (typeof window === "undefined") return 0;
  const expiry = localStorage.getItem(EXPIRY_KEY);
  if (!expiry) return 0;
  const remaining = Number(expiry) - Date.now();
  return remaining > 0 ? remaining : 0;
}
