"use client";

import { Bot, Check, ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";

const FEATURES = [
  "Schedules meetings through conversation",
  "Manages emails, tasks, and deadlines",
  "Acts before you ask, pauses when needed",
];

export function LoginCard() {
  const { signIn, firebaseConfigured } = useAuth();
  const router = useRouter();

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
      </div>
    </div>
  );
}
