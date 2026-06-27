"use client";

import React from "react";
import { Bot, Check, ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { getFirebaseAuth } from "@/lib/firebase/client";

const FEATURES = [
  "Schedules meetings through conversation",
  "Manages emails, tasks, and deadlines",
  "Acts before you ask, pauses when needed",
];

export function LoginCard() {
  const { signIn, firebaseConfigured, user, loginWithAccessKey } = useAuth();
  const router = useRouter();
  const [isDesktopSuccess, setIsDesktopSuccess] = React.useState(false);
  const [accessKey, setAccessKey] = React.useState("");
  const [pastedKey, setPastedKey] = React.useState("");

  const isElectron = typeof window !== "undefined" && window.navigator.userAgent.toLowerCase().indexOf("electron") > -1;

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("desktop") === "true") {
        sessionStorage.setItem("desktopFlow", "true");
        // If we are logged in with a real firebase account, show success screen
        if (user && user.uid !== "local-user") {
          setIsDesktopSuccess(true);
        }
      }
    }
  }, [user]);

  // Generate Access Key for browser to copy
  React.useEffect(() => {
    async function generateKey() {
      if (isDesktopSuccess && user && user.uid !== "local-user") {
        try {
          const auth = getFirebaseAuth();
          if (auth && auth.currentUser) {
            const firebaseToken = await auth.currentUser.getIdToken();
            const googleToken = localStorage.getItem("googleAccessToken") || "";
            const payload = JSON.stringify({ googleToken, firebaseToken, profile: user });
            const key = btoa(unescape(encodeURIComponent(payload)));
            setAccessKey(key);
          }
        } catch (e) {
          console.error("Failed to generate access key:", e);
        }
      }
    }
    generateKey();
  }, [isDesktopSuccess, user]);

  if (isDesktopSuccess) {
    return (
      <div className="relative w-full max-w-sm">
        {/* Glow orb behind card */}
        <div className="pointer-events-none absolute inset-0 -z-10 scale-150 rounded-full bg-[radial-gradient(ellipse_at_center,hsl(166_79%_40%/0.25),transparent_65%)]" />

        {/* Card */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-card/90 p-8 shadow-2xl backdrop-blur-sm text-center">
          {/* Subtle card inner glow */}
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(166_79%_40%/0.08),transparent_60%)]" />

          {/* Shield Check icon */}
          <div className="mb-6 flex justify-center">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_32px_hsl(166_79%_40%/0.3)]">
              <ShieldCheck size={40} className="text-emerald-400" />
            </div>
          </div>

          {/* Success Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Connected Successfully!
            </h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              If your desktop app did not log in automatically, copy the Access Key below and paste it in the desktop app:
            </p>
          </div>

          {accessKey && (
            <div className="space-y-2 text-left">
              <textarea
                readOnly
                value={accessKey}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                className="w-full h-24 p-2 text-[10px] font-mono bg-black/40 border border-border rounded resize-none select-all focus:outline-none"
              />
              <Button
                size="sm"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold"
                onClick={() => {
                  navigator.clipboard.writeText(accessKey);
                  alert("Access Key copied to clipboard!");
                }}
              >
                Copy Access Key
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm">
      {/* Glow orb behind card */}
      <div className="pointer-events-none absolute inset-0 -z-10 scale-150 rounded-full bg-[radial-gradient(ellipse_at_center,hsl(166_79%_40%/0.25),transparent_65%)]" />

      {/* Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/90 p-8 shadow-2xl backdrop-blur-sm">
        {/* Subtle card inner glow */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(166_79%_40%/0.08),transparent_60%)]" />

        {/* Bot icon */}
        <div className="mb-6 flex justify-center">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_32px_hsl(166_79%_40%/0.3)]">
            <Bot size={40} className="text-emerald-400" />
            {/* Pulsing ring */}
            <span className="absolute inset-0 animate-ping rounded-2xl border border-emerald-500/20" />
          </div>
        </div>

        {/* Title */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome to WokAI
          </h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Your AI work companion. Chat to schedule, email, browse, and rescue deadlines.
          </p>
        </div>

        {/* Feature list */}
        <ul className="mb-8 flex flex-col gap-2.5">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <Check size={11} strokeWidth={3} />
              </span>
              <span className="text-sm text-muted-foreground">{f}</span>
            </li>
          ))}
        </ul>

        {/* Sign-in button */}
        <Button
          className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white border-0 h-11 text-base font-semibold shadow-[0_0_20px_hsl(166_79%_40%/0.35)] hover:shadow-[0_0_28px_hsl(166_79%_40%/0.5)] transition-all"
          onClick={async () => {
            await signIn();
            router.push("/chat");
          }}
        >
          <ShieldCheck size={18} />
          Continue with Google
          <ArrowRight size={16} />
        </Button>

        {/* Electron Paste Fallback */}
        {isElectron && (
          <div className="mt-6 pt-6 border-t border-border/40 text-left animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Google Login blocked? Paste your Access Key here:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste Access Key..."
                value={pastedKey}
                onChange={(e) => setPastedKey(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-black/40 border border-border rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-foreground placeholder:text-muted-foreground/40 font-mono truncate"
              />
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold px-4"
                onClick={() => {
                  const success = loginWithAccessKey(pastedKey);
                  if (success) {
                    router.push("/chat");
                  } else {
                    alert("Invalid Access Key. Please try copying it again.");
                  }
                }}
              >
                Submit
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
