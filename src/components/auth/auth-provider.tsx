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

const demoUser: UserProfile = {
  uid: "demo-user",
  name: "Deepak",
  email: "demo@wokai.local"
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

function toProfile(user: User): UserProfile {
  return {
    uid: user.uid,
    name: user.displayName ?? "WokAI User",
    email: user.email ?? "user@wokai.app",
    photoURL: user.photoURL ?? undefined
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserProfile | null>(demoUser);
  const auth = getFirebaseAuth();
  const firebaseConfigured = Boolean(auth);
  const [loading, setLoading] = React.useState(firebaseConfigured);

  React.useEffect(() => {
    if (!auth) return undefined;

    return onAuthStateChanged(auth, async (firebaseUser) => {
      const profile = firebaseUser ? toProfile(firebaseUser) : null;
      setUser(profile);
      if (profile) await saveUserProfile(profile);
      setLoading(false);
    });
  }, [auth]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      firebaseConfigured,
      loading,
      signIn: async () => {
        if (!auth) {
          setUser(demoUser);
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
        setUser(firebaseConfigured ? null : demoUser);
      }
    }),
    [auth, firebaseConfigured, loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
