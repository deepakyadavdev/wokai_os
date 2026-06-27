"use client";

import * as React from "react";
import { onAuthStateChanged, GoogleAuthProvider, type User } from "firebase/auth";

import { getFirebaseAuth, signInWithGoogle, signOutOfFirebase } from "@/lib/firebase/client";
import { saveUserProfile } from "@/lib/firebase/workspace-store";
import type { UserProfile } from "@/lib/types";

interface AuthContextValue {
  user: UserProfile | null;
  firebaseConfigured: boolean;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const localUser: UserProfile = {
  uid: "local-user",
  name: "Deepak Yadav",
  email: "deepak.yadav@gmail.com"
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

function toProfile(user: User): UserProfile {
  return {
    uid: user.uid,
    name: user.displayName ?? "Deepak Yadav",
    email: user.email ?? "deepak.yadav@gmail.com",
    photoURL: user.photoURL ?? undefined
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const auth = getFirebaseAuth();
  const firebaseConfigured = Boolean(auth);
  const [loading, setLoading] = React.useState(firebaseConfigured);

  const isElectron = typeof window !== "undefined" && window.navigator.userAgent.toLowerCase().indexOf("electron") > -1;

  // Poll companion server for session in Electron mode
  React.useEffect(() => {
    if (!isElectron) return undefined;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("http://localhost:4317/auth/session").catch(() => null);
        if (res && res.ok) {
          const session = await res.json().catch(() => null);
          if (session && session.token && session.profile) {
            localStorage.setItem("googleAccessToken", session.token);
            setUser(session.profile);
            clearInterval(interval);
          }
        }
      } catch (e) {}
    }, 1200);

    return () => clearInterval(interval);
  }, [isElectron]);

  React.useEffect(() => {
    if (!auth) {
      // Offline/Local dev mode
      setUser(localUser);
      setLoading(false);
      return undefined;
    }

    return onAuthStateChanged(auth, async (firebaseUser) => {
      const profile = firebaseUser ? toProfile(firebaseUser) : null;
      setUser(profile || localUser);
      
      if (profile) {
        await saveUserProfile(profile);

        // Check if browser logged in to dispatch to Electron companion
        if (typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          const isDesktopFlow = urlParams.get("desktop") === "true" || sessionStorage.getItem("desktopFlow") === "true";
          if (isDesktopFlow && firebaseUser) {
            try {
              const token = await firebaseUser.getIdToken();
              await fetch("http://localhost:4317/auth/callback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, profile: toProfile(firebaseUser) })
              });
              sessionStorage.removeItem("desktopFlow");
            } catch (err) {
              console.error("[WokAI OS] Auth callback to companion failed:", err);
            }
          }
        }
      }
      setLoading(false);
    });
  }, [auth]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      firebaseConfigured,
      loading,
      signIn: async () => {
        if (isElectron) {
          // Redirect the user to their standard system web browser for secure login
          const currentUrl = typeof window !== "undefined" ? window.location.origin : "https://wokai-os.vercel.app";
          window.open(`${currentUrl}/auth/login?desktop=true`, "_blank");
          return;
        }

        if (!auth) {
          setUser(localUser);
          return;
        }
        const credential = await signInWithGoogle();
        const googleCredential = GoogleAuthProvider.credentialFromResult(credential);
        const accessToken = googleCredential?.accessToken;
        if (accessToken) {
          localStorage.setItem("googleAccessToken", accessToken);
        }
        const profile = toProfile(credential.user);
        setUser(profile);
        await saveUserProfile(profile);
      },
      signOut: async () => {
        if (auth) await signOutOfFirebase();
        if (isElectron || typeof window !== "undefined") {
          await fetch("http://localhost:4317/auth/clear", { method: "POST" }).catch(() => null);
        }
        setUser(firebaseConfigured ? null : localUser);
      }
    }),
    [auth, firebaseConfigured, loading, user, isElectron]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
