"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Bot, BookOpen, Calendar, Mail, Zap } from "lucide-react";

import { cn } from "@/lib/utils";

interface WelcomeScreenProps {
  greeting: string;
  userName: string;
  onPromptSelect: (text: string) => void;
}

const PROMPT_CARDS = [
  {
    id: "chemistry",
    icon: BookOpen,
    label: "My chemistry assignment is due tomorrow",
    description: "Rescue plan · deadline tracking",
    color: "from-amber-500/10 to-orange-500/5 border-amber-500/20 hover:border-amber-400/40"
  },
  {
    id: "meeting",
    icon: Calendar,
    label: "Schedule a meeting with Rahul tomorrow",
    description: "Calendar · contacts · reminder",
    color: "from-violet-500/10 to-purple-500/5 border-violet-500/20 hover:border-violet-400/40"
  },
  {
    id: "internship",
    icon: Zap,
    label: "Apply for internship, pause before submit",
    description: "Browser agent · approval gate",
    color: "from-blue-500/10 to-cyan-500/5 border-blue-500/20 hover:border-blue-400/40"
  },
  {
    id: "emails",
    icon: Mail,
    label: "Check urgent emails and draft replies",
    description: "Gmail · smart drafts",
    color: "from-emerald-500/10 to-teal-500/5 border-emerald-500/20 hover:border-emerald-400/40"
  }
];

export function WelcomeScreen({ greeting, userName, onPromptSelect }: WelcomeScreenProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      {/* Animated bot icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "backOut" }}
        className="relative mb-6"
      >
        <div
          className={cn(
            "flex size-20 items-center justify-center rounded-2xl",
            "bg-gradient-to-br from-emerald-500/30 to-teal-600/20",
            "border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.2)]"
          )}
        >
          <Bot className="size-10 text-emerald-400" />
        </div>
        {/* Pulsing ring */}
        <motion.div
          className="absolute inset-0 rounded-2xl border border-emerald-400/30"
          animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.18, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="mb-1 text-center"
      >
        <h1 className="text-2xl font-semibold tracking-tight">
          Good {greeting},{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            {userName}
          </span>
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">What shall we accomplish today?</p>
      </motion.div>

      {/* Prompt cards grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.4 }}
        className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {PROMPT_CARDS.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.button
              key={card.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.07, duration: 0.35 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onPromptSelect(card.label)}
              className={cn(
                "flex items-start gap-3 rounded-xl border bg-gradient-to-br p-4 text-left",
                "transition-all duration-200",
                card.color
              )}
            >
              <span className="mt-0.5 rounded-lg bg-background/60 p-1.5">
                <Icon className="size-4 text-foreground/80" />
              </span>
              <div>
                <p className="text-sm font-medium leading-snug text-foreground">{card.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{card.description}</p>
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
