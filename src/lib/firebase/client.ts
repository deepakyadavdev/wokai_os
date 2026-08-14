"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  type Auth
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

import { isFirebaseConfigured } from "@/lib/config/env";
import { saveGoogleToken } from "@/lib/google/token";

let app: FirebaseApp | null = null;

export function getFirebaseApp() {
  if (!isFirebaseConfigured()) return null;
  if (app) return app;
  app = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
      });
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const firebaseApp = getFirebaseApp();
  return firebaseApp ? getAuth(firebaseApp) : null;
}

export function getFirebaseDb(): Firestore | null {
  const firebaseApp = getFirebaseApp();
  return firebaseApp ? getFirestore(firebaseApp) : null;
}

export async function signInWithGoogle() {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase is not configured.");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  provider.addScope("email");
  provider.addScope("profile");
  provider.addScope("https://www.googleapis.com/auth/gmail.modify");
  provider.addScope("https://www.googleapis.com/auth/calendar");
  provider.addScope("https://www.googleapis.com/auth/drive");
  provider.addScope("https://www.googleapis.com/auth/documents");
  provider.addScope("https://www.googleapis.com/auth/spreadsheets");
  provider.addScope("https://www.googleapis.com/auth/presentations");
  provider.addScope("https://www.googleapis.com/auth/contacts.readonly");

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      saveGoogleToken(credential.accessToken, 3300);
    }
    return result;
  } catch (popupError: any) {
    // Only fall back to redirect when the popup was actually blocked by the browser.
    // If the user intentionally closed the popup, treat it as a silent cancellation.
    if (popupError?.code === "auth/popup-blocked") {
      await signInWithRedirect(auth, provider);
      return null;
    }
    if (
      popupError?.code === "auth/popup-closed-by-user" ||
      popupError?.code === "auth/cancelled-popup-request"
    ) {
      // User intentionally cancelled — do not redirect or throw
      return null;
    }
    throw popupError;
  }
}

export { getRedirectResult };

export async function signOutOfFirebase() {
  const auth = getFirebaseAuth();
  if (auth) await signOut(auth);
}

export async function refreshGoogleToken() {
  return signInWithGoogle();
}
