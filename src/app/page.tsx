"use client";

import React from "react";
import { 
  Bot, ShieldCheck, ArrowRight, Terminal, 
  Search, User, Menu, X, Sparkles, Command
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#fafafa] dark:bg-[#0c0c0c] overflow-x-hidden font-sans select-none">
      
      {/* ── LEFT SIDEBAR (Bright Crimson Red Panel) ── */}
      <div className="w-full md:w-[38%] bg-[#ff2a2a] text-white flex flex-col justify-between p-8 md:p-12 relative min-h-[60vh] md:min-h-screen overflow-hidden shadow-2xl">
        {/* Background Ambient Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

        {/* Top Logo Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between z-10"
        >
          <div className="flex items-center gap-2">
            <Command className="size-6 text-white animate-pulse" />
            <span className="font-extrabold text-xl tracking-wider uppercase font-sans">WOKAI OS</span>
          </div>
          <span className="text-xs uppercase tracking-widest text-white/70 border border-white/20 px-2 py-0.5 rounded">
            v2.0
          </span>
        </motion.div>

        {/* Quote Block in the Middle */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="my-auto space-y-6 z-10 max-w-sm"
        >
          <span className="text-8xl font-serif text-white/20 leading-none block h-8 select-none">“</span>
          <p className="text-xl md:text-2xl font-light leading-relaxed tracking-wide text-white/95">
            The ultimate AI-powered operating system companion that executes tasks in Gmail, Google Drive, Calendar, local files, terminal, and browser automation directly.
          </p>
          <div className="flex items-center gap-3">
            <span className="h-[2px] w-8 bg-white/40" />
            <span className="text-xs uppercase tracking-widest text-white/70">WOKAI OS Conductor</span>
          </div>
        </motion.div>

        {/* Bottom Section - Mini Mockup Card */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="relative z-10 flex items-end justify-between"
        >
          {/* Overlapping Mockup Card */}
          <div className="w-[180px] h-[120px] rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-black/45 backdrop-blur transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            <img 
              src="/terminal_mockup.jpg" 
              alt="Terminal Mockup" 
              className="w-full h-full object-cover opacity-80"
            />
          </div>

          {/* Vertical Writing Mode Text */}
          <div 
            className="text-[10px] tracking-[0.25em] text-white/50 uppercase font-mono font-bold"
            style={{ writingMode: "vertical-rl" }}
          >
            INTELLIGENT COMMAND // DIRECT ACTION
          </div>
        </motion.div>
      </div>

      {/* ── RIGHT MAIN PANEL (Minimal Light/Dark Area) ── */}
      <div className="w-full md:w-[62%] flex flex-col justify-between p-8 md:p-12 bg-white dark:bg-[#080808] text-zinc-900 dark:text-zinc-100 min-h-screen">
        
        {/* Header Navigation */}
        <motion.header 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between w-full border-b border-zinc-100 dark:border-zinc-900 pb-4"
        >
          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <Link href="/chat" className="hover:text-[#ff2a2a] transition-colors">Conductor</Link>
            <Link href="/tasks" className="hover:text-[#ff2a2a] transition-colors">Smart Tasks</Link>
            <Link href="/memory" className="hover:text-[#ff2a2a] transition-colors">Preferences</Link>
            <a href="https://github.com/deepakyadavdev/wokai_os" target="_blank" rel="noopener noreferrer" className="hover:text-[#ff2a2a] transition-colors">Developer</a>
          </nav>

          {/* Header Controls */}
          <div className="flex items-center gap-4 ml-auto">
            <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors" title="Search">
              <Search className="size-4" />
            </button>
            
            <Link href="/chat">
              <button className="flex items-center gap-2 px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                <User className="size-3.5" />
                <span>Enter Workspace</span>
              </button>
            </Link>
          </div>
        </motion.header>

        {/* Hero Section Container */}
        <div className="flex flex-col lg:flex-row items-center gap-12 my-auto w-full">
          
          {/* Left Column: Text & Content */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full lg:w-[55%] space-y-6 flex flex-col justify-center text-left"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 text-[#ff2a2a] rounded-full text-[11px] font-bold uppercase tracking-widest w-fit">
              <Sparkles className="size-3" />
              <span>Intent Resolution & Smart Inference</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] text-zinc-950 dark:text-white font-sans">
              The world is my <span className="text-[#ff2a2a]">runway.</span>
            </h1>

            <p className="text-zinc-650 dark:text-zinc-400 text-sm md:text-base font-light leading-relaxed max-w-md">
              Stop chatting. Start executing. WokAI OS is an autonomous companion that connects directly to your Google Workspace, local system, and browser automation APIs to get real work done instantly.
            </p>

            {/* Launch CTA */}
            <div className="pt-2">
              <Link href="/chat">
                <button className="group inline-flex items-center gap-3 bg-[#ff2a2a] text-white px-6 py-3.5 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg hover:shadow-xl hover:bg-red-600 transition-all duration-200">
                  <span>Launch WokAI Workspace</span>
                  <ArrowRight className="size-4 group-hover:translate-x-1.5 transition-transform" />
                </button>
              </Link>
            </div>
          </motion.div>

          {/* Right Column: Large Featured Portrait Card */}
          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="w-full lg:w-[45%] flex justify-center relative"
          >
            {/* Main Portrait Card */}
            <div className="w-[300px] h-[400px] sm:w-[320px] sm:h-[420px] rounded-3xl overflow-hidden relative shadow-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 group">
              {/* Overlay number */}
              <div className="absolute top-6 left-6 z-20 text-white font-mono text-5xl font-extrabold opacity-70">
                03
              </div>

              {/* Slider Metrics Overlay */}
              <div className="absolute top-1/2 left-6 z-20 flex flex-col gap-1.5 opacity-60">
                <span className="size-1 bg-white rounded-full" />
                <span className="size-1.5 bg-white rounded-full scale-125" />
                <span className="size-1 bg-white rounded-full" />
              </div>

              {/* Bottom Info Overlay */}
              <div className="absolute bottom-0 inset-x-0 p-6 z-20 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="text-white text-xs font-bold uppercase tracking-widest font-mono">
                    Conductor Flow
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-red-500 animate-ping" />
                    <span className="text-[10px] text-red-500 font-bold uppercase font-mono">Active</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-[2px] bg-white/20 rounded overflow-hidden">
                  <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: "75%" }}
                    transition={{ duration: 1.5, delay: 0.5 }}
                    className="h-full bg-red-500"
                  />
                </div>
              </div>

              {/* AI OS Interface image */}
              <img 
                src="/wokai_ui_mockup.jpg" 
                alt="WokAI System UI" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Accent colored line */}
            <div className="absolute -bottom-4 right-1/4 w-32 h-[3px] bg-red-500 rounded" />
          </motion.div>

        </div>

        {/* Footer / Social Columns */}
        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-900 pt-6 text-xs text-zinc-400 dark:text-zinc-500"
        >
          <div className="flex items-center gap-1 font-mono">
            <span>© {new Date().getFullYear()} WokAI. All rights reserved.</span>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900 dark:hover:text-white transition-colors" title="Twitter">
              <svg className="size-4 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900 dark:hover:text-white transition-colors" title="LinkedIn">
              <svg className="size-4 fill-current" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>
            <a href="https://github.com/deepakyadavdev/wokai_os" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900 dark:hover:text-white transition-colors" title="GitHub">
              <svg className="size-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          </div>
        </motion.footer>

      </div>

    </div>
  );
}
