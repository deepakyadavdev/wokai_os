"use client";

import React, { useState } from "react";
import { 
  Bot, ShieldCheck, ArrowRight, Terminal, Search, User, Menu, X, Sparkles, 
  Command, Code, Play, CheckCircle2, ChevronRight, Cpu, Layers, HardDrive, 
  Calendar, Mail, Globe, ExternalLink
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Calculate offset relative to center (-0.5 to 0.5)
    const xVal = (clientX / width) - 0.5;
    const yVal = (clientY / height) - 0.5;
    
    // Tilt limit: max 12 degrees
    setTilt({
      x: xVal * 12,
      y: yVal * -12,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-zinc-100 font-sans selection:bg-[#ff2a2a]/30 selection:text-white overflow-x-hidden scroll-smooth">
      
      {/* ── FIXED TRANSPARENT NAVBAR ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-black/45 backdrop-blur-md border-b border-zinc-900/60 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Command className="size-5 text-[#ff2a2a] animate-pulse" />
            <span className="font-extrabold text-lg tracking-wider uppercase font-sans">WOKAI OS</span>
          </div>

          {/* Desktop Nav links */}
          <div className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-zinc-400">
            <a href="#hero" className="hover:text-[#ff2a2a] transition-colors">Hero</a>
            <a href="#story" className="hover:text-[#ff2a2a] transition-colors">Story</a>
            <a href="#conductor" className="hover:text-[#ff2a2a] transition-colors">Conductor</a>
            <a href="#integrations" className="hover:text-[#ff2a2a] transition-colors">Capabilities</a>
          </div>

          {/* Enter Workspace Button */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/chat">
              <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-[#ff2a2a] hover:from-red-500 hover:to-red-500 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-200 shadow-lg shadow-red-500/20">
                <User className="size-3.5" />
                <span>Enter Workspace</span>
              </button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
          >
            {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="fixed top-20 inset-x-0 z-40 bg-[#060b18] border-b border-zinc-900 px-6 py-8 flex flex-col gap-6 md:hidden"
          >
            <a href="#hero" onClick={() => setMobileMenuOpen(false)} className="text-zinc-300 hover:text-white text-sm font-semibold tracking-wider uppercase">Hero</a>
            <a href="#story" onClick={() => setMobileMenuOpen(false)} className="text-zinc-300 hover:text-white text-sm font-semibold tracking-wider uppercase">Story</a>
            <a href="#conductor" onClick={() => setMobileMenuOpen(false)} className="text-zinc-300 hover:text-white text-sm font-semibold tracking-wider uppercase">Conductor</a>
            <a href="#integrations" onClick={() => setMobileMenuOpen(false)} className="text-zinc-300 hover:text-white text-sm font-semibold tracking-wider uppercase">Capabilities</a>
            <div className="h-[1px] bg-zinc-800 w-full" />
            <Link href="/chat" onClick={() => setMobileMenuOpen(false)}>
              <button className="w-full flex items-center justify-center gap-2 py-3 bg-[#ff2a2a] rounded-full text-xs font-bold uppercase tracking-widest">
                <User className="size-4" />
                <span>Enter Workspace</span>
              </button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SECTION 1: HERO (Glowing green blueprint diagram in background, text on left) ── */}
      <section 
        id="hero" 
        className="min-h-screen pt-28 flex items-center relative overflow-hidden bg-gradient-to-b from-[#030712] via-[#050a16] to-[#040813]"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={() => setIsHovered(true)}
      >
        
        {/* Giant Background Blueprint SVG (Large scale bleeding to the right & behind text) */}
        <div 
          className="absolute -right-32 sm:-right-48 lg:-right-64 top-1/2 w-[700px] h-[700px] sm:w-[900px] sm:h-[900px] lg:w-[1200px] lg:h-[1200px] pointer-events-none select-none z-0"
          style={{
            transform: `translateY(-50%) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
            transformStyle: "preserve-3d",
            perspective: 1000,
            transition: "transform 0.15s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease",
            opacity: isHovered ? 0.45 : 0.32,
          }}
        >
          <svg 
            viewBox="0 0 500 500" 
            className="w-full h-full text-emerald-500/60 stroke-current fill-none stroke-[0.6] drop-shadow-[0_0_15px_rgba(16,185,129,0.12)]"
          >
            {/* Outermost Static Radar Rings & Scale Ticks */}
            <circle cx="250" cy="250" r="246" />
            <circle cx="250" cy="250" r="242" strokeDasharray="1.5, 4.5" />
            <circle cx="250" cy="250" r="236" strokeDasharray="8, 16" />
            <circle cx="250" cy="250" r="232" />
            
            {/* Fine Concentric Pitch Ticks */}
            <circle cx="250" cy="250" r="226" strokeDasharray="4, 12" className="opacity-40" />
            <circle cx="250" cy="250" r="220" />
            <circle cx="250" cy="250" r="214" strokeDasharray="30, 8, 12, 8" className="opacity-50" />

            {/* Static Grid Intersects */}
            <path d="M 250 4 L 250 496 M 4 250 L 496 250" strokeDasharray="6, 12" className="opacity-30" />
            <path d="M 76 76 L 424 424 M 76 424 L 424 76" strokeDasharray="4, 16" className="opacity-20" />

            {/* ── LAYER A: Outer Slow Rotating System ── */}
            <g 
              className="animate-[spin_160s_linear_infinite]"
              style={{ animationDuration: isHovered ? "40s" : "160s", transition: "animation-duration 0.8s ease" }}
            >
              {/* Radial Spokes with outer node points */}
              <line x1="250" y1="250" x2="250" y2="12" /> <circle cx="250" cy="12" r="2" fill="currentColor" />
              <line x1="250" y1="250" x2="250" y2="488" /> <circle cx="250" cy="488" r="2" fill="currentColor" />
              <line x1="250" y1="250" x2="12" y2="250" /> <circle cx="12" cy="250" r="2" fill="currentColor" />
              <line x1="250" y1="250" x2="488" y2="250" /> <circle cx="488" cy="250" r="2" fill="currentColor" />
              
              <line x1="250" y1="250" x2="456" y2="369" /> <circle cx="456" cy="369" r="2" fill="currentColor" />
              <line x1="250" y1="250" x2="369" y2="456" /> <circle cx="369" cy="456" r="2" fill="currentColor" />
              <line x1="250" y1="250" x2="131" y2="456" /> <circle cx="131" cy="456" r="2" fill="currentColor" />
              <line x1="250" y1="250" x2="44" y2="369" /> <circle cx="44" cy="369" r="2" fill="currentColor" />
              <line x1="250" y1="250" x2="44" y2="131" /> <circle cx="44" cy="131" r="2" fill="currentColor" />
              <line x1="250" y1="250" x2="131" y2="44" /> <circle cx="131" cy="44" r="2" fill="currentColor" />
              <line x1="250" y1="250" x2="369" y2="44" /> <circle cx="369" cy="44" r="2" fill="currentColor" />
              <line x1="250" y1="250" x2="456" y2="131" /> <circle cx="456" cy="131" r="2" fill="currentColor" />

              {/* Sub-scale ticks & degrees values */}
              <circle cx="250" cy="250" r="200" strokeDasharray="3, 7" />
              <circle cx="250" cy="250" r="185" strokeDasharray="60, 20" />
            </g>

            {/* ── LAYER B: Reverse Circuit Track System ── */}
            <g 
              className="animate-[spin_90s_linear_infinite_reverse] opacity-80"
              style={{ animationDuration: isHovered ? "20s" : "90s", transition: "animation-duration 0.8s ease" }}
            >
              {/* Arc Tracks & Guideways */}
              <path d="M 250 50 A 200 200 0 0 1 450 250" strokeWidth="1.5" strokeDasharray="140, 10, 40, 10" />
              <path d="M 250 450 A 200 200 0 0 1 50 250" strokeWidth="1.5" strokeDasharray="140, 10, 40, 10" />
              
              {/* Outer Data Nodes */}
              <circle cx="450" cy="250" r="4.5" fill="currentColor" className="animate-pulse" />
              <circle cx="50" cy="250" r="4.5" fill="currentColor" className="animate-pulse" />
              
              {/* Orbiting Tech Rings */}
              <circle cx="250" cy="250" r="172" strokeDasharray="100, 30, 10, 30" />
              <circle cx="250" cy="250" r="162" strokeDasharray="6, 12" />
            </g>

            {/* ── LAYER C: Inner Fast Gear System ── */}
            <g 
              className="animate-[spin_45s_linear_infinite]"
              style={{ animationDuration: isHovered ? "10s" : "45s", transition: "animation-duration 0.8s ease" }}
            >
              {/* Gear style ticks */}
              <circle cx="250" cy="250" r="144" strokeDasharray="4, 8" strokeWidth="2.5" />
              <circle cx="250" cy="250" r="132" strokeDasharray="40, 5" />
              
              {/* Tech writing inside layout */}
              <text x="250" y="125" className="text-[7px] font-mono fill-emerald-500/90 font-bold text-center tracking-widest" textAnchor="middle">WOKAI OS v2.0</text>
              <text x="250" y="380" className="text-[7px] font-mono fill-emerald-500/90 font-bold text-center tracking-widest" textAnchor="middle">CONDUCTOR ENGINE</text>
              
              <circle cx="250" cy="250" r="118" strokeDasharray="20, 20" />
              <path d="M 250 140 A 110 110 0 0 1 360 250 L 340 250 A 90 90 0 0 0 250 160 Z" className="opacity-25 fill-current" />
              <path d="M 250 360 A 110 110 0 0 1 140 250 L 160 250 A 90 90 0 0 0 250 340 Z" className="opacity-25 fill-current" />
            </g>

            {/* ── LAYER D: Center Targeting Crosshair System ── */}
            <g 
              className="animate-[spin_25s_linear_infinite_reverse]"
              style={{ animationDuration: isHovered ? "6s" : "25s", transition: "animation-duration 0.8s ease" }}
            >
              <circle cx="250" cy="250" r="88" strokeDasharray="12, 12" />
              <circle cx="250" cy="250" r="72" strokeWidth="1.2" />
              <circle cx="250" cy="250" r="54" strokeDasharray="8, 4" />
              <circle cx="250" cy="250" r="36" />
              
              {/* Center Crosshairs */}
              <path d="M 250 200 L 250 300 M 200 250 L 300 250" strokeWidth="1.5" />
            </g>

            {/* Center Core Node */}
            <circle cx="250" cy="250" r="16" className="fill-[#030712] stroke-emerald-400 stroke-[1.5]" />
            <polygon points="250,240 260,250 250,260 240,250" className="fill-emerald-400 animate-pulse" />
          </svg>
        </div>

        {/* Text Grid Container */}
        <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Left Text Box */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-8 xl:col-span-7 space-y-8 text-left z-10 relative"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[11px] font-bold uppercase tracking-widest">
              <Sparkles className="size-3" />
              <span>Direct execution companion</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[70px] font-extrabold leading-[1.05] tracking-tight text-white font-sans">
              Execute, test,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-[#ff2a2a] animate-pulse">innovate, repeat.</span>
            </h1>

            <p className="text-zinc-400 text-sm sm:text-base font-light leading-relaxed max-w-lg">
              The future of workspace operation is here. WokAI OS is an autonomous companion that translates natural language statements into precise API commands across Gmail, Drive, Calendar, local devices, and automated Playwright browser workflows.
            </p>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link href="/chat">
                <button className="group inline-flex items-center gap-3 bg-white text-zinc-950 px-7 py-4 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg hover:shadow-xl hover:bg-zinc-200 transition-all duration-200">
                  <span>Explore Conductor</span>
                  <ArrowRight className="size-4 text-zinc-950 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <a href="#conductor">
                <button className="inline-flex items-center gap-2 border border-zinc-800 hover:border-zinc-700 px-6 py-4 rounded-full text-xs font-bold uppercase tracking-widest transition-colors">
                  <span>Tour our System</span>
                </button>
              </a>
            </div>
          </motion.div>

          {/* Spacer right column to balance grid */}
          <div className="hidden lg:block lg:col-span-4" />

        </div>
      </section>

      {/* ── SECTION 2: THE STORYTELLING (Chatbots vs Actionable AI) ── */}
      <section id="story" className="py-24 bg-[#050a16] border-y border-zinc-900/60 relative overflow-hidden">
        <div className="absolute left-1/4 top-1/3 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
            <div className="inline-block text-[#ff2a2a] text-xs font-bold uppercase tracking-widest">
              The Evolution of Work
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight text-white">
              Chatbots Talk.<br />WokAI OS <span className="text-[#ff2a2a]">Executes.</span>
            </h2>
            <p className="text-zinc-400 font-light text-sm sm:text-base leading-relaxed">
              Standard AI chatbots wait for you to write, copy, paste, and type again. WokAI OS is designed differently: it resolves what you want and triggers the OS APIs directly, bridging the gap between reasoning and action.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Story Card: The Chatbot Loop (Problem) */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="p-8 md:p-10 rounded-3xl bg-zinc-950/80 border border-zinc-900 flex flex-col justify-between min-h-[350px] relative group"
            >
              <div className="space-y-4">
                <span className="size-10 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-400 group-hover:text-red-500 transition-colors">
                  <X className="size-5" />
                </span>
                <h3 className="text-xl font-bold text-white">The Obsolete Conversational Loop</h3>
                <p className="text-zinc-400 text-sm font-light leading-relaxed">
                  Traditional chatbot workflows create friction. When you ask them to draft an email or check calendar slot availability, they produce prose. They can't access APIs, requiring you to manually execute the work yourself.
                </p>
              </div>
              <div className="mt-8 border-t border-zinc-900 pt-6 flex items-center justify-between text-xs text-zinc-500 font-mono">
                <span>STAGE 01 — THE CHATBOT FATIGUE</span>
                <span className="text-red-500 font-bold uppercase">REJECTED</span>
              </div>
            </motion.div>

            {/* Story Card: Actionable Companion (Solution) */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="p-8 md:p-10 rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-950 to-red-950/20 border border-red-500/20 flex flex-col justify-between min-h-[350px] relative group"
            >
              {/* Highlight badge */}
              <div className="absolute top-6 right-6 px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-[9px] font-bold uppercase tracking-widest">
                VERIFIED FLOW
              </div>

              <div className="space-y-4">
                <span className="size-10 bg-[#ff2a2a]/10 rounded-full flex items-center justify-center text-[#ff2a2a] group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="size-5" />
                </span>
                <h3 className="text-xl font-bold text-white">Autonomous Direct OS Control</h3>
                <p className="text-zinc-300 text-sm font-light leading-relaxed">
                  WokAI OS bypasses manual intervention. It drafts plans, registers target endpoints (like Gmail, Drive, or Web automation selectors), runs validation audits with Agent 5, and executes. You get direct links to created docs, calendar invites, and scraped datasets instantly.
                </p>
              </div>
              <div className="mt-8 border-t border-zinc-900 pt-6 flex items-center justify-between text-xs text-zinc-500 font-mono">
                <span>STAGE 02 — WOKAI OPERATING SYSTEM</span>
                <span className="text-[#ff2a2a] font-bold uppercase">ACTIVE</span>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── SECTION 3: CONDUCTOR ARCHITECTURE (Agent A to Agent 5 Flow) ── */}
      <section id="conductor" className="py-24 bg-[#030712] relative overflow-hidden">
        <div className="absolute right-1/4 top-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          
          <div className="max-w-3xl space-y-4 mb-20 text-left">
            <div className="inline-block text-emerald-400 text-xs font-bold uppercase tracking-widest">
              Multi-Agent Orchestration
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              The Agent Conductor Flow
            </h2>
            <p className="text-zinc-400 font-light text-sm sm:text-base leading-relaxed">
              Every request you issue flows through an structured, deterministic assembly line of specialized subagents, ending at direct validation check by Agent 5.
            </p>
          </div>

          {/* Visual Conductor Path */}
          <div className="relative">
            {/* Path Connection Line */}
            <div className="absolute top-1/2 inset-x-8 h-[2px] bg-gradient-to-r from-emerald-500/20 via-red-500/20 to-emerald-500/20 -translate-y-1/2 hidden lg:block" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
              
              {/* Agent A & B */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="p-6 rounded-2xl bg-zinc-950/70 border border-zinc-900 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold tracking-widest">01 / RESOLUTION</span>
                  <Cpu className="size-4 text-emerald-400" />
                </div>
                <h4 className="text-lg font-bold text-white">Agent A & B</h4>
                <p className="text-zinc-450 text-xs leading-relaxed font-light">
                  Deciphers the target user intent, checks for missing execution elements, and maps goals directly to relevant tools.
                </p>
              </motion.div>

              {/* Agent 1 & 2 */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="p-6 rounded-2xl bg-zinc-950/70 border border-zinc-900 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-red-400 font-bold tracking-widest">02 / PLAN SYNTHESIS</span>
                  <Layers className="size-4 text-[#ff2a2a]" />
                </div>
                <h4 className="text-lg font-bold text-white">Agent 1 & 2</h4>
                <p className="text-zinc-450 text-xs leading-relaxed font-light">
                  Generates the client-facing plan description and serializes the execution actions into concrete JSON execution blocks.
                </p>
              </motion.div>

              {/* Agent 3 & 4 */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="p-6 rounded-2xl bg-zinc-950/70 border border-zinc-900 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold tracking-widest">03 / PARAMETER BINDING</span>
                  <Code className="size-4 text-emerald-400" />
                </div>
                <h4 className="text-lg font-bold text-white">Agent 3 & 4</h4>
                <p className="text-zinc-450 text-xs leading-relaxed font-light">
                  Generates the detailed payload contents (e.g. email body texts, scraper selectors, spreadsheets structures) and binds variables.
                </p>
              </motion.div>

              {/* Agent 5 (QA) */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="p-6 rounded-2xl bg-gradient-to-br from-zinc-950 to-red-950/30 border border-red-500/30 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-red-500 font-bold tracking-widest">04 / QA AUDITING</span>
                  <ShieldCheck className="size-4 text-red-500" />
                </div>
                <h4 className="text-lg font-bold text-white">Agent 5 (Evaluator)</h4>
                <p className="text-zinc-300 text-xs leading-relaxed font-light">
                  Validates safety criteria. Audits for execution gap fabrication (invented emails, arbitrary times), giving clear bypass to content generation tasks.
                </p>
              </motion.div>

            </div>
          </div>

        </div>
      </section>

      {/* ── SECTION 4: CAPABILITIES / INTEGRATIONS ── */}
      <section id="integrations" className="py-24 bg-[#050a16] border-t border-zinc-900/60 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,42,42,0.02),transparent_60%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
            <div className="inline-block text-[#ff2a2a] text-xs font-bold uppercase tracking-widest">
              Built-in Integrations
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              One Workspace. Infinite Tools.
            </h2>
            <p className="text-zinc-400 font-light text-sm sm:text-base leading-relaxed">
              Connect WokAI OS directly to your developer and business toolchains for uncompromised local and cloud task automation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Gmail integration card */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="p-8 rounded-3xl bg-zinc-950/60 border border-zinc-900 space-y-6"
            >
              <div className="size-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-[#ff2a2a]">
                <Mail className="size-6" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-bold text-white">Gmail Integration</h4>
                <p className="text-zinc-400 text-xs font-light leading-relaxed">
                  Search, filter, categorize, and summarize threads. Compose and queue emails with fully resolved parameters directly.
                </p>
              </div>
            </motion.div>

            {/* Google Calendar card */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="p-8 rounded-3xl bg-zinc-950/60 border border-zinc-900 space-y-6"
            >
              <div className="size-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400">
                <Calendar className="size-6" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-bold text-white">Google Calendar</h4>
                <p className="text-zinc-400 text-xs font-light leading-relaxed">
                  Fetch user schedules, verify timeline slot conflicts, book events, and invite internal or external stakeholders.
                </p>
              </div>
            </motion.div>

            {/* Playwright Browser card */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="p-8 rounded-3xl bg-zinc-950/60 border border-zinc-900 space-y-6"
            >
              <div className="size-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400">
                <Globe className="size-6" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-bold text-white">Playwright Automation</h4>
                <p className="text-zinc-450 text-xs font-light leading-relaxed">
                  Execute headless browser operations, plan selectors paths, scrape competitor prices, click elements, and export CSV tables.
                </p>
              </div>
            </motion.div>

            {/* Terminal card */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="p-8 rounded-3xl bg-zinc-950/60 border border-zinc-900 space-y-6"
            >
              <div className="size-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400">
                <Terminal className="size-6" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-bold text-white">Terminal Command Line</h4>
                <p className="text-zinc-450 text-xs font-light leading-relaxed">
                  Propose terminal commands safely in approval-gated shell containers. Execute script, file operations, or dev server setups.
                </p>
              </div>
            </motion.div>

            {/* Drive indexing card */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="p-8 rounded-3xl bg-zinc-950/60 border border-zinc-900 space-y-6"
            >
              <div className="size-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400">
                <HardDrive className="size-6" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-bold text-white">Google Drive</h4>
                <p className="text-zinc-450 text-xs font-light leading-relaxed">
                  List storage contents, search matching files, export documents directly, and write/organize folders from WokAI.
                </p>
              </div>
            </motion.div>

            {/* Smart Memory preference card */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="p-8 rounded-3xl bg-zinc-950/60 border border-zinc-900 space-y-6"
            >
              <div className="size-12 bg-pink-500/10 rounded-2xl flex items-center justify-center text-pink-400">
                <Layers className="size-6" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-bold text-white">Smart Memory Store</h4>
                <p className="text-zinc-450 text-xs font-light leading-relaxed">
                  Extracts habits, routines, relationships, and user preference profiles automatically to optimize execution style.
                </p>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── SECTION 5: CALL TO ACTION / FOOTER ── */}
      <section className="py-28 bg-gradient-to-t from-black via-[#040814] to-[#050a16] text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[#ff2a2a]/5 animate-pulse pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 relative z-10 space-y-8">
          <h2 className="text-4xl md:text-6xl font-extrabold text-white leading-tight">
            Ready to experience<br />the next generation of OS automation?
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base font-light max-w-lg mx-auto leading-relaxed">
            Enter the WokAI Workspace today. Execute tasks, manage background automation tasks, and interact with the Multi-Agent Conductor instantly.
          </p>
          <div>
            <Link href="/chat">
              <button className="group inline-flex items-center gap-3 bg-white text-zinc-950 px-8 py-4.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-xl hover:bg-zinc-200 transition-all duration-200">
                <span>Enter Workspace</span>
                <ArrowRight className="size-4 group-hover:translate-x-1.5 transition-transform" />
              </button>
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 border-t border-zinc-900 mt-28 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
          <div className="flex items-center gap-1.5 font-mono">
            <span>© {new Date().getFullYear()} WokAI OS. All rights reserved.</span>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-5">
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" title="Twitter">
              <svg className="size-4 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" title="LinkedIn">
              <svg className="size-4 fill-current" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>
            <a href="https://github.com/deepakyadavdev/wokai_os" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" title="GitHub">
              <svg className="size-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
